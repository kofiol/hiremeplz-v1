"use client"

import * as React from "react"
import { Brain } from "lucide-react"
import { cn } from "@/lib/utils"

type ReasoningProps = {
  isStreaming: boolean
  content: string
  duration?: number
  className?: string
}

/**
 * Minimal reasoning display - only shows elapsed time, no content details.
 * Shows "Thinking..." while streaming, "Thought for Xs" after completion.
 */
function Reasoning({ isStreaming, duration, className }: ReasoningProps) {
  if (!isStreaming && !duration) {
    return null
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Header - larger and cleaner */}
      <div className="flex items-center gap-2.5 px-2 py-2 text-sm">
        <div className="relative flex items-center justify-center">
          <Brain className="size-4 text-muted-foreground" />
          {isStreaming && (
            <span className="absolute inset-0 animate-ping">
              <Brain className="size-4 text-primary/50" />
            </span>
          )}
        </div>
        <span className="text-muted-foreground">
          {isStreaming ? (
            <span className="shimmer-text">Thinking...</span>
          ) : duration ? (
            `Thought for ${duration}s`
          ) : (
            "Reasoning"
          )}
        </span>
      </div>
    </div>
  )
}

export { Reasoning }
