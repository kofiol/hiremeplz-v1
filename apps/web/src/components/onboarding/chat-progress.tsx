"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ONBOARDING_STEPS } from "@/lib/onboarding/constants"
import type { CollectedData } from "@/lib/onboarding/schema"

type ChatProgressProps = {
  collectedData: CollectedData
}

function isStepComplete(key: string, data: CollectedData): boolean {
  switch (key) {
    case "fullName":
      return !!data.fullName
    case "experienceLevel":
      return !!data.experienceLevel
    case "skills":
      return !!data.skills && data.skills.length > 0
    case "experiences":
      return !!data.experiences && data.experiences.length > 0
    case "educations":
      return !!data.educations && data.educations.length > 0
    case "currentRate":
      return data.currentRateMin != null || data.currentRateMax != null
    case "dreamRate":
      return data.dreamRateMin != null || data.dreamRateMax != null
    case "engagementTypes":
      return !!data.engagementTypes && data.engagementTypes.length > 0
    case "linkedinUrl":
      return !!data.linkedinUrl
    default:
      return false
  }
}

function getCurrentStepLabel(data: CollectedData): string | null {
  for (const step of ONBOARDING_STEPS) {
    if (!isStepComplete(step.key, data)) return step.label
  }
  return null
}

export function ChatProgress({ collectedData }: ChatProgressProps) {
  const completedCount = useMemo(
    () => ONBOARDING_STEPS.filter((s) => isStepComplete(s.key, collectedData)).length,
    [collectedData]
  )

  const currentLabel = useMemo(() => getCurrentStepLabel(collectedData), [collectedData])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-3 rounded-full border border-border/40 bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm"
      >
        {currentLabel && (
          <span className="shrink-0 font-medium text-foreground/70">
            {currentLabel}
          </span>
        )}
        <div className="flex gap-0.5">
          {ONBOARDING_STEPS.map((step) => {
            const complete = isStepComplete(step.key, collectedData)
            return (
              <div
                key={step.key}
                className={`h-1 w-4 rounded-full transition-colors duration-300 ${
                  complete ? "bg-primary" : "bg-muted"
                }`}
                title={step.label}
              />
            )
          })}
        </div>
        <span className="shrink-0 tabular-nums">
          {completedCount}/{ONBOARDING_STEPS.length}
        </span>
      </motion.div>
    </AnimatePresence>
  )
}
