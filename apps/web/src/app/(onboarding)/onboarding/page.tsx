"use client";

import * as React from "react";
import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "../../auth/session-provider";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageBubble,
  MessageLoading,
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
import { Sparkles } from "lucide-react";

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

export default function OnboardingPage() {
  const router = useRouter();
  const { session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Start the conversation when user sends first message or clicks start
  const startConversation = useCallback(async () => {
    setHasStarted(true);
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

      setMessages([
        {
          id: generateId(),
          role: "assistant",
          content: data.message,
        },
      ]);

      if (data.collectedData) {
        setCollectedData(data.collectedData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start conversation"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setError(null);

      try {
        const conversationHistory = messages.map((m) => ({
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

        setMessages((prev) => [...prev, assistantMessage]);

        if (data.collectedData) {
          setCollectedData(data.collectedData);
        }

        if (data.isComplete) {
          setIsComplete(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, collectedData, isLoading]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!hasStarted) {
        startConversation();
        return;
      }

      if (message.text) {
        sendMessage(message.text);
      }
    },
    [hasStarted, startConversation, sendMessage]
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

      router.replace("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [collectedData, session?.access_token, router]);

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

            <div className="w-full max-w-xl">
              <PromptInput
                onSubmit={handleSubmit}
                className="shadow-lg"
              >
                <PromptInputBody>
                  <PromptInputTextarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Say hello to get started..."
                    className="min-h-12"
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Skip for now
                  </Button>
                  <PromptInputSubmit disabled={isLoading} />
                </PromptInputFooter>
              </PromptInput>
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
              <ConversationContent>
                {messages.map((message) => (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {message.role === "user" ? (
                        <MessageBubble variant="user">
                          {message.content}
                        </MessageBubble>
                      ) : (
                        <MessageResponse>{message.content}</MessageResponse>
                      )}
                    </MessageContent>
                  </Message>
                ))}

                {isLoading && (
                  <Message from="assistant">
                    <MessageContent>
                      <MessageLoading />
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

            <div className="shrink-0 border-t bg-background px-4 py-4">
              <PromptInput onSubmit={handleSubmit} className="mx-auto max-w-2xl">
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
                    disabled={isLoading || isSaving}
                    className="min-h-10"
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                    disabled={isSaving}
                  >
                    Skip
                  </Button>
                  <PromptInputSubmit
                    disabled={isLoading || isSaving || !input.trim()}
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
