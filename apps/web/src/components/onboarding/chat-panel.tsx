"use client"

import { useRef, useCallback, useState, useEffect, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageError,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { Reasoning } from "@/components/ui/reasoning"
import { LoaderIcon, Mic, Square } from "lucide-react"
import { useVoiceRecording } from "@/hooks/use-voice-recording"
import { OnboardingVoiceBar } from "@/components/onboarding-voice-bar"
import { ChatMessageItem } from "./chat-message"
import { StreamingMessage } from "./streaming-message"
import { SuggestedReplies } from "./suggested-replies"
import { FinishOnboarding } from "./analysis-results"
import { SkillSelector } from "./skill-selector"
import type { ChatMessage, CollectedData } from "@/lib/onboarding/schema"

type ChatPanelProps = {
  messages: ChatMessage[]
  collectedData: CollectedData
  isLoading: boolean
  isStreaming: boolean
  streamingContent: string
  error: string | null
  activeToolCall: { name: string; status: string; elapsed?: number } | null
  toolCallElapsed: number
  isReasoning: boolean
  reasoningContent: string
  reasoningDuration: number | undefined
  reasoningPhase: "thinking" | "evaluating"
  accessToken: string | null
  onSendMessage: (text: string) => void
  onEditMessage: (messageId: string, newText: string) => void
  onStopGeneration: () => void
  onStartConversation: () => void
  setError: (error: string | null) => void
  onLinkedinClick?: () => void
  linkedinPopupEnabled?: boolean
  onComplete?: () => void
}

export function ChatPanel({
  messages,
  collectedData,
  isLoading,
  isStreaming,
  streamingContent,
  error,
  activeToolCall,
  toolCallElapsed,
  isReasoning,
  reasoningContent,
  reasoningDuration,
  reasoningPhase,
  accessToken,
  onSendMessage,
  onEditMessage,
  onStopGeneration,
  onStartConversation,
  setError,
  onLinkedinClick,
  linkedinPopupEnabled,
  onComplete,
}: ChatPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState("")
  const [pendingSkills, setPendingSkills] = useState<string[]>([])

  const voiceRecording = useVoiceRecording({
    accessToken,
    onTranscript: (text) => onSendMessage(text),
    onError: (err) => setError(err),
  })

  // Focus textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isLoading])

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (message.text) {
        onSendMessage(message.text)
        setInput("")
      }
    },
    [onSendMessage]
  )

  const hasAnalysis = messages.some((m) => m.profileAnalysis)
  const isEditable = !isLoading && !isStreaming && voiceRecording.status === "idle"

  // Detect if the agent is asking about skills
  const showSkillSelector = useMemo(() => {
    if (isLoading || isStreaming || hasAnalysis) return false
    if (collectedData.skills && collectedData.skills.length > 0) return false
    const lastAssistant = [...messages].reverse().find(
      (m) => m.role === "assistant" && m.content && !m.toolCall && !m.profileAnalysis
    )
    const text = lastAssistant?.content.toLowerCase() ?? ""
    return text.includes("skill") || text.includes("technologies") || text.includes("stack") || text.includes("frameworks")
  }, [messages, collectedData.skills, isLoading, isStreaming, hasAnalysis])

  return (
    <motion.div
      key="chat"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-1 flex-col min-h-0 overflow-hidden"
    >
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="mx-auto w-full max-w-3xl pt-12 pb-4">
          {messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isEditable={isEditable}
              onEdit={onEditMessage}
              isEditDisabled={isLoading || isStreaming}
            />
          ))}

          {isStreaming && streamingContent && (
            <StreamingMessage content={streamingContent} />
          )}

          {activeToolCall && (
            <Message from="assistant" hideAvatar>
              <MessageContent>
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/80 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm">
                  <LoaderIcon className="size-3.5 animate-spin" />
                  <span>
                    Fetching LinkedIn profile
                    {toolCallElapsed > 0 ? ` (${toolCallElapsed}s)` : "..."}
                  </span>
                </div>
              </MessageContent>
            </Message>
          )}

          {isReasoning && (
            <Message from="assistant" hideAvatar>
              <MessageContent>
                <Reasoning
                  isStreaming={true}
                  content={reasoningContent}
                  duration={reasoningDuration}
                  phase={reasoningPhase}
                />
              </MessageContent>
            </Message>
          )}

          {isLoading && !isStreaming && (
            <Message from="assistant" hideAvatar>
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
                setError(null)
                if (messages.length === 0) {
                  onStartConversation()
                }
              }}
            />
          )}

          {hasAnalysis && !isLoading && !isStreaming && (
            <FinishOnboarding
              collectedData={collectedData}
              onComplete={onComplete}
            />
          )}
        </ConversationContent>
      </Conversation>

      {/* Input area */}
      <div className="relative shrink-0">
        <div className="bg-background px-4 pb-6 pt-4">
          {/* Skill selector (inline form) */}
          {showSkillSelector && voiceRecording.status === "idle" && (
            <div className="mx-auto max-w-3xl pb-2">
              <SkillSelector
                skills={pendingSkills}
                onChange={setPendingSkills}
                onSubmit={(skills) => {
                  const text = skills.join(", ")
                  onSendMessage(`My skills: ${text}`)
                  setPendingSkills([])
                }}
              />
            </div>
          )}

          {/* Quick replies */}
          {!showSkillSelector && voiceRecording.status === "idle" && !isLoading && !isStreaming && (
            <SuggestedReplies
              collectedData={collectedData}
              messages={messages}
              onReply={(text) => {
                onSendMessage(text)
              }}
              onLinkedinClick={onLinkedinClick}
              linkedinPopupEnabled={linkedinPopupEnabled}
            />
          )}

          <div className="mx-auto max-w-3xl">
            <AnimatePresence mode="wait">
              {voiceRecording.status !== "idle" ? (
                <motion.div
                  key="voice-bar"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <OnboardingVoiceBar
                    status={voiceRecording.status}
                    elapsed={voiceRecording.elapsed}
                    audioLevel={voiceRecording.audioLevel}
                    onStop={voiceRecording.stop}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="text-input"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <PromptInput
                    onSubmit={handleSubmit}
                    className="[&_[data-slot=input-group]]:border-border/50 [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] [&_[data-slot=input-group]]:focus-within:ring-0 [&_[data-slot=input-group]]:focus-within:border-border"
                  >
                    <PromptInputBody>
                      <PromptInputTextarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your response..."
                        className="min-h-10 text-base"
                      />
                    </PromptInputBody>
                    <PromptInputFooter>
                      {voiceRecording.isSupported && !isLoading && !isStreaming && (
                        <button
                          type="button"
                          onClick={() => voiceRecording.start()}
                          className="relative flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label="Record voice message"
                        >
                          <Mic className="size-4" />
                        </button>
                      )}
                      {isLoading || isStreaming ? (
                        <PromptInputSubmit
                          type="button"
                          onClick={onStopGeneration}
                          className="bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          <Square className="size-4 fill-current" />
                        </PromptInputSubmit>
                      ) : (
                        <PromptInputSubmit
                          className="bg-accent text-accent-foreground hover:bg-accent/90"
                          disabled={!input.trim()}
                          type="submit"
                          onClick={(e) => {
                            if (!input.trim()) return
                            e.preventDefault()
                            onSendMessage(input.trim())
                            setInput("")
                          }}
                        />
                      )}
                    </PromptInputFooter>
                  </PromptInput>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
