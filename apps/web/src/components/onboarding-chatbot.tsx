"use client";

import * as React from "react";
import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "@/app/auth/session-provider";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageBubble,
  MessageError,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { Check, Pencil, Sparkles, X } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type CollectedData = {
  teamMode: "solo" | "team" | null;
  profilePath: "linkedin" | "upwork" | "cv" | "portfolio" | "manual" | null;
  linkedinUrl: string | null;
  upworkUrl: string | null;
  portfolioUrl: string | null;
  experienceLevel:
    | "intern_new_grad"
    | "entry"
    | "mid"
    | "senior"
    | "lead"
    | "director"
    | null;
  skills: { name: string }[] | null;
  experiences:
    | {
        title: string;
        company: string | null;
        startDate: string | null;
        endDate: string | null;
        highlights: string | null;
      }[]
    | null;
  educations:
    | {
        school: string;
        degree: string | null;
        field: string | null;
        startYear: string | null;
        endYear: string | null;
      }[]
    | null;
  hourlyMin: number | null;
  hourlyMax: number | null;
  fixedBudgetMin: number | null;
  currency: "USD" | "EUR" | "GBP" | "CAD" | "AUD" | null;
  preferredProjectLengthMin: number | null;
  preferredProjectLengthMax: number | null;
  timeZones: string[] | null;
  engagementTypes: ("full_time" | "part_time" | "internship")[] | null;
  remoteOnly: boolean | null;
};

const initialCollectedData: CollectedData = {
  teamMode: null,
  profilePath: null,
  linkedinUrl: null,
  upworkUrl: null,
  portfolioUrl: null,
  experienceLevel: null,
  skills: null,
  experiences: null,
  educations: null,
  hourlyMin: null,
  hourlyMax: null,
  fixedBudgetMin: null,
  currency: null,
  preferredProjectLengthMin: null,
  preferredProjectLengthMax: null,
  timeZones: null,
  engagementTypes: null,
  remoteOnly: null,
};

// ============================================================================
// Helpers
// ============================================================================

function generateId() {
  return Math.random().toString(36).slice(2);
}

// Transform collected data to the format expected by the onboarding API
function transformToOnboardingPayload(data: CollectedData) {
  return {
    team: {
      mode: data.teamMode,
    },
    path: data.profilePath,
    profileSetup: {
      linkedinUrl: data.linkedinUrl ?? "",
      upworkUrl: data.upworkUrl ?? "",
      portfolioUrl: data.portfolioUrl ?? "",
    },
    experienceLevel: data.experienceLevel,
    skills: data.skills?.map((s) => ({ name: s.name, level: 3, years: null })),
    experiences: data.experiences?.map((e) => ({
      title: e.title,
      company: e.company,
      startDate: e.startDate,
      endDate: e.endDate,
      highlights: e.highlights,
    })),
    educations: data.educations?.map((e) => ({
      school: e.school,
      degree: e.degree,
      field: e.field,
      startYear: e.startYear ? parseInt(e.startYear) : null,
      endYear: e.endYear ? parseInt(e.endYear) : null,
    })),
    preferences: {
      currency: data.currency ?? "USD",
      hourlyMin: data.hourlyMin,
      hourlyMax: data.hourlyMax,
      fixedBudgetMin: data.fixedBudgetMin,
      timeZones: data.timeZones ?? [],
      remoteOnly: data.remoteOnly ?? true,
      preferredProjectLengthDays:
        data.preferredProjectLengthMin && data.preferredProjectLengthMax
          ? ([data.preferredProjectLengthMin, data.preferredProjectLengthMax] as [
              number,
              number
            ])
          : [7, 30],
      engagementTypes: data.engagementTypes ?? [],
      tightness: 3,
    },
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function OnboardingChatbot() {
  const router = useRouter();
  const { session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const avatarUrlFromSession =
    (session?.user?.user_metadata?.avatar_url as string | undefined) ??
    (session?.user?.user_metadata?.picture as string | undefined) ??
    null;
  const userNameFromSession =
    (session?.user?.user_metadata?.full_name as string | undefined) ??
    (session?.user?.user_metadata?.name as string | undefined) ??
    (session?.user?.user_metadata?.display_name as string | undefined) ??
    null;
  const emailFromSession = session?.user?.email ?? null;
  const avatarAlt = userNameFromSession ?? emailFromSession ?? "";
  const avatarFallback = React.useMemo(() => {
    const base = (userNameFromSession ?? emailFromSession ?? "").trim();
    if (!base) return "?";
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [emailFromSession, userNameFromSession]);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Onboarding state
  const [collectedData, setCollectedData] =
    useState<CollectedData>(initialCollectedData);
  const [hasStarted, setHasStarted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Load progress on mount
  useEffect(() => {
    async function loadProgress() {
      if (!session?.access_token) return;

      try {
        const response = await fetch("/api/v1/onboarding/progress", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.onboardingProgress) {
            const { messages: savedMessages, collectedData: savedData, hasStarted: savedHasStarted } = data.onboardingProgress;
            if (savedMessages) setMessages(savedMessages);
            if (savedData) setCollectedData(savedData);
            if (savedHasStarted) setHasStarted(savedHasStarted);
          }
        }
      } catch (err) {
        console.error("Failed to load progress:", err);
      } finally {
        setIsRestoring(false);
      }
    }

    loadProgress();
  }, [session?.access_token]);

  useEffect(() => {
    if (!editingMessageId) return;
    editTextareaRef.current?.focus();
    editTextareaRef.current?.setSelectionRange(
      editTextareaRef.current.value.length,
      editTextareaRef.current.value.length
    );
  }, [editingMessageId]);

  // Save progress
  const saveProgress = useCallback(async (
    newMessages: ChatMessage[], 
    newData: CollectedData,
    started: boolean
  ) => {
    if (!session?.access_token) return;

    try {
      await fetch("/api/v1/onboarding/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          collectedData: newData,
          hasStarted: started,
        }),
      });
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  }, [session?.access_token]);

  // Start the conversation when user sends first message or clicks start
  const startConversation = useCallback(async () => {
    const newHasStarted = true;
    setHasStarted(newHasStarted);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Hi, I'm ready to set up my profile!",
          conversationHistory: [],
          collectedData: initialCollectedData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start conversation");
      }

      const data = await response.json();

      const newMessages: ChatMessage[] = [
        {
          id: generateId(),
          role: "assistant",
          content: data.message,
        },
      ];
      setMessages(newMessages);

      let newData = collectedData;
      if (data.collectedData) {
        newData = data.collectedData;
        setCollectedData(newData);
      }

      // Save progress
      saveProgress(newMessages, newData, newHasStarted);

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start conversation"
      );
    } finally {
      setIsLoading(false);
    }
  }, [collectedData, saveProgress]);

  // Send a message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text.trim(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);
      setError(null);

      // Optimistic save
      saveProgress(updatedMessages, collectedData, hasStarted);

      try {
        const conversationHistory = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch("/api/v1/onboarding/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            conversationHistory,
            collectedData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error?.message || "Failed to send message");
        }

        const data = await response.json();

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: data.message,
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);

        let finalData = collectedData;
        if (data.collectedData) {
          finalData = data.collectedData;
          setCollectedData(finalData);
        }

        if (data.isComplete) {
          setIsComplete(true);
        }

        // Final save for this turn
        saveProgress(finalMessages, finalData, hasStarted);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, collectedData, isLoading, hasStarted, saveProgress]
  );

  const beginEditMessage = useCallback((message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingText(message.content);
  }, []);

  const cancelEditMessage = useCallback(() => {
    setEditingMessageId(null);
    setEditingText("");
  }, []);

  const saveEditedMessage = useCallback(async () => {
    if (!editingMessageId) return;
    if (!session?.access_token) return;
    if (isLoading || isSaving) return;

    const trimmed = editingText.trim();
    if (!trimmed) return;

    const editedIndex = messages.findIndex((m) => m.id === editingMessageId);
    if (editedIndex === -1) return;

    const original = messages[editedIndex];
    if (original.role !== "user") return;

    const historyBefore = messages.slice(0, editedIndex);
    const updatedUserMessage: ChatMessage = {
      ...original,
      content: trimmed,
    };

    const conversationHistory = historyBefore.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory,
          collectedData: initialCollectedData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || "Failed to update message");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: data.message,
      };

      const nextMessages = [...historyBefore, updatedUserMessage, assistantMessage];
      setMessages(nextMessages);

      const nextCollectedData: CollectedData = data.collectedData ?? initialCollectedData;
      setCollectedData(nextCollectedData);
      setIsComplete(Boolean(data.isComplete));

      setEditingMessageId(null);
      setEditingText("");

      saveProgress(nextMessages, nextCollectedData, hasStarted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update message");
    } finally {
      setIsLoading(false);
    }
  }, [
    editingMessageId,
    editingText,
    hasStarted,
    isLoading,
    isSaving,
    messages,
    saveProgress,
    session?.access_token,
  ]);

  // Handle form submission
  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!hasStarted) {
        return;
      }

      if (message.text) {
        sendMessage(message.text);
      }
    },
    [hasStarted, sendMessage]
  );

  // Save onboarding data
  const saveOnboarding = useCallback(async () => {
    if (!session?.access_token) {
      setError("Not authenticated");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = transformToOnboardingPayload(collectedData);

      const response = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || "Failed to save onboarding"
        );
      }

      // We might want to clear the progress here, or let the backend do it.
      // For now, we just redirect.
      // Since we are likely ON /overview, we might just reload or update state.
      // But let's stick to router.replace("/overview") to trigger re-checks.
      
      // If we are already on overview, we might need to force a refresh or state update.
      window.location.href = "/overview";
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [collectedData, session?.access_token]);

  // Skip onboarding
  const handleSkip = useCallback(() => {
    router.replace("/overview");
  }, [router]);

  // Focus textarea when started
  useEffect(() => {
    if (hasStarted && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [hasStarted, isLoading]);

  if (isRestoring) {
     return (
        <div className="flex h-full w-full items-center justify-center">
             <div className="flex items-center gap-2 text-muted-foreground">
                <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Loading your session...</span>
             </div>
        </div>
     )
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex h-full w-full flex-col p-6">
      <AnimatePresence mode="wait">
        {!hasStarted ? (
          // Welcome state - centered input
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 flex-col items-center justify-center gap-8 p-6"
          >
            <div className="text-center">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-4">
                <Sparkles className="size-8 text-primary" />
              </div>
              <h1 className="mb-2 text-2xl font-bold tracking-tight">
                Welcome to HireMePlz
              </h1>
              <p className="max-w-md text-muted-foreground">
                Let&apos;s set up your profile through a quick chat. I&apos;ll
                ask you a few questions to understand your preferences.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="gap-2 px-8 py-6 text-base shadow-sm"
                onClick={startConversation}
                disabled={isLoading}
              >
                <Sparkles className="size-4" />
                Start onboarding
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Skip for now
              </Button>
            </div>
          </motion.div>
        ) : (
          // Chat state - messages + input at bottom
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <Conversation className="flex-1">
              <ConversationContent className="mx-auto w-full max-w-3xl pb-4">
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    from={message.role}
                    avatarUrl={
                      message.role === "user" ? avatarUrlFromSession : null
                    }
                    avatarAlt={message.role === "user" ? avatarAlt : null}
                    avatarFallback={
                      message.role === "user" ? avatarFallback : null
                    }
                  >
                    <MessageContent>
                      {message.role === "user" ? (
                        <div className="relative max-w-full">
                          {editingMessageId === message.id ? (
                            <div className="w-full max-w-[80%]">
                              <textarea
                                ref={editTextareaRef}
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-base leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                rows={Math.min(
                                  6,
                                  Math.max(2, editingText.split("\n").length)
                                )}
                                disabled={isLoading || isSaving}
                              />
                              <div className="mt-2 flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditMessage}
                                  disabled={isLoading || isSaving}
                                >
                                  <X className="size-4" />
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={saveEditedMessage}
                                  disabled={isLoading || isSaving || !editingText.trim()}
                                >
                                  <Check className="size-4" />
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="group relative">
                              <MessageBubble variant="user" className="text-base">
                                {message.content}
                              </MessageBubble>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => beginEditMessage(message)}
                                className="absolute right-full top-1/2 mr-2 hidden -translate-y-1/2 group-hover:inline-flex"
                                disabled={isLoading || isSaving}
                              >
                                <Pencil className="size-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-base text-white [&>*]:text-white [&>p]:my-0 [&>p:not(:last-child)]:mb-2 [&>ul]:my-1 [&>ol]:my-1 [&>ul>li]:my-0.5 [&>ol>li]:my-0.5">
                          {message.content}
                        </div>
                      )}
                    </MessageContent>
                  </Message>
                ))}

                {isLoading && (
                  <Message from="assistant">
                    <MessageContent>
                      <div className="flex h-8 items-center">
                        <div className="flex items-center gap-1 translate-y-[1px]">
                          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50" />
                        </div>
                      </div>
                    </MessageContent>
                  </Message>
                )}

                {error && (
                  <MessageError
                    error={error}
                    onRetry={() => {
                      setError(null);
                      if (messages.length === 0) {
                        startConversation();
                      }
                    }}
                  />
                )}

                {isComplete && !isSaving && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center pt-4"
                  >
                    <Button
                      onClick={saveOnboarding}
                      size="lg"
                      className="gap-2"
                    >
                      <Sparkles className="size-4" />
                      Complete Setup
                    </Button>
                  </motion.div>
                )}

                {isSaving && (
                  <div className="flex justify-center pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>Saving your profile...</span>
                    </div>
                  </div>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <div className="bg-background px-4 pb-6 pt-4">
              <PromptInput
                onSubmit={handleSubmit}
                className="mx-auto max-w-3xl [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] [&_[data-slot=input-group]]:focus-within:ring-0 [&_[data-slot=input-group]]:focus-within:border-border"
              >
                <PromptInputBody>
                  <PromptInputTextarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      isComplete
                        ? "Anything else you'd like to add?"
                        : "Type your response..."
                    }
                    disabled={isLoading || isSaving || editingMessageId !== null}
                    className="min-h-10 text-base"
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                    disabled={isSaving || editingMessageId !== null}
                  >
                    Skip
                  </Button>
                  <PromptInputSubmit
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={isLoading || isSaving || editingMessageId !== null || !input.trim()}
                  />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
