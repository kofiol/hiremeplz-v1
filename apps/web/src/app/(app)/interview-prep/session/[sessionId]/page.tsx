"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "@/app/auth/session-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Mic,
  MicOff,
  PhoneOff,
  Clock,
  Radio,
  Sparkles,
  Loader2,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  Message,
  MessageBubble,
} from "@/components/ai-elements/message"
import {
  type InterviewType,
  interviewTypeLabels,
  buildInterviewInstructions,
} from "@/lib/agents/interview-agent"

type TranscriptEntry = {
  id: string
  role: "user" | "assistant"
  text: string
  timestamp: string
  isFinal: boolean
}

let entryIdCounter = 0
function nextEntryId() {
  return `entry-${++entryIdCounter}`
}

type SessionStatus = "connecting" | "connected" | "disconnected" | "error"

const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "actually", "literally", "honestly", "right"]

function countFillerWords(text: string): number {
  const lower = text.toLowerCase()
  let count = 0
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, "gi")
    const matches = lower.match(regex)
    if (matches) count += matches.length
  }
  return count
}

export default function InterviewSessionPage() {
  const { session: authSession, isLoading: authLoading } = useSession()
  const router = useRouter()
  const { sessionId } = useParams<{ sessionId: string }>()

  // Session state
  const [status, setStatus] = useState<SessionStatus>("connecting")
  const [interviewType, setInterviewType] = useState<InterviewType>("client_discovery")
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  // Metrics
  const metricsRef = useRef({
    thinkingPauses: [] as number[],
    responseDurations: [] as number[],
    fillerWordCount: 0,
    questionCount: 0,
    startTime: 0,
  })
  const agentFinishedSpeakingAt = useRef<number>(0)
  const userStartedSpeakingAt = useRef<number>(0)

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)

  // End interview ref (stable reference for callback)
  const handleEndRef = useRef<() => void>(() => {})

  // Track current user speech placeholder
  const userPlaceholderIdRef = useRef<string | null>(null)

  // Audio visualization
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript])

  // Timer
  useEffect(() => {
    if (status === "connected") {
      metricsRef.current.startTime = Date.now()
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  // Audio visualizer
  useEffect(() => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    function draw() {
      if (!ctx || !canvas) return
      animFrameRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8

        const hue = (i / bufferLength) * 60 + 200
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`

        const y = canvas.height / 2 - barHeight / 2
        ctx.fillRect(x, y, barWidth - 1, barHeight)

        x += barWidth
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [status])

  const handleDataChannelMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data)

        switch (msg.type) {
          case "input_audio_buffer.speech_started": {
            setUserSpeaking(true)
            userStartedSpeakingAt.current = Date.now()
            // Track reaction time
            if (agentFinishedSpeakingAt.current > 0) {
              const thinkingPause =
                Date.now() - agentFinishedSpeakingAt.current
              metricsRef.current.thinkingPauses.push(thinkingPause)
              agentFinishedSpeakingAt.current = 0
            }
            // Insert placeholder to preserve chronological order
            const placeholderId = nextEntryId()
            userPlaceholderIdRef.current = placeholderId
            setTranscript((prev) => [
              ...prev,
              {
                id: placeholderId,
                role: "user" as const,
                text: "",
                timestamp: new Date().toISOString(),
                isFinal: false,
              },
            ])
            break
          }

          case "input_audio_buffer.speech_stopped":
            setUserSpeaking(false)
            if (userStartedSpeakingAt.current > 0) {
              const duration = Date.now() - userStartedSpeakingAt.current
              metricsRef.current.responseDurations.push(duration)
              userStartedSpeakingAt.current = 0
            }
            break

          case "conversation.item.input_audio_transcription.completed":
            if (msg.transcript) {
              metricsRef.current.fillerWordCount += countFillerWords(
                msg.transcript
              )
              const targetId = userPlaceholderIdRef.current
              userPlaceholderIdRef.current = null
              setTranscript((prev) => {
                // Find the placeholder and fill it with the transcription
                if (targetId) {
                  const idx = prev.findIndex((e) => e.id === targetId)
                  if (idx !== -1) {
                    const updated = [...prev]
                    updated[idx] = {
                      ...updated[idx],
                      text: msg.transcript,
                      isFinal: true,
                    }
                    return updated
                  }
                }
                // Fallback: append if no placeholder found
                return [
                  ...prev,
                  {
                    id: nextEntryId(),
                    role: "user" as const,
                    text: msg.transcript,
                    timestamp: new Date().toISOString(),
                    isFinal: true,
                  },
                ]
              })
            }
            break

          case "response.audio_transcript.delta":
            setAgentSpeaking(true)
            setTranscript((prev) => {
              const last = prev[prev.length - 1]
              if (last && last.role === "assistant" && !last.isFinal) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + msg.delta },
                ]
              }
              return [
                ...prev,
                {
                  id: nextEntryId(),
                  role: "assistant" as const,
                  text: msg.delta,
                  timestamp: new Date().toISOString(),
                  isFinal: false,
                },
              ]
            })
            break

          case "response.audio_transcript.done":
            setAgentSpeaking(false)
            agentFinishedSpeakingAt.current = Date.now()
            metricsRef.current.questionCount++
            setTranscript((prev) => {
              if (prev.length === 0) return prev
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                isFinal: true,
              }
              return updated
            })

            // Detect end of interview from the just-completed assistant message
            if (
              msg.transcript &&
              msg.transcript
                .toLowerCase()
                .includes("thanks for your time")
            ) {
              handleEndRef.current()
            }
            break
        }
      } catch {
        // ignore parse errors
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Connect to realtime
  useEffect(() => {
    if (authLoading || !authSession || !sessionId) return

    let cancelled = false

    async function connect() {
      try {
        // 1. Fetch existing session to get interview type
        const sessionRes = await fetch(
          `/api/v1/interview-prep/${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${authSession!.access_token}`,
            },
          }
        )
        if (!sessionRes.ok) {
          const errData = await sessionRes.json().catch(() => ({}))
          throw new Error(
            `Session not found: ${errData?.error?.message ?? sessionRes.status}`
          )
        }
        const sessionData = await sessionRes.json()

        if (cancelled) return
        setInterviewType(sessionData.interview_type as InterviewType)

        // 2. Get ephemeral key (token-only endpoint, no duplicate session)
        const tokenRes = await fetch("/api/v1/interview-prep/token", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authSession!.access_token}`,
          },
        })
        if (!tokenRes.ok) {
          const errData = await tokenRes.json().catch(() => ({}))
          throw new Error(
            `Ephemeral key failed: ${errData?.error?.message ?? errData?.error?.details ?? tokenRes.status}`
          )
        }
        const tokenData = await tokenRes.json()
        const clientSecret = tokenData.clientSecret

        if (!clientSecret) {
          throw new Error("No client secret returned from token endpoint")
        }

        // 3. Fetch profile for agent instructions
        const meRes = await fetch("/api/v1/me", {
          headers: {
            Authorization: `Bearer ${authSession!.access_token}`,
          },
        })
        const meData = await meRes.json()

        const instructions = buildInterviewInstructions(
          sessionData.interview_type as InterviewType,
          {
            name: meData.display_name ?? "Freelancer",
            headline: "",
            skills: [],
            experiences: [],
          },
          sessionData.context
        )

        // 4. Get mic
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Microphone access requires a secure context (HTTPS or localhost). " +
              `Current origin: ${window.location.origin}`
          )
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        audioStreamRef.current = stream

        // 5. Create peer connection
        const pc = new RTCPeerConnection()
        pcRef.current = pc

        // Hidden audio element for agent voice
        const audioEl = document.createElement("audio")
        audioEl.autoplay = true
        audioElRef.current = audioEl

        pc.ontrack = (event) => {
          audioEl.srcObject = event.streams[0]

          // Setup analyser for visualizer
          try {
            const audioCtx = new AudioContext()
            const src = audioCtx.createMediaStreamSource(event.streams[0])
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 256
            src.connect(analyser)
            analyserRef.current = analyser
          } catch {
            // non-critical
          }
        }

        // Data channel
        const dc = pc.createDataChannel("response")
        dcRef.current = dc

        dc.onopen = () => {
          // Configure session
          dc.send(
            JSON.stringify({
              type: "session.update",
              session: {
                modalities: ["text", "audio"],
                instructions,
                input_audio_transcription: { model: "whisper-1" },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.8,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 700,
                  create_response: true,
                },
              },
            })
          )

          // Send initial greeting trigger
          dc.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: "Hi, nice to meet you.",
                  },
                ],
              },
            })
          )
          dc.send(JSON.stringify({ type: "response.create" }))

          if (!cancelled) {
            setStatus("connected")
            // Mark session as active
            fetch(`/api/v1/interview-prep/${sessionId}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${authSession!.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: "active",
                started_at: new Date().toISOString(),
              }),
            })
          }
        }

        dc.onmessage = handleDataChannelMessage

        // Add mic track
        pc.addTrack(stream.getTracks()[0])

        // 6. Create SDP offer
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        // 7. Exchange SDP with OpenAI Realtime
        const sdpResponse = await fetch(
          "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-03&voice=alloy",
          {
            method: "POST",
            body: offer.sdp,
            headers: {
              Authorization: `Bearer ${clientSecret}`,
              "Content-Type": "application/sdp",
            },
          }
        )

        if (!sdpResponse.ok) {
          const errText = await sdpResponse.text()
          throw new Error(
            `SDP exchange failed (${sdpResponse.status}): ${errText.slice(0, 200)}`
          )
        }

        const answerSdp = await sdpResponse.text()
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp })
      } catch (err) {
        console.error("Connection error:", err)
        if (!cancelled) {
          setErrorDetail(
            err instanceof Error ? err.message : "Unknown connection error"
          )
          setStatus("error")
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, authSession, sessionId])

  function cleanup() {
    if (dcRef.current) {
      dcRef.current.close()
      dcRef.current = null
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop())
      audioStreamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    cancelAnimationFrame(animFrameRef.current)
  }

  async function handleEndInterview() {
    if (isEnding) return
    setIsEnding(true)
    cleanup()
    setStatus("disconnected")

    if (!authSession) return

    // Save transcript + metrics
    const metrics = {
      thinkingPauses: metricsRef.current.thinkingPauses,
      responseDurations: metricsRef.current.responseDurations,
      fillerWordCount: metricsRef.current.fillerWordCount,
      totalDuration: Date.now() - metricsRef.current.startTime,
      questionCount: metricsRef.current.questionCount,
    }

    try {
      await fetch(`/api/v1/interview-prep/${sessionId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: transcript.filter((t) => t.isFinal),
          metrics,
          finished_at: new Date().toISOString(),
        }),
      })

      // Trigger analysis
      await fetch("/api/v1/interview-prep/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      })
    } catch (err) {
      console.error("Error saving session:", err)
    }

    router.push(`/interview-prep/results/${sessionId}`)
  }

  // Keep ref in sync so the stable callback can call it
  handleEndRef.current = handleEndInterview

  function toggleMute() {
    if (audioStreamRef.current) {
      const track = audioStreamRef.current.getAudioTracks()[0]
      if (track) {
        track.enabled = !track.enabled
        setIsMuted(!track.enabled)
      }
    }
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const questionCount = transcript.filter(
    (t) => t.role === "assistant" && t.isFinal
  ).length

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            <Sparkles className="mr-1 size-3" />
            BETA
          </Badge>
          <span className="text-sm font-medium">
            {interviewTypeLabels[interviewType]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            {formatTime(elapsedTime)}
          </div>
          {questionCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              Q{questionCount}
            </Badge>
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "size-2 rounded-full",
                status === "connected"
                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                  : status === "connecting"
                    ? "animate-pulse bg-amber-500"
                    : "bg-red-500"
              )}
            />
            <span className="text-xs text-muted-foreground capitalize">
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden px-4">
        {status === "connecting" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="interview-orb interview-orb-connecting">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
            <div>
              <p className="font-medium">Connecting to interviewer...</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Please allow microphone access when prompted
              </p>
            </div>
          </div>
        )}

        {status === "connected" && (
          <>
            {/* Orb visualizer */}
            <div className="relative">
              <div
                className={cn(
                  "interview-orb",
                  agentSpeaking && "interview-orb-speaking",
                  userSpeaking && "interview-orb-listening"
                )}
              >
                <canvas
                  ref={canvasRef}
                  width={200}
                  height={200}
                  className="rounded-full"
                />
              </div>
              {/* Pulse rings */}
              {(agentSpeaking || userSpeaking) && (
                <>
                  <div className="interview-pulse-ring interview-pulse-ring-1" />
                  <div className="interview-pulse-ring interview-pulse-ring-2" />
                  <div className="interview-pulse-ring interview-pulse-ring-3" />
                </>
              )}
            </div>

            {/* Status text */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {agentSpeaking ? (
                  <span className="flex items-center gap-2">
                    <Radio className="size-3.5 animate-pulse text-primary" />
                    Interviewer speaking...
                  </span>
                ) : userSpeaking ? (
                  <span className="flex items-center gap-2">
                    <Mic className="size-3.5 text-emerald-500" />
                    Listening to your answer...
                  </span>
                ) : (
                  "Waiting for response..."
                )}
              </p>
            </div>

            {/* Transcript (scrollable) */}
            <ScrollArea className="w-full max-w-2xl flex-1 overflow-hidden rounded-xl border border-border/30 bg-card/30 p-4 backdrop-blur-sm">
              {transcript.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Transcript will appear here...
                </p>
              ) : (
                <div className="space-y-4">
                  {transcript
                    .filter((t) => t.text.trim())
                    .map((entry, i, arr) => {
                      const prev = arr[i - 1]
                      const hideAvatar =
                        !!prev && prev.role === entry.role
                      return (
                        <Message
                          key={entry.id}
                          from={entry.role}
                          hideAvatar={hideAvatar}
                        >
                          <MessageBubble variant={entry.role}>
                            {entry.text}
                            {!entry.isFinal && (
                              <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-foreground/50" />
                            )}
                          </MessageBubble>
                        </Message>
                      )
                    })}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </ScrollArea>
          </>
        )}

        {status === "disconnected" && isEnding && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="interview-orb interview-orb-analyzing">
              <Sparkles className="size-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">Analyzing your interview...</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Our AI is reviewing your transcript, scoring your performance,
                and writing personalized feedback.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Processing {transcript.filter((t) => t.isFinal).length} messages
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="interview-orb border-red-500/30 bg-red-500/5">
              <MicOff className="size-8 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-red-500">Connection failed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Please check your microphone and try again.
              </p>
              {errorDetail && (
                <p className="mt-2 max-w-md rounded-md bg-red-500/10 px-3 py-2 text-xs font-mono text-red-400">
                  {errorDetail}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/interview-prep")}
              >
                Back to Interview Prep
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      {status === "connected" && (
        <div className="flex shrink-0 items-center justify-center gap-4 border-t border-border/50 px-4 py-4">
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "size-12 rounded-full",
              isMuted && "border-red-500/50 bg-red-500/10 text-red-500"
            )}
            onClick={toggleMute}
          >
            {isMuted ? (
              <MicOff className="size-5" />
            ) : (
              <Mic className="size-5" />
            )}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            className="rounded-full px-6"
            onClick={handleEndInterview}
            disabled={isEnding}
          >
            {isEnding ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <PhoneOff className="mr-2 size-4" />
                End Interview
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
