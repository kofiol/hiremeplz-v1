"use client"

import * as React from "react"
import { useCallback, useState, useRef, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useSession } from "@/app/auth/session-provider"
import { useFocusMode } from "@/hooks/use-focus-mode"
import {
  useLinkedinPopup,
  validateLinkedinUrl,
  normalizeLinkedinUrl,
} from "@/hooks/use-linkedin-popup"
import { useUserPlan } from "@/hooks/use-user-plan"
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageBubble,
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Reasoning } from "@/components/ui/reasoning"
import { ProfileAnalysisResults, ProfileScoreCard } from "@/components/ui/score-indicator"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Check, CheckCircle, Linkedin, LoaderIcon, Mic, OctagonX, Pencil, Square, X, XCircle } from "lucide-react"
import { useVoiceRecording } from "@/hooks/use-voice-recording"
import { OnboardingVoiceBar } from "@/components/onboarding-voice-bar"

// ============================================================================
// Types
// ============================================================================

type ToolCallInfo = {
  name: string
  status: "completed" | "failed" | "aborted"
  elapsed?: number
}

type ProfileAnalysis = {
  overallScore: number
  categories: {
    skillsBreadth: number
    experienceQuality: number
    ratePositioning: number
    marketReadiness: number
  }
  strengths: string[]
  improvements: string[]
  detailedFeedback: string
  // Legacy fields from old saved progress (pre-structured analysis)
  score?: number
  title?: string
  summary?: string
  analysis?: string
}

type ReasoningInfo = {
  content: string
  duration?: number
}

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  toolCall?: ToolCallInfo
  profileAnalysis?: ProfileAnalysis
  reasoning?: ReasoningInfo
  voiceOrigin?: boolean
}

type CollectedData = {
  fullName: string | null
  teamMode: "solo" | "team" | null
  profilePath: "linkedin" | "manual" | null
  linkedinUrl: string | null
  experienceLevel:
    | "intern_new_grad"
    | "entry"
    | "mid"
    | "senior"
    | "lead"
    | "director"
    | null
  skills: { name: string }[] | null
  experiences:
    | {
        title: string
        company: string | null
        startDate: string | null
        endDate: string | null
        highlights: string | null
      }[]
    | null
  educations:
    | {
        school: string
        degree: string | null
        field: string | null
        startYear: string | null
        endYear: string | null
      }[]
    | null
  currentRateMin: number | null
  currentRateMax: number | null
  dreamRateMin: number | null
  dreamRateMax: number | null
  currency: "USD" | "EUR" | "GBP" | "CAD" | "AUD" | null
  engagementTypes: ("full_time" | "part_time")[] | null
}

const initialCollectedData: CollectedData = {
  fullName: null,
  teamMode: "solo", // Auto-set to solo, no need to ask
  profilePath: "manual",
  linkedinUrl: null,
  experienceLevel: null,
  skills: null,
  experiences: null,
  educations: null,
  currentRateMin: null,
  currentRateMax: null,
  dreamRateMin: null,
  dreamRateMax: null,
  currency: null,
  engagementTypes: null,
}

// ============================================================================
// Helpers
// ============================================================================

function generateId() {
  return Math.random().toString(36).slice(2)
}

function getSuggestedReplies(data: CollectedData, messages: ChatMessage[]): string[] {
  // Post-analysis: show next action suggestions
  const hasAnalysis = messages.some((m) => m.profileAnalysis)
  if (hasAnalysis) {
    return ["View opportunities", "Edit my profile", "Explore settings"]
  }

  // Detect what the last assistant message is asking about
  const lastAssistant = [...messages].reverse().find(
    (m) => m.role === "assistant" && m.content && !m.toolCall && !m.profileAnalysis
  )
  const lastText = lastAssistant?.content.toLowerCase() ?? ""

  // Match based on what the assistant just asked (keyword detection)
  if (lastText.includes("experience level")) {
    return ["Entry level", "Mid level", "Senior", "Lead"]
  }
  if (lastText.includes("full-time") && lastText.includes("part-time")) {
    return ["Full-time", "Part-time", "Both"]
  }
  if (lastText.includes("dream") && lastText.includes("rate")) {
    return ["$50-100/hr", "$100-200/hr", "$200-300/hr", "$300+/hr"]
  }
  if (lastText.includes("current") && lastText.includes("rate")) {
    return ["$30-50/hr", "$50-100/hr", "$100-150/hr", "$150+/hr"]
  }
  if (lastText.includes("linkedin")) {
    return ["Add my LinkedIn", "Skip, analyze my profile"]
  }

  // Fallback: data-driven waterfall for cases where keyword detection misses
  if (data.fullName === null) return []
  // teamMode is auto-set, skip
  if (data.experienceLevel === null) return ["Entry level", "Mid level", "Senior", "Lead"]
  if (!data.skills || data.skills.length === 0) return []
  if (!data.experiences || data.experiences.length === 0) return []
  if (!data.educations || data.educations.length === 0) return []
  if (data.currentRateMin === null && data.currentRateMax === null)
    return ["$30-50/hr", "$50-100/hr", "$100-150/hr", "$150+/hr"]
  if (data.dreamRateMin === null && data.dreamRateMax === null)
    return ["$50-100/hr", "$100-200/hr", "$200-300/hr", "$300+/hr"]
  if (data.engagementTypes === null) return ["Full-time", "Part-time", "Both"]
  if (!data.linkedinUrl) return ["Add my LinkedIn", "Skip, analyze my profile"]
  return []
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
      hourlyMin: data.dreamRateMin,
      hourlyMax: data.dreamRateMax,
      currentHourlyMin: data.currentRateMin,
      currentHourlyMax: data.currentRateMax,
      engagementTypes: data.engagementTypes ?? [],
      tightness: 3,
    },
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function OnboardingChatbot({ onComplete }: { onComplete?: () => void } = {}) {
  const { session } = useSession()
  const { displayName: planDisplayName } = useUserPlan()
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Resolve user name
  const userName = React.useMemo(() => {
    const metaName =
      (session?.user?.user_metadata?.full_name as string | undefined) ??
      (session?.user?.user_metadata?.name as string | undefined) ??
      (session?.user?.user_metadata?.display_name as string | undefined)

    return planDisplayName ?? metaName ?? session?.user?.email ?? "there"
  }, [planDisplayName, session?.user])

  // Get first name only
  const firstName = React.useMemo(() => {
    if (userName === "there") return "there"
    return userName.split(" ")[0]
  }, [userName])

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Onboarding state
  const [collectedData, setCollectedData] =
    useState<CollectedData>(initialCollectedData)
  const [hasStarted, setHasStarted] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [activeToolCall, setActiveToolCall] = useState<{
    name: string
    status: string
    elapsed?: number
  } | null>(null)
  const [toolCallElapsed, setToolCallElapsed] = useState(0)
  const toolCallActive = activeToolCall !== null

  // Tick the tool-call timer every second (visual only)
  useEffect(() => {
    if (!toolCallActive) {
      setToolCallElapsed(0)
      return
    }
    setToolCallElapsed(0)
    const id = setInterval(() => setToolCallElapsed((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [toolCallActive])

  // Reasoning state
  const [reasoningContent, setReasoningContent] = useState("")
  const [reasoningDuration, setReasoningDuration] = useState<number | undefined>()
  const [isReasoning, setIsReasoning] = useState(false)
  const [reasoningPhase, setReasoningPhase] = useState<"thinking" | "evaluating">("thinking")

  // Quick reply suggestions
  const suggestedReplies = React.useMemo(
    () => getSuggestedReplies(collectedData, messages),
    [collectedData, messages]
  )

  // Focus mode
  const [focusModeEnabled, , opacity] = useFocusMode()
  const [showFocus, setShowFocus] = useState(false)
  const inputAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && !isStreaming && focusModeEnabled && messages.length > 0 && hasStarted) {
      const timer = setTimeout(() => setShowFocus(true), 100)
      return () => clearTimeout(timer)
    } else {
      setShowFocus(false)
    }
  }, [isLoading, isStreaming, focusModeEnabled, messages.length, hasStarted])

  // LinkedIn popup (BETA)
  const [linkedinPopupEnabled] = useLinkedinPopup()
  const [linkedinDialogOpen, setLinkedinDialogOpen] = useState(false)
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const linkedinValidation = React.useMemo(
    () => validateLinkedinUrl(linkedinUrl),
    [linkedinUrl]
  )

  // Voice recording (BETA) — push-to-talk STT
  const voiceRecording = useVoiceRecording({
    accessToken: session?.access_token ?? null,
    onTranscript: (text) => sendMessage(text),
    onError: (err) => setError(err),
  })

  // ── Typewriter effect (char-by-char streaming) ─────────────────────────
  const typewriterTargetRef = useRef("")
  const typewriterIndexRef = useRef(0)
  const typewriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startTypewriter() {
    if (typewriterIntervalRef.current) return
    typewriterIntervalRef.current = setInterval(() => {
      const target = typewriterTargetRef.current
      const idx = typewriterIndexRef.current
      if (idx < target.length) {
        const behind = target.length - idx
        const step = behind > 80 ? 4 : behind > 40 ? 3 : behind > 15 ? 2 : 1
        typewriterIndexRef.current = Math.min(idx + step, target.length)
        setStreamingContent(target.slice(0, typewriterIndexRef.current))
      }
    }, 18)
  }

  function stopTypewriter() {
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current)
      typewriterIntervalRef.current = null
    }
  }

  function flushTypewriter() {
    typewriterIndexRef.current = typewriterTargetRef.current.length
    setStreamingContent(typewriterTargetRef.current)
  }

  function resetTypewriter() {
    stopTypewriter()
    typewriterTargetRef.current = ""
    typewriterIndexRef.current = 0
  }

  function waitForTypewriter(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (typewriterIndexRef.current >= typewriterTargetRef.current.length) {
          resolve()
        } else {
          setTimeout(check, 20)
        }
      }
      check()
    })
  }

  // Cleanup typewriter on unmount
  useEffect(() => {
    return () => stopTypewriter()
  }, [])

  // Load progress on mount
  useEffect(() => {
    async function loadProgress() {
      if (!session?.access_token) return

      try {
        const response = await fetch("/api/v1/onboarding/progress", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.onboardingProgress) {
            const { messages: savedMessages, collectedData: savedData, hasStarted: savedHasStarted } = data.onboardingProgress
            if (savedMessages) setMessages(savedMessages)
            if (savedData) {
              // Pre-fill name from auth metadata if not already set
              // Skip user_metadata.name if it looks like an email prefix (e.g. "kofiol.09")
              const metaName = session?.user?.user_metadata?.name as string | undefined
              const useMetaName = metaName && !metaName.includes("@") && !metaName.includes(".")
                ? metaName
                : null

              const nameFromAuth = planDisplayName ??
                (session?.user?.user_metadata?.full_name as string | undefined) ??
                useMetaName ??
                (session?.user?.user_metadata?.display_name as string | undefined) ??
                null

              setCollectedData({
                ...savedData,
                fullName: savedData.fullName || nameFromAuth,
                teamMode: savedData.teamMode || "solo", // Auto-set to solo if not set
              })
            }
            if (savedHasStarted) setHasStarted(savedHasStarted)
          } else {
            // No saved progress — pre-fill name from auth metadata
            // Skip user_metadata.name if it looks like an email prefix
            const metaName = session?.user?.user_metadata?.name as string | undefined
            const useMetaName = metaName && !metaName.includes("@") && !metaName.includes(".")
              ? metaName
              : null

            const nameFromAuth = planDisplayName ??
              (session?.user?.user_metadata?.full_name as string | undefined) ??
              useMetaName ??
              (session?.user?.user_metadata?.display_name as string | undefined) ??
              null

            if (nameFromAuth) {
              setCollectedData((prev) => ({ ...prev, fullName: nameFromAuth }))
            }
          }
        }
      } catch (err) {
        console.error("Failed to load progress:", err)
      } finally {
        setIsRestoring(false)
      }
    }

    loadProgress()
  }, [session?.access_token])

  useEffect(() => {
    if (!editingMessageId) return
    editTextareaRef.current?.focus()
    editTextareaRef.current?.setSelectionRange(
      editTextareaRef.current.value.length,
      editTextareaRef.current.value.length
    )
  }, [editingMessageId])

  // Save progress
  const saveProgress = useCallback(async (
    newMessages: ChatMessage[],
    newData: CollectedData,
    started: boolean
  ) => {
    if (!session?.access_token) return

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
      })
    } catch (err) {
      console.error("Failed to save progress:", err)
    }
  }, [session?.access_token])

  // Process streaming response
  const processStreamResponse = useCallback(async (
    response: Response,
    updatedMessages: ChatMessage[],
    currentCollectedData: CollectedData,
    currentHasStarted: boolean,
    signal?: AbortSignal
  ) => {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body")
    }

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
    let reasoningText = ""
    let reasoningDur: number | undefined

    setIsStreaming(true)
    setStreamingContent("")
    resetTypewriter()
    startTypewriter()

    // Set up abort handler to cancel the reader
    const abortHandler = () => {
      wasAborted = true
      reader.cancel()
    }
    signal?.addEventListener("abort", abortHandler)

    try {
      while (true) {
        // Check if already aborted
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
              if (!toolCallSeen || !toolCallFinished) {
                fillerContent += parsed.content
                typewriterTargetRef.current = fillerContent
              } else {
                summaryContent += parsed.content
                typewriterTargetRef.current = summaryContent
              }
            } else if (parsed.type === "tool_call") {
              if (parsed.status === "started") {
                toolCallSeen = true
                setActiveToolCall({
                  name: parsed.name,
                  status: "running",
                })
              } else if (
                parsed.status === "completed" ||
                parsed.status === "failed"
              ) {
                toolCallFinished = true
                toolCallResult = {
                  name: parsed.name ?? "linkedin_scrape",
                  status: parsed.status as "completed" | "failed",
                  elapsed: lastElapsed,
                }
                setActiveToolCall(null)
                flushTypewriter()
                typewriterTargetRef.current = ""
                typewriterIndexRef.current = 0
                setStreamingContent("")
              }
            } else if (parsed.type === "tool_status") {
              lastElapsed = parsed.elapsed
              setActiveToolCall((prev) =>
                prev
                  ? { ...prev, elapsed: parsed.elapsed }
                  : null
              )
            } else if (parsed.type === "final") {
              if (parsed.collectedData) {
                finalCollectedData = parsed.collectedData
              }
            } else if (parsed.type === "analysis_started") {
              // Profile analysis uses the reasoning UI, not the tool call badge
            } else if (parsed.type === "profile_analysis") {
              // Profile analysis completed
              profileAnalysisResult = {
                overallScore: parsed.overallScore,
                categories: parsed.categories,
                strengths: parsed.strengths,
                improvements: parsed.improvements,
                detailedFeedback: parsed.detailedFeedback,
              }
            } else if (parsed.type === "analysis_error") {
              // Analysis uses reasoning UI, no tool call state to clear
            } else if (parsed.type === "reasoning_started") {
              // Flush typewriter so text finishes before reasoning badge appears
              flushTypewriter()
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

      // Wait for typewriter to finish displaying remaining characters
      await waitForTypewriter()
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        wasAborted = true
      } else {
        throw err
      }
    } finally {
      signal?.removeEventListener("abort", abortHandler)
      resetTypewriter()
      setIsStreaming(false)
      setStreamingContent("")
      setActiveToolCall(null)
      setIsReasoning(false)
      setReasoningPhase("thinking")
    }

    // If aborted during a tool call, mark it as aborted
    if (wasAborted && toolCallSeen && !toolCallFinished) {
      toolCallResult = {
        name: "linkedin_scrape",
        status: "aborted",
        elapsed: lastElapsed,
      }
    }

    // Build messages — split into filler, tool badge, and summary when a tool call occurred
    const newMessages: ChatMessage[] = []

    if (toolCallResult) {
      if (fillerContent.trim()) {
        newMessages.push({
          id: generateId(),
          role: "assistant",
          content: fillerContent.trim(),
        })
      }
      newMessages.push({
        id: generateId(),
        role: "assistant",
        content: "",
        toolCall: toolCallResult,
      })
      if (summaryContent.trim()) {
        newMessages.push({
          id: generateId(),
          role: "assistant",
          content: summaryContent.trim(),
        })
      }
    } else {
      const combined = (fillerContent + summaryContent).trim()
      if (combined) {
        newMessages.push({
          id: generateId(),
          role: "assistant",
          content: combined,
        })
      }
    }

    // Add profile analysis message if available
    if (profileAnalysisResult) {
      newMessages.push({
        id: generateId(),
        role: "assistant",
        content: "",
        profileAnalysis: profileAnalysisResult,
        reasoning: reasoningText
          ? { content: reasoningText, duration: reasoningDur }
          : undefined,
      })
    }

    // Reset reasoning state after processing
    setReasoningContent("")
    setReasoningDuration(undefined)

    const finalMessages = [...updatedMessages, ...newMessages]
    setMessages(finalMessages)
    setCollectedData(finalCollectedData)

    saveProgress(finalMessages, finalCollectedData, currentHasStarted)
  }, [saveProgress])

  // Start the conversation when user clicks start
  const startConversation = useCallback(async () => {
    const newHasStarted = true
    setHasStarted(newHasStarted)
    setIsLoading(true)
    setError(null)

    // Create abort controller
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      // Include the user's name in the initial message if we have it
      const initialMessage = collectedData.fullName
        ? `Hi, I'm ${collectedData.fullName} and I'm ready to set up my profile!`
        : "Hi, I'm ready to set up my profile!"

      const response = await fetch("/api/v1/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({
          message: initialMessage,
          conversationHistory: [],
          collectedData,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error("Failed to start conversation")
      }

      const contentType = response.headers.get("content-type")

      if (contentType?.includes("text/event-stream")) {
        await processStreamResponse(response, [], collectedData, newHasStarted, controller.signal)
      } else {
        // Fallback for non-streaming response
        const data = await response.json()

        const newMessages: ChatMessage[] = [
          {
            id: generateId(),
            role: "assistant",
            content: data.message,
          },
        ]
        setMessages(newMessages)

        let newData = collectedData
        if (data.collectedData) {
          newData = data.collectedData
          setCollectedData(newData)
        }


        saveProgress(newMessages, newData, newHasStarted)
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User stopped the request, don't show error
        return
      }
      setError(
        err instanceof Error ? err.message : "Failed to start conversation"
      )
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [collectedData, processStreamResponse, saveProgress])

  // Send a message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || isStreaming) return

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

      // Create abort controller
      const controller = new AbortController()
      abortControllerRef.current = controller

      // Optimistic save
      saveProgress(updatedMessages, collectedData, hasStarted)

      try {
        const conversationHistory = updatedMessages
          .filter((m) => !m.toolCall)
          .map((m) => ({
            role: m.role,
            content: m.content,
          }))

        const response = await fetch("/api/v1/onboarding/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
          body: JSON.stringify({
            message: text.trim(),
            conversationHistory,
            collectedData,
            stream: true,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error?.message || "Failed to send message")
        }

        const contentType = response.headers.get("content-type")

        if (contentType?.includes("text/event-stream")) {
          await processStreamResponse(response, updatedMessages, collectedData, hasStarted, controller.signal)
        } else {
          // Fallback for non-streaming response
          const data = await response.json()

          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: data.message,
          }

          const finalMessages = [...updatedMessages, assistantMessage]
          setMessages(finalMessages)

          let finalData = collectedData
          if (data.collectedData) {
            finalData = data.collectedData
            setCollectedData(finalData)
          }
          saveProgress(finalMessages, finalData, hasStarted)
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User stopped the request, don't show error
          return
        }
        setError(err instanceof Error ? err.message : "Failed to send message")
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [messages, collectedData, isLoading, isStreaming, hasStarted, processStreamResponse, saveProgress]
  )

  // Stop streaming/tool usage/reasoning/analysis
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    // Immediately reset all UI states regardless of controller existence
    resetTypewriter()
    setIsLoading(false)
    setIsStreaming(false)
    setStreamingContent("")
    setActiveToolCall(null)
    setIsReasoning(false)
    setReasoningPhase("thinking")
    setReasoningContent("")
    setReasoningDuration(undefined)
  }, [])

  // LinkedIn popup submit handler
  const handleLinkedinSubmit = useCallback(() => {
    if (!linkedinValidation.isValid) return
    const normalizedUrl = normalizeLinkedinUrl(linkedinUrl)
    setLinkedinDialogOpen(false)
    setLinkedinUrl("")
    setShowFocus(false)
    sendMessage(`Here's my LinkedIn profile: ${normalizedUrl}`)
  }, [linkedinUrl, linkedinValidation.isValid, sendMessage])

  const beginEditMessage = useCallback((message: ChatMessage) => {
    setEditingMessageId(message.id)
    setEditingText(message.content)
  }, [])

  const cancelEditMessage = useCallback(() => {
    setEditingMessageId(null)
    setEditingText("")
  }, [])

  const saveEditedMessage = useCallback(async () => {
    if (!editingMessageId) return
    if (!session?.access_token) return
    if (isLoading || isStreaming) return

    const trimmed = editingText.trim()
    if (!trimmed) return

    const editedIndex = messages.findIndex((m) => m.id === editingMessageId)
    if (editedIndex === -1) return

    const original = messages[editedIndex]
    if (original.role !== "user") return

    const historyBefore = messages.slice(0, editedIndex)
    const updatedUserMessage: ChatMessage = {
      ...original,
      content: trimmed,
    }

    const conversationHistory = historyBefore
      .filter((m) => !m.toolCall)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }))

    // Immediately update UI to show edited message and remove following messages
    const messagesWithEdit = [...historyBefore, updatedUserMessage]
    setMessages(messagesWithEdit)
    setEditingMessageId(null)
    setEditingText("")
    setIsLoading(true)
    setError(null)

    // Reset collected data since we're replaying from the edit point
    const resetData = initialCollectedData
    setCollectedData(resetData)

    try {
      const response = await fetch("/api/v1/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory,
          collectedData: resetData,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error?.message || "Failed to update message")
      }

      const contentType = response.headers.get("content-type")

      if (contentType?.includes("text/event-stream")) {
        await processStreamResponse(response, messagesWithEdit, resetData, hasStarted)
      } else {
        // Fallback for non-streaming response
        const data = await response.json()

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: data.message,
        }

        const nextMessages = [...messagesWithEdit, assistantMessage]
        setMessages(nextMessages)

        const nextCollectedData: CollectedData = data.collectedData ?? resetData
        setCollectedData(nextCollectedData)


        saveProgress(nextMessages, nextCollectedData, hasStarted)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update message")
    } finally {
      setIsLoading(false)
    }
  }, [
    editingMessageId,
    editingText,
    hasStarted,
    isLoading,
    isStreaming,
    messages,
    collectedData,
    processStreamResponse,
    saveProgress,
    session?.access_token,
  ])

  // Handle form submission
  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!hasStarted) {
        return
      }

      if (message.text) {
        sendMessage(message.text)
      }
    },
    [hasStarted, sendMessage]
  )

  // Focus textarea when started
  useEffect(() => {
    if (hasStarted && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [hasStarted, isLoading])

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
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Focus mode scrim — full page blur, input elevated above */}
      <AnimatePresence>
        {showFocus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-30"
            style={{ backgroundColor: `rgba(0, 0, 0, ${opacity / 100})` }}
            onClick={() => {
              setShowFocus(false)
              textareaRef.current?.focus()
            }}
          />
        )}
      </AnimatePresence>

      {/* LinkedIn URL Dialog (BETA) */}
      <Dialog open={linkedinDialogOpen} onOpenChange={setLinkedinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Linkedin className="size-5 text-[#0A66C2]" />
              Import from LinkedIn
            </DialogTitle>
            <DialogDescription>
              Enter your LinkedIn profile URL to import your professional information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="linkedin-url">Profile URL</Label>
              <Input
                id="linkedin-url"
                type="url"
                placeholder="https://linkedin.com/in/yourprofile"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && linkedinValidation.isValid) {
                    e.preventDefault()
                    handleLinkedinSubmit()
                  }
                }}
                className={linkedinValidation.error ? "border-red-500 focus-visible:ring-red-500/20" : ""}
                autoFocus
              />
            </div>
            {linkedinValidation.error && (
              <p className="text-sm text-red-500">{linkedinValidation.error}</p>
            )}
            {linkedinUrl.trim() && linkedinValidation.isValid && (
              <p className="text-sm text-green-600 flex items-center gap-1.5">
                <CheckCircle className="size-3.5" />
                Valid LinkedIn profile URL
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setLinkedinDialogOpen(false)
                setLinkedinUrl("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkedinSubmit}
              disabled={!linkedinValidation.isValid}
              className="gap-2"
            >
              <Check className="size-4" />
              Import Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence mode="wait">
        {!hasStarted ? (
          // Welcome state — full-screen centered with staggered entrance
          <motion.div
            key="welcome"
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35 }}
            className="flex flex-1 flex-col items-center justify-center p-6 min-h-0"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6"
            >
              <div className="inline-flex items-center justify-center rounded-2xl bg-primary/5 p-5 ring-1 ring-primary/10">
                <Image
                  src="/favicon.svg"
                  alt="HireMePlz"
                  width={56}
                  height={56}
                  className="h-10 w-10"
                />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-center text-3xl font-semibold tracking-tight sm:text-4xl"
              suppressHydrationWarning
            >
              Welcome, {firstName}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-3 max-w-sm text-center text-base text-muted-foreground"
            >
              Our AI agent will build your freelance profile in just a few minutes.
            </motion.p>

            {/* Button */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8"
            >
              <Button
                size="lg"
                className="gap-2 px-10 py-6 text-base shadow-[0_0_20px_oklch(from_var(--primary)_l_c_h_/_0.15)] transition-shadow hover:shadow-[0_0_30px_oklch(from_var(--primary)_l_c_h_/_0.25)]"
                onClick={startConversation}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Starting...
                  </>
                ) : (
                  "Get Started"
                )}
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          // Chat state - messages + input at bottom
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
                  <Message
                    key={message.id}
                    from={message.role}
                    hideAvatar
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
                                disabled={isLoading || isStreaming}
                              />
                              <div className="mt-2 flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditMessage}
                                  disabled={isLoading || isStreaming}
                                >
                                  <X className="size-4" />
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={saveEditedMessage}
                                  disabled={isLoading || isStreaming || !editingText.trim()}
                                >
                                  <Check className="size-4" />
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="group relative flex items-center gap-2">
                              {!isLoading && !isStreaming && voiceRecording.status === "idle" && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => beginEditMessage(message)}
                                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                  <Pencil className="size-4" />
                                </Button>
                              )}
                              <MessageBubble variant="user" className="text-base">
                                {message.content}
                              </MessageBubble>
                            </div>
                          )}
                        </div>
                      ) : message.toolCall ? (
                        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/80 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm">
                          {message.toolCall.status === "completed" ? (
                            <CheckCircle className="size-3.5 text-green-500" />
                          ) : message.toolCall.status === "aborted" ? (
                            <OctagonX className="size-3.5 text-orange-500" />
                          ) : (
                            <XCircle className="size-3.5 text-red-500" />
                          )}
                          <span>
                            {message.toolCall.status === "aborted" ? "Stopped" : "Fetched"} LinkedIn profile
                            {message.toolCall.elapsed
                              ? ` (${message.toolCall.elapsed}s)`
                              : ""}
                          </span>
                        </div>
                      ) : message.profileAnalysis ? (
                        <div className="space-y-4">
                          {message.reasoning && (
                            <Reasoning
                              isStreaming={false}
                              content={message.reasoning.content}
                              duration={message.reasoning.duration}
                            />
                          )}
                          {message.profileAnalysis.categories ? (
                            <>
                              <ProfileAnalysisResults
                                analysis={message.profileAnalysis}
                              />
                              <div className="prose prose-base prose-invert max-w-none text-foreground prose-headings:text-white prose-strong:text-white">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {message.profileAnalysis.detailedFeedback}
                                </ReactMarkdown>
                              </div>
                            </>
                          ) : (
                            <>
                              {message.profileAnalysis.score != null && (
                                <ProfileScoreCard
                                  score={message.profileAnalysis.score}
                                  title={message.profileAnalysis.title ?? "Profile Analysis"}
                                  summary={message.profileAnalysis.summary ?? ""}
                                />
                              )}
                              <div className="prose prose-base prose-invert max-w-none text-foreground prose-headings:text-white prose-strong:text-white">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {message.content || message.profileAnalysis.analysis || ""}
                                </ReactMarkdown>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="max-w-none whitespace-pre-wrap text-base text-foreground">
                          {message.content}
                        </div>
                      )}
                    </MessageContent>
                  </Message>
                ))}

                {/* Streaming message display */}
                {isStreaming && streamingContent && (
                  <Message from="assistant" hideAvatar>
                    <MessageContent>
                      <div className="max-w-none whitespace-pre-wrap text-base text-foreground">
                        {streamingContent}
                        <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-foreground/50" />
                      </div>
                    </MessageContent>
                  </Message>
                )}

                {/* Live tool call badge (e.g. LinkedIn scrape in progress) */}
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

                {/* Live reasoning display during profile analysis */}
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

                {(isLoading && !isStreaming) && (
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
                        startConversation()
                      }
                    }}
                  />
                )}

                {/* Finish onboarding — shown after profile analysis */}
                {messages.some((m) => m.profileAnalysis) && !isLoading && !isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center gap-3 pt-4 pb-8"
                  >
                    <Button
                      size="lg"
                      onClick={() => onComplete ? onComplete() : router.push("/overview")}
                      className="gap-2 px-8 py-5 text-base"
                    >
                      <CheckCircle className="size-5" />
                      Finish Onboarding
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      You can find your analysis and insights in the Profile tab
                    </p>
                  </motion.div>
                )}

              </ConversationContent>
            </Conversation>

            {/* Input area wrapper — elevated above focus scrim */}
            <div
              ref={inputAreaRef}
              className={`relative z-40 shrink-0 transition-all duration-150 ${showFocus ? "mx-auto w-[calc(100%-2rem)] max-w-3xl mb-4 rounded-2xl p-6" : ""}`}
            >
            <div className={showFocus ? "" : "bg-background px-4 pb-6 pt-4"}>
              {/* Quick reply badges — hidden during voice mode */}
              {hasStarted && voiceRecording.status === "idle" && !isLoading && !isStreaming && suggestedReplies.length > 0 && editingMessageId === null && (
                <div className="mx-auto max-w-3xl pb-2">
                  <div className="flex flex-wrap gap-2">
                    {suggestedReplies.map((reply) => {
                      const isLinkedinBadge = reply === "Add my LinkedIn"
                      return (
                        <button
                          key={reply}
                          type="button"
                          onClick={() => {
                            setShowFocus(false)
                            if (isLinkedinBadge && linkedinPopupEnabled) {
                              setLinkedinDialogOpen(true)
                            } else {
                              sendMessage(reply)
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-all duration-150 hover:border-primary/30 hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
                        >
                          {isLinkedinBadge && <Linkedin className="size-3.5" />}
                          {reply}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Input area: swap between text input and voice bar */}
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
                            onChange={(e) => {
                              setInput(e.target.value)
                              setShowFocus(false)
                            }}
                            onFocus={() => setShowFocus(false)}
                            placeholder="Type your response..."
                            disabled={editingMessageId !== null}
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
                              onClick={stopGeneration}
                              className="bg-accent text-accent-foreground hover:bg-accent/90"
                            >
                              <Square className="size-4 fill-current" />
                            </PromptInputSubmit>
                          ) : (
                            <PromptInputSubmit
                              className="bg-accent text-accent-foreground hover:bg-accent/90"
                              disabled={editingMessageId !== null || !input.trim()}
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
        )}
      </AnimatePresence>
    </div>
  )
}
