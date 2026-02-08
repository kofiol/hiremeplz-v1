"use client"

import * as React from "react"
import { Brain, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type ReasoningProps = {
  isStreaming: boolean
  content: string
  duration?: number
  phase?: "thinking" | "evaluating"
  className?: string
}

/**
 * Reasoning display with two phases:
 * - "Thinking..." (brain icon, pulsing) while the model reasons
 * - "Evaluating..." (sparkles icon, pulsing) while it generates structured output
 * - "Evaluated in Xs" after completion
 */
function Reasoning({ isStreaming, duration, phase = "thinking", className }: ReasoningProps) {
  if (!isStreaming && !duration) {
    return null
  }

  const isEvaluating = phase === "evaluating"
  const Icon = isEvaluating ? Sparkles : Brain

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-2.5 px-2 py-2 text-sm">
        <div className="relative flex items-center justify-center">
          <Icon className="size-4 text-muted-foreground" />
          {isStreaming && (
            <span className="absolute inset-0 animate-ping">
              <Icon className="size-4 text-primary/50" />
            </span>
          )}
        </div>
        <span className="text-muted-foreground">
          {isStreaming ? (
            <span className="shimmer-text">
              {isEvaluating ? "Evaluating..." : "Thinking..."}
            </span>
          ) : duration ? (
            isEvaluating ? `Evaluated in ${duration}s` : `Thought for ${duration}s`
          ) : (
            "Reasoning"
          )}
        </span>
      </div>
    </div>
  )
}

export { Reasoning }
