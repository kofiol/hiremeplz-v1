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

  const lastAssistant = [...messages].reverse().find(
    (m) => m.role === "assistant" && m.content && !m.toolCall && !m.profileAnalysis
  )
  const lastText = lastAssistant?.content.toLowerCase() ?? ""

  // Keyword-based detection from last assistant message
  if (lastText.includes("your name") || lastText.includes("name is")) return []
  if (lastText.includes("skill") || lastText.includes("technologies") || lastText.includes("stack")) return []
  if (lastText.includes("experience level")) return ["Entry level", "Mid level", "Senior", "Lead"]
  if (lastText.includes("full-time") && lastText.includes("part-time")) return ["Full-time", "Part-time", "Both"]
  if (lastText.includes("dream") && lastText.includes("rate")) return ["$50-100/hr", "$100-200/hr", "$200-300/hr", "$300+/hr"]
  if (lastText.includes("current") && lastText.includes("rate")) return ["$30-50/hr", "$50-100/hr", "$100-150/hr", "$150+/hr"]
  if (lastText.includes("linkedin")) return ["Add my LinkedIn", "Skip, analyze my profile"]

  // Data-driven fallback
  if (data.fullName === null) return []
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
