"use client"

import { useMemo } from "react"
import { ArrowUp, LoaderIcon } from "lucide-react"
import type { RecordingStatus } from "@/hooks/use-voice-recording"

// ============================================================================
// Types
// ============================================================================

type OnboardingVoiceBarProps = {
  status: RecordingStatus
  elapsed: number
  audioLevel: number // 0–1 normalized
  onStop: () => void
}

// ============================================================================
// Helpers
// ============================================================================

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

// ============================================================================
// Audio-reactive visualization bars
// ============================================================================

const BAR_COUNT = 24

function VizBars({ level, active }: { level: number; active: boolean }) {
  // Stable per-bar random offsets (generated once)
  const offsets = useMemo(
    () => Array.from({ length: BAR_COUNT }, () => Math.random()),
    []
  )

  return (
    <div className="flex items-center justify-center gap-[2px] h-8">
      {offsets.map((offset, i) => {
        // Create a wave-like distribution from center outward
        const center = (BAR_COUNT - 1) / 2
        const distFromCenter = Math.abs(i - center) / center // 0 at center, 1 at edges
        const centerBoost = 1 - distFromCenter * 0.6

        // Each bar gets a slightly different height based on audio level + its offset
        const barLevel = active
          ? Math.max(0.08, level * centerBoost * (0.6 + offset * 0.8))
          : 0.08

        const height = 4 + barLevel * 28 // min 4px, max 32px

        return (
          <div
            key={i}
            className="rounded-full transition-[height] duration-75 ease-out"
            style={{
              width: 3,
              height,
              backgroundColor: active
                ? `oklch(63% 0.24 29 / ${0.5 + barLevel * 0.5})`
                : "oklch(from var(--muted-foreground) l c h / 0.2)",
            }}
          />
        )
      })}
    </div>
  )
}

// ============================================================================
// Voice Bar Component
// ============================================================================

export function OnboardingVoiceBar({
  status,
  elapsed,
  audioLevel,
  onStop,
}: OnboardingVoiceBarProps) {
  const isRecording = status === "recording"
  const isTranscribing = status === "transcribing"

  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
      {/* Left: status dot + text */}
      <div className="flex items-center gap-2 min-w-0">
        {isRecording && (
          <div className="voice-dot voice-dot-speaking" />
        )}
        {isTranscribing && (
          <LoaderIcon className="size-3.5 animate-spin text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {isRecording && `${formatTime(elapsed)}`}
          {isTranscribing && "Transcribing..."}
        </span>
      </div>

      {/* Center: viz bars */}
      <div className="flex-1 flex justify-center">
        <VizBars level={audioLevel} active={isRecording} />
      </div>

      {/* Right: send button */}
      {isRecording && (
        <button
          type="button"
          onClick={onStop}
          className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          aria-label="Send voice message"
        >
          <ArrowUp className="size-4" />
        </button>
      )}
    </div>
  )
}
