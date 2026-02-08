"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import type { CollectedData, ChatMessage, ProfileAnalysis, ToolCallInfo, SavedField, InputHint } from "@/lib/onboarding/schema"
import { INITIAL_COLLECTED_DATA, DEFAULT_INPUT_HINT } from "@/lib/onboarding/schema"
import { ONBOARDING_STEPS } from "@/lib/onboarding/constants"
import { countCompletedSteps } from "@/lib/onboarding/data-status"
import { useOnboardingProgress } from "./use-onboarding-progress"

// ============================================================================
// Types
// ============================================================================

type UseOnboardingChatOptions = {
  accessToken: string | null
  userMetadata?: {
    fullName?: string | null
    planDisplayName?: string | null
  }
  onDataUpdate?: (data: CollectedData) => void
}

type UseOnboardingChatReturn = {
  messages: ChatMessage[]
  collectedData: CollectedData
  inputHint: InputHint
  hasStarted: boolean
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
  isRestoring: boolean
  conversationId: string | null
  startConversation: (overrideName?: string) => Promise<void>
  sendMessage: (text: string) => Promise<void>
  revertToMessage: (messageId: string) => void
  stopGeneration: () => void
  setError: (error: string | null) => void
  reset: () => void
}

// ============================================================================
// Helpers
// ============================================================================

function generateId() {
  return Math.random().toString(36).slice(2)
}

// ============================================================================
// Hook
// ============================================================================

export function useOnboardingChat(options: UseOnboardingChatOptions): UseOnboardingChatReturn {
  const { accessToken, userMetadata, onDataUpdate } = options

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [collectedData, setCollectedData] = useState<CollectedData>(INITIAL_COLLECTED_DATA)
  const [hasStarted, setHasStarted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [inputHint, setInputHint] = useState<InputHint>(DEFAULT_INPUT_HINT)
  const [activeToolCall, setActiveToolCall] = useState<{
    name: string
    status: string
    elapsed?: number
  } | null>(null)
  const [toolCallElapsed, setToolCallElapsed] = useState(0)
  const [isReasoning, setIsReasoning] = useState(false)
  const [reasoningContent, setReasoningContent] = useState("")
  const [reasoningDuration, setReasoningDuration] = useState<number | undefined>()
  const [reasoningPhase, setReasoningPhase] = useState<"thinking" | "evaluating">("thinking")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [streamThinkingDuration, setStreamThinkingDuration] = useState<number | undefined>()

  const abortControllerRef = useRef<AbortController | null>(null)
  const onDataUpdateRef = useRef(onDataUpdate)
  useEffect(() => {
    onDataUpdateRef.current = onDataUpdate
  }, [onDataUpdate])

  // Progress
  const { isRestoring, loadProgress, saveProgress } = useOnboardingProgress()

  // Tool call elapsed timer
  const toolCallActive = activeToolCall !== null
  useEffect(() => {
    if (!toolCallActive) {
      setToolCallElapsed(0)
      return
    }
    setToolCallElapsed(0)
    const id = setInterval(() => setToolCallElapsed((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [toolCallActive])

  // Load progress on mount
  useEffect(() => {
    if (!accessToken) return
    loadProgress(accessToken, userMetadata).then((state) => {
      if (state) {
        setMessages(state.messages)
        setCollectedData(state.collectedData)
        setHasStarted(state.hasStarted)
        onDataUpdateRef.current?.(state.collectedData)
      }
    })
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync collectedData to parent via callback
  const updateCollectedData = useCallback((data: CollectedData) => {
    setCollectedData(data)
    onDataUpdateRef.current?.(data)
  }, [])

  // ── SSE Stream Processor ─────────────────────────────────────
  const processStreamResponse = useCallback(async (
    response: Response,
    updatedMessages: ChatMessage[],
    currentCollectedData: CollectedData,
    currentHasStarted: boolean,
    currentAccessToken: string,
    signal?: AbortSignal
  ) => {
    const reader = response.body?.getReader()
    if (!reader) throw new Error("No response body")

    const decoder = new TextDecoder()
    let fillerContent = ""
    let summaryContent = ""
    let toolCallSeen = false
    let toolCallFinished = false
    let toolCallResult: ToolCallInfo | null = null
    let lastElapsed: number | undefined
    let finalCollectedData = currentCollectedData
    let wasAborted = false
    let profileAnalysisResult: ProfileAnalysis | null = null
    let savedFieldsResult: SavedField[] | null = null
    let reasoningText = ""
    let reasoningDur: number | undefined
    const streamStartTime = Date.now()
    let thinkingDur: number | undefined
    const midStreamMessages: ChatMessage[] = []

    setIsStreaming(true)
    setStreamingContent("")
    setStreamThinkingDuration(undefined)

    const abortHandler = () => {
      wasAborted = true
      reader.cancel()
    }
    signal?.addEventListener("abort", abortHandler)

    try {
      while (true) {
        if (signal?.aborted) {
          wasAborted = true
          break
        }

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
              if (thinkingDur === undefined) {
                thinkingDur = Math.round((Date.now() - streamStartTime) / 1000)
                setStreamThinkingDuration(thinkingDur)
              }
              if (!toolCallSeen || !toolCallFinished) {
                fillerContent += parsed.content
                setStreamingContent(fillerContent)
              } else {
                summaryContent += parsed.content
                setStreamingContent(summaryContent)
              }
            } else if (parsed.type === "tool_call") {
              if (parsed.status === "started") {
                toolCallSeen = true
                // Save the filler message immediately so it doesn't disappear
                if (fillerContent.trim() && midStreamMessages.length === 0) {
                  // Compute progress based on current state (before LinkedIn data is merged)
                  const completed = countCompletedSteps(currentCollectedData)
                  const total = ONBOARDING_STEPS.length
                  const fillerMsg: ChatMessage = {
                    id: generateId(),
                    role: "assistant",
                    content: fillerContent.trim(),
                    thinkingDuration: thinkingDur,
                    progress: { step: Math.min(completed + 1, total), total },
                  }
                  midStreamMessages.push(fillerMsg)
                  setMessages([...updatedMessages, ...midStreamMessages])
                  setStreamingContent("")
                }
                setActiveToolCall({ name: parsed.name, status: "running" })
              } else if (parsed.status === "completed" || parsed.status === "failed") {
                toolCallFinished = true
                toolCallResult = {
                  name: parsed.name ?? "linkedin_scrape",
                  status: parsed.status as "completed" | "failed",
                  elapsed: lastElapsed,
                }
                setActiveToolCall(null)
                setStreamingContent("")
              }
            } else if (parsed.type === "tool_status") {
              lastElapsed = parsed.elapsed
              setActiveToolCall((prev) =>
                prev ? { ...prev, elapsed: parsed.elapsed } : null
              )
            } else if (parsed.type === "saved_fields") {
              if (parsed.fields && parsed.fields.length > 0) {
                savedFieldsResult = parsed.fields
              }
            } else if (parsed.type === "final") {
              if (parsed.collectedData) {
                finalCollectedData = parsed.collectedData
              }
              if (parsed.conversationId) {
                setConversationId(parsed.conversationId)
              }
              if (parsed.inputHint) {
                setInputHint(parsed.inputHint)
              } else {
                setInputHint(DEFAULT_INPUT_HINT)
              }
            } else if (parsed.type === "profile_analysis") {
              profileAnalysisResult = {
                overallScore: parsed.overallScore,
                categories: parsed.categories,
                strengths: parsed.strengths,
                improvements: parsed.improvements,
                detailedFeedback: parsed.detailedFeedback,
              }
            } else if (parsed.type === "tool_event") {
              console.log(`[onboarding] Tool event: ${parsed.toolName} — ${parsed.status}`)
            } else if (parsed.type === "agent_updated") {
              console.log(`[onboarding] Agent updated: ${parsed.agentName}`)
            } else if (parsed.type === "reasoning_started") {
              setIsReasoning(true)
              setReasoningPhase("thinking")
              setReasoningContent("")
              reasoningText = ""
            } else if (parsed.type === "reasoning_chunk") {
              reasoningText += parsed.content
              setReasoningContent(reasoningText)
            } else if (parsed.type === "reasoning_evaluating") {
              setReasoningPhase("evaluating")
            } else if (parsed.type === "reasoning_completed") {
              setIsReasoning(false)
              setReasoningDuration(parsed.duration)
              reasoningDur = parsed.duration
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }

    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        wasAborted = true
      } else {
        throw err
      }
    } finally {
      signal?.removeEventListener("abort", abortHandler)
      setIsStreaming(false)
      setStreamingContent("")
      setStreamThinkingDuration(undefined)
      setActiveToolCall(null)
      setIsReasoning(false)
      setReasoningPhase("thinking")
    }

    if (wasAborted && toolCallSeen && !toolCallFinished) {
      toolCallResult = {
        name: "linkedin_scrape",
        status: "aborted",
        elapsed: lastElapsed,
      }
    }

    // Build messages
    const newMessages: ChatMessage[] = []
    const completed = countCompletedSteps(finalCollectedData)
    const total = ONBOARDING_STEPS.length
    const msgProgress = { step: Math.min(completed + 1, total), total }

    if (toolCallResult) {
      // Filler was already saved when tool started (see tool_call handler above)
      // It already has the progress badge, so don't add it to the tool call or summary
      newMessages.push({ id: generateId(), role: "assistant", content: "", toolCall: toolCallResult })
      if (summaryContent.trim()) {
        newMessages.push({ id: generateId(), role: "assistant", content: summaryContent.trim() })
      }
    } else {
      const combined = (fillerContent + summaryContent).trim()
      if (combined) {
        newMessages.push({
          id: generateId(),
          role: "assistant",
          content: combined,
          savedFields: savedFieldsResult ?? undefined,
          progress: msgProgress,
          thinkingDuration: thinkingDur,
        })
      }
    }

    // If there were saved fields but no text message (edge case), create a standalone saved fields message
    if (savedFieldsResult && newMessages.length === 0) {
      newMessages.push({
        id: generateId(),
        role: "assistant",
        content: "",
        savedFields: savedFieldsResult,
        progress: msgProgress,
        thinkingDuration: thinkingDur,
      })
    }

    if (profileAnalysisResult) {
      newMessages.push({
        id: generateId(),
        role: "assistant",
        content: "",
        profileAnalysis: profileAnalysisResult,
        reasoning: reasoningText ? { content: reasoningText, duration: reasoningDur } : undefined,
      })
    }

    setReasoningContent("")
    setReasoningDuration(undefined)

    const finalMessages = [...updatedMessages, ...midStreamMessages, ...newMessages]
    setMessages(finalMessages)
    updateCollectedData(finalCollectedData as CollectedData)

    saveProgress(finalMessages, finalCollectedData as CollectedData, currentHasStarted, currentAccessToken)
  }, [saveProgress, updateCollectedData])

  // ── Start Conversation ─────────────────────────────────────
  const startConversation = useCallback(async (overrideName?: string) => {
    if (!accessToken) return

    const newHasStarted = true
    setHasStarted(newHasStarted)
    setIsLoading(true)
    setError(null)

    const controller = new AbortController()
    abortControllerRef.current = controller

    // Merge override name into collectedData before sending
    const nameToUse = overrideName ?? collectedData.fullName
    const startData = nameToUse
      ? { ...collectedData, fullName: nameToUse }
      : collectedData

    try {
      const initialMessage = nameToUse
        ? `Hi, I'm ${nameToUse} and I'm ready to set up my profile!`
        : "Hi, I'm ready to set up my profile!"

      const response = await fetch("/api/v1/onboarding/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: initialMessage,
          conversationHistory: [],
          collectedData: startData,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error("Failed to start conversation")

      const contentType = response.headers.get("content-type")

      if (contentType?.includes("text/event-stream")) {
        await processStreamResponse(response, [], startData, newHasStarted, accessToken, controller.signal)
      } else {
        const data = await response.json()
        const newMessages: ChatMessage[] = [
          { id: generateId(), role: "assistant", content: data.message },
        ]
        setMessages(newMessages)
        if (data.collectedData) updateCollectedData(data.collectedData)
        saveProgress(newMessages, data.collectedData ?? startData, newHasStarted, accessToken)
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Failed to start conversation")
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [accessToken, collectedData, processStreamResponse, saveProgress, updateCollectedData])

  // ── Send Message ─────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || isStreaming || !accessToken) return

    const userMessage: ChatMessage = { id: generateId(), role: "user", content: text.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)
    setError(null)
    setInputHint(DEFAULT_INPUT_HINT) // Clear input hint when sending new message

    const controller = new AbortController()
    abortControllerRef.current = controller

    saveProgress(updatedMessages, collectedData, hasStarted, accessToken)

    try {
      const conversationHistory = updatedMessages
        .filter((m) => !m.toolCall)
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch("/api/v1/onboarding/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: text.trim(),
          conversationHistory,
          collectedData,
          stream: true,
          ...(conversationId ? { conversationId } : {}),
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error?.message || "Failed to send message")
      }

      const contentType = response.headers.get("content-type")

      if (contentType?.includes("text/event-stream")) {
        await processStreamResponse(response, updatedMessages, collectedData, hasStarted, accessToken, controller.signal)
      } else {
        const data = await response.json()
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: data.message,
        }
        const finalMessages = [...updatedMessages, assistantMessage]
        setMessages(finalMessages)
        if (data.collectedData) updateCollectedData(data.collectedData)
        saveProgress(finalMessages, data.collectedData ?? collectedData, hasStarted, accessToken)
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [messages, collectedData, isLoading, isStreaming, hasStarted, accessToken, conversationId, processStreamResponse, saveProgress, updateCollectedData])

  // ── Revert to Message ────────────────────────────────────────
  // Truncates conversation to just before the target user message and
  // rebuilds collectedData from savedFields on the remaining messages.
  const revertToMessage = useCallback((messageId: string) => {
    if (isLoading || isStreaming) return

    const targetIndex = messages.findIndex((m) => m.id === messageId)
    if (targetIndex === -1) return
    if (messages[targetIndex].role !== "user") return

    // Keep everything before the target user message
    const remaining = messages.slice(0, targetIndex)

    // Rebuild collectedData from savedFields on remaining messages
    const rebuilt: CollectedData = { ...INITIAL_COLLECTED_DATA }
    // Preserve fullName — it's set before chat starts
    rebuilt.fullName = collectedData.fullName
    for (const msg of remaining) {
      if (msg.savedFields) {
        for (const { field, value } of msg.savedFields) {
          ;(rebuilt as Record<string, unknown>)[field] = value
        }
      }
    }

    setMessages(remaining)
    updateCollectedData(rebuilt)
    setInputHint(DEFAULT_INPUT_HINT)
    setError(null)

    if (accessToken) {
      saveProgress(remaining, rebuilt, hasStarted, accessToken)
    }
  }, [messages, collectedData.fullName, isLoading, isStreaming, hasStarted, accessToken, saveProgress, updateCollectedData])

  // ── Stop Generation ───────────────────────────────────────────
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
    setIsStreaming(false)
    setStreamingContent("")
    setStreamThinkingDuration(undefined)
    setActiveToolCall(null)
    setIsReasoning(false)
    setReasoningPhase("thinking")
    setReasoningContent("")
    setReasoningDuration(undefined)
  }, [])

  // ── Reset ─────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopGeneration()
    setMessages([])
    setCollectedData(INITIAL_COLLECTED_DATA)
    setHasStarted(false)
    setError(null)
    setConversationId(null)
  }, [stopGeneration])

  return {
    messages,
    collectedData,
    inputHint,
    hasStarted,
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
    isRestoring,
    conversationId,
    startConversation,
    sendMessage,
    revertToMessage,
    stopGeneration,
    setError,
    reset,
  }
}
