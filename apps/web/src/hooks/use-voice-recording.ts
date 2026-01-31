"use client"

import { useCallback, useRef, useState } from "react"

// ============================================================================
// Types
// ============================================================================

export type RecordingStatus = "idle" | "recording" | "transcribing"

type UseVoiceRecordingOptions = {
  accessToken: string | null
  onTranscript: (text: string) => void
  onError: (error: string) => void
}

type UseVoiceRecordingReturn = {
  status: RecordingStatus
  start: () => Promise<void>
  stop: () => void
  isSupported: boolean
  elapsed: number
  audioLevel: number // 0–1 normalized RMS from mic
}

// ============================================================================
// Hook
// ============================================================================

export function useVoiceRecording(options: UseVoiceRecordingOptions): UseVoiceRecordingReturn {
  const { accessToken, onTranscript, onError } = options

  const [status, setStatus] = useState<RecordingStatus>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)

  // Stable callback refs
  const onTranscriptRef = useRef(onTranscript)
  const onErrorRef = useRef(onError)
  onTranscriptRef.current = onTranscript
  onErrorRef.current = onError

  const isSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined"

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
      analyserRef.current = null
    }

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop() } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null

    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    chunksRef.current = []
    setElapsed(0)
    setAudioLevel(0)
  }, [])

  const start = useCallback(async () => {
    if (status !== "idle") return

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        onErrorRef.current("Voice recording requires HTTPS or localhost.")
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        chunksRef.current = []

        // Stop mic
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null

        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        if (blob.size < 1000) {
          // Too short / empty
          setStatus("idle")
          setElapsed(0)
          return
        }

        // Transcribe
        setStatus("transcribing")
        try {
          const formData = new FormData()
          formData.append("file", blob, "recording.webm")

          const res = await fetch("/api/v1/onboarding/transcribe", {
            method: "POST",
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            body: formData,
          })

          if (!res.ok) {
            const err = await res.json().catch(() => null)
            throw new Error(err?.error?.message ?? "Transcription failed")
          }

          const data = await res.json()
          const text = (data.text ?? "").trim()

          if (text) {
            onTranscriptRef.current(text)
          }
        } catch (err) {
          onErrorRef.current(err instanceof Error ? err.message : "Transcription failed")
        } finally {
          setStatus("idle")
          setElapsed(0)
        }
      }

      recorder.start(250) // Collect chunks every 250ms
      setStatus("recording")
      setElapsed(0)

      // Audio level monitoring via AnalyserNode
      try {
        const audioCtx = new AudioContext()
        audioContextRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.4
        source.connect(analyser)
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const sampleLevel = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)
          // RMS of frequency bins, normalized to 0–1
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 255
            sum += v * v
          }
          const rms = Math.sqrt(sum / dataArray.length)
          setAudioLevel(rms)
          rafRef.current = requestAnimationFrame(sampleLevel)
        }
        rafRef.current = requestAnimationFrame(sampleLevel)
      } catch {
        // AudioContext not available — bars will stay static
      }

      // Timer for elapsed display
      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } catch {
      cleanup()
      setStatus("idle")
      onErrorRef.current("Microphone access denied. Please allow mic access and try again.")
    }
  }, [status, accessToken, cleanup])

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === "recording") {
      recorder.stop() // Triggers onstop → transcription
    } else {
      cleanup()
      setStatus("idle")
    }
  }, [cleanup])

  return {
    status,
    start,
    stop,
    isSupported,
    elapsed,
    audioLevel,
  }
}
