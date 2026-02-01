"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import { useSession } from "@/app/auth/session-provider"
import {
  Message,
  MessageContent,
  MessageError,
} from "@/components/ai-elements/message"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Square } from "lucide-react"
import type { CVData } from "@/components/cv-preview"

// ============================================================================
// Types
// ============================================================================

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

type ToolCallEvent = {
  name: string
  args: Record<string, unknown>
}

type CVChatProps = {
  cvData: CVData
  onCVUpdate: (toolCalls: ToolCallEvent[]) => void
  className?: string
}

// ============================================================================
// Helpers
// ============================================================================

function generateId() {
  return Math.random().toString(36).slice(2)
}

const SUGGESTED_PROMPTS = [
  "Improve my headline",
  "Write a professional summary",
  "Make my experience more impactful",
]

// ============================================================================
// Component
// ============================================================================

export function CVChat({ cvData, onCVUpdate, className }: CVChatProps) {
  const { session } = useSession()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [error, setError] = useState<string | null>(null)

  const hasMessages = messages.length > 0

  // Send a message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || isStreaming) return
      if (!session?.access_token) return

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text.trim(),
      }

      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)
      setInput("")
      setIsLoading(true)
      setError(null)

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const conversationHistory = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const response = await fetch("/api/v1/cv-builder/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: text.trim(),
            cvData,
            conversationHistory,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(
            errorData?.error?.message || "Failed to send message"
          )
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let accumulated = ""
        const pendingToolCalls: ToolCallEvent[] = []

        setIsStreaming(true)
        setStreamingContent("")

        try {
          while (true) {
            if (controller.signal.aborted) break

            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (!line.trim() || !line.startsWith("data: ")) continue

              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const parsed = JSON.parse(data)

                if (parsed.type === "text") {
                  accumulated += parsed.content
                  setStreamingContent(accumulated)
                } else if (parsed.type === "tool_call") {
                  pendingToolCalls.push({
                    name: parsed.name,
                    args: parsed.args,
                  })
                } else if (parsed.type === "error") {
                  throw new Error(parsed.message || "Streaming failed")
                }
              } catch (e) {
                if (e instanceof SyntaxError) continue
                throw e
              }
            }
          }
        } finally {
          setIsStreaming(false)
          setStreamingContent("")
        }

        // Add the completed assistant message
        if (accumulated.trim()) {
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: accumulated.trim(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        }

        // Apply tool calls to update CV
        if (pendingToolCalls.length > 0) {
          onCVUpdate(pendingToolCalls)
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return
        setError(err instanceof Error ? err.message : "Failed to send message")
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [messages, isLoading, isStreaming, session?.access_token, cvData, onCVUpdate]
  )

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
    setIsStreaming(false)
    setStreamingContent("")
  }, [])

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (message.text) {
        sendMessage(message.text)
      }
    },
    [sendMessage]
  )

  useEffect(() => {
    if (!isLoading && !isStreaming && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isLoading, isStreaming])

  // Auto-scroll to bottom on new messages / streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  return (
    <div className={className}>
      <div className="flex h-full flex-col">
        {!hasMessages ? (
          // Empty state with suggested prompts
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
            <div className="text-center">
              <h2 className="mb-1 text-xl font-semibold tracking-tight">
                CV Assistant
              </h2>
              <p className="text-sm text-muted-foreground">
                Ask me to improve your CV
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="w-full max-w-md">
              <PromptInput
                onSubmit={handleSubmit}
                className="[&_[data-slot=input-group]]:border-border/50 [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-[0_2px_8px_rgba(0,0,0,0.08)] [&_[data-slot=input-group]]:focus-within:ring-0 [&_[data-slot=input-group]]:focus-within:border-border"
              >
                <PromptInputBody>
                  <PromptInputTextarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe what to improve..."
                    className="min-h-10 text-sm"
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputSubmit
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={!input.trim()}
                  />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
        ) : (
          // Chat state
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-4 pb-4">
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    from={message.role}
                    hideAvatar
                  >
                    <MessageContent>
                      {message.role === "user" ? (
                        <div className="flex justify-end">
                          <div className="rounded-2xl bg-accent px-4 py-2.5 text-sm text-accent-foreground">
                            {message.content}
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm prose-invert max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </MessageContent>
                  </Message>
                ))}

                {isStreaming && streamingContent && (
                  <Message from="assistant" hideAvatar>
                    <MessageContent>
                      <div className="prose prose-sm prose-invert max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                      </div>
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
                    onRetry={() => setError(null)}
                  />
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t bg-background px-4 pb-4 pt-3">
              <div className="mx-auto max-w-2xl">
                <PromptInput
                  onSubmit={handleSubmit}
                  className="[&_[data-slot=input-group]]:border-border/50 [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] [&_[data-slot=input-group]]:focus-within:ring-0 [&_[data-slot=input-group]]:focus-within:border-border"
                >
                  <PromptInputBody>
                    <PromptInputTextarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything about your CV..."
                      className="min-h-10 text-sm"
                    />
                  </PromptInputBody>
                  <PromptInputFooter>
                    {isLoading || isStreaming ? (
                      <PromptInputSubmit
                        type="button"
                        onClick={stopGeneration}
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        <Square className="size-4 fill-current" />
                      </PromptInputSubmit>
                    ) : (
                      <PromptInputSubmit
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={!input.trim()}
                      />
                    )}
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
