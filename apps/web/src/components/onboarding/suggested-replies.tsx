"use client"

import { Linkedin } from "lucide-react"

type SuggestedRepliesProps = {
  suggestions: string[]
  onReply: (text: string) => void
  onLinkedinClick?: () => void
  linkedinPopupEnabled?: boolean
}

export function SuggestedReplies({
  suggestions,
  onReply,
  onLinkedinClick,
  linkedinPopupEnabled,
}: SuggestedRepliesProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="mx-auto max-w-3xl pb-2">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((reply) => {
          const isLinkedinBadge = reply.toLowerCase().includes("linkedin") && !reply.toLowerCase().includes("skip")
          return (
            <button
              key={reply}
              type="button"
              onClick={() => {
                if (isLinkedinBadge && linkedinPopupEnabled && onLinkedinClick) {
                  onLinkedinClick()
                } else {
                  onReply(reply)
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
  )
}
