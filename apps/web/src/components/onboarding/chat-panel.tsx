"use client"

import { useRef, useCallback, useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation"
import { Button } from "@/components/ui/button"
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
import { ArrowLeft, LoaderIcon, Mic, Square } from "lucide-react"
import { useVoiceRecording } from "@/hooks/use-voice-recording"
import { OnboardingVoiceBar } from "@/components/onboarding-voice-bar"
import { ChatMessageItem } from "./chat-message"
import { SuggestedReplies } from "./suggested-replies"
import { FinishOnboarding } from "./analysis-results"
import { SkillSelector } from "./skill-selector"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ONBOARDING_STEPS } from "@/lib/onboarding/constants"
import { countCompletedSteps } from "@/lib/onboarding/data-status"
import { useFocusMode } from "@/hooks/use-focus-mode"
import type { ChatMessage, CollectedData, InputHint } from "@/lib/onboarding/schema"

function ProgressBadge({ collectedData }: { collectedData: CollectedData }) {
  const completed = countCompletedSteps(collectedData)
  const total = ONBOARDING_STEPS.length
  const step = Math.min(completed + 1, total)
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-accent px-3 py-1.5 text-sm text-accent-foreground w-fit">
      <span>{step}/{total}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 w-3 rounded-full transition-colors ${
              i < step ? "bg-primary" : "bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function StreamingContent({ content }: { content: string }) {
  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
      <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-foreground/50" />
    </>
  )
}

type ChatPanelProps = {
  messages: ChatMessage[]
  collectedData: CollectedData
  inputHint: InputHint
  isLoading: boolean
  isStreaming: boolean
  streamingContent: string
  streamThinkingDuration: number | undefined
  error: string | null
  activeToolCall: { name: string; status: string; elapsed?: number } | null
  toolCallElapsed: number
  isReasoning: boolean
  reasoningContent: string
  reasoningDuration: number | undefined
  reasoningPhase: "thinking" | "evaluating"
  accessToken: string | null
  onSendMessage: (text: string) => void
  onRevertToMessage: (messageId: string) => void
  onStopGeneration: () => void
  onStartConversation: () => void
  setError: (error: string | null) => void
  onLinkedinClick?: () => void
  linkedinPopupEnabled?: boolean
  onComplete?: () => void
  onBack?: () => void
}

export function ChatPanel({
  messages,
  collectedData,
  inputHint,
  isLoading,
  isStreaming,
  streamingContent,
  streamThinkingDuration,
  error,
  activeToolCall,
  toolCallElapsed,
  isReasoning,
  reasoningContent,
  reasoningDuration,
  reasoningPhase,
  accessToken,
  onSendMessage,
  onRevertToMessage,
  onStopGeneration,
  onStartConversation,
  setError,
  onLinkedinClick,
  linkedinPopupEnabled,
  onComplete,
  onBack,
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

  // Delay "Thinking..." so it doesn't flash for fast responses
  const [showThinking, setShowThinking] = useState(false)
  const isWaiting = isLoading || isStreaming
  useEffect(() => {
    if (!isWaiting) {
      setShowThinking(false)
      return
    }
    const id = setTimeout(() => setShowThinking(true), 400)
    return () => clearTimeout(id)
  }, [isWaiting])

  const hasAnalysis = messages.some((m) => m.profileAnalysis)
  const isEditable = !isLoading && !isStreaming && voiceRecording.status === "idle"

  const showSkillSelector = inputHint.type === "skill_selector" && !isLoading && !isStreaming && !hasAnalysis
  const activeSuggestions = inputHint.type === "suggestions" ? inputHint.suggestions : []

  // Focus mode — dim messages when waiting for user input (not during analysis)
  const [focusEnabled, , focusOpacity] = useFocusMode()
  const shouldDim = focusEnabled && !isWaiting && !hasAnalysis && messages.length > 0

  return (
    <motion.div
      key="chat"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-1 flex-col min-h-0 overflow-hidden"
    >
      <Conversation
        className="flex-1 min-h-0 transition-opacity duration-500"
        style={shouldDim ? { opacity: 1 - focusOpacity / 100 } : undefined}
      >
        <ConversationContent className="mx-auto w-full max-w-3xl pt-4 pb-4">
          {/* Back button */}
          {onBack && (
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
            </div>
          )}
          {messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isEditable={isEditable}
              onRevert={onRevertToMessage}
            />
          ))}

          {showThinking && !activeToolCall && !isReasoning && (
            <Message from="assistant" hideAvatar>
              <MessageContent>
                <div className="space-y-3">
                  {!hasAnalysis && (
                    <ProgressBadge collectedData={collectedData} />
                  )}
                  <Reasoning
                    isStreaming={!streamThinkingDuration}
                    content=""
                    duration={streamThinkingDuration}
                    phase="thinking"
                  />
                  {isStreaming && streamingContent && (
                    <div className="prose prose-base max-w-none text-foreground">
                      <StreamingContent content={streamingContent} />
                    </div>
                  )}
                </div>
              </MessageContent>
            </Message>
          )}

          {activeToolCall && (
            <Message from="assistant" hideAvatar>
              <MessageContent>
                <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
                  <LoaderIcon className="size-3.5 animate-spin" />
                  <span>
                    Fetching LinkedIn profile
                    {toolCallElapsed > 0 ? ` (${toolCallElapsed}s)` : "..."}
                  </span>
                </div>
                <p className="mt-2 text-xs text-yellow-500/80">
                  This usually takes 30–60 seconds, but can take up to 3 minutes.
                </p>
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
          {/* Quick replies (only when not showing skill selector) */}
          {!showSkillSelector && voiceRecording.status === "idle" && !isLoading && !isStreaming && (
            <SuggestedReplies
              suggestions={activeSuggestions}
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
              ) : showSkillSelector ? (
                <motion.div
                  key="skill-input"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <SkillSelector
                    skills={pendingSkills}
                    onChange={setPendingSkills}
                    onSubmit={(skills) => {
                      const text = skills.join(", ")
                      onSendMessage(`My skills: ${text}`)
                      setPendingSkills([])
                    }}
                    onVoiceClick={() => voiceRecording.start()}
                    voiceSupported={voiceRecording.isSupported}
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
