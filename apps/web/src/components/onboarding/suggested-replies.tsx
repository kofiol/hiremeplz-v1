"use client"

import { useMemo } from "react"
import { Linkedin } from "lucide-react"
import type { CollectedData, ChatMessage } from "@/lib/onboarding/schema"

type SuggestedRepliesProps = {
  collectedData: CollectedData
  messages: ChatMessage[]
  onReply: (text: string) => void
  onLinkedinClick?: () => void
  linkedinPopupEnabled?: boolean
}

function getSuggestedReplies(data: CollectedData, messages: ChatMessage[]): string[] {
  const hasAnalysis = messages.some((m) => m.profileAnalysis)
  if (hasAnalysis) return []
  if (messages.length === 0) return []

  const lastAssistant = [...messages].reverse().find(
    (m) => m.role === "assistant" && m.content && !m.toolCall && !m.profileAnalysis
  )
  const lastText = lastAssistant?.content.toLowerCase() ?? ""
  if (!lastText) return []

  // Keyword-based detection from last assistant message — always takes priority
  if (lastText.includes("your name") || lastText.includes("what's your name") || lastText.includes("full name")) return []
  if (lastText.includes("linkedin")) return ["Add my LinkedIn", "Skip, enter manually"]
  if (lastText.includes("experience level") || lastText.includes("intern") && lastText.includes("senior")) return ["Entry level", "Mid level", "Senior", "Lead"]
  if (lastText.includes("skill") || lastText.includes("technologies") || lastText.includes("stack") || lastText.includes("frameworks")) return []
  if (lastText.includes("full-time") || lastText.includes("part-time") || lastText.includes("commitment") || lastText.includes("engagement")) return ["Full-time", "Part-time", "Both"]
  if (lastText.includes("current") && lastText.includes("rate")) return ["$30-50/hr", "$50-100/hr", "$100-150/hr", "$150+/hr"]
  if (lastText.includes("dream") && lastText.includes("rate")) return ["$50-100/hr", "$100-200/hr", "$200-300/hr", "$300+/hr"]

  return []
}

export function SuggestedReplies({
  collectedData,
  messages,
  onReply,
  onLinkedinClick,
  linkedinPopupEnabled,
}: SuggestedRepliesProps) {
  const replies = useMemo(
    () => getSuggestedReplies(collectedData, messages),
    [collectedData, messages]
  )

  if (replies.length === 0) return null

  return (
    <div className="mx-auto max-w-3xl pb-2">
      <div className="flex flex-wrap gap-2">
        {replies.map((reply) => {
          const isLinkedinBadge = reply === "Add my LinkedIn"
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
