"use client"

import { useMemo } from "react"
import { ONBOARDING_STEPS } from "@/lib/onboarding/constants"
import type { CollectedData } from "@/lib/onboarding/schema"

type StepIndicatorProps = {
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

export function StepIndicator({ collectedData }: StepIndicatorProps) {
  const completedCount = useMemo(
    () => ONBOARDING_STEPS.filter((s) => isStepComplete(s.key, collectedData)).length,
    [collectedData]
  )

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Profile Progress</span>
        <span>{completedCount}/{ONBOARDING_STEPS.length}</span>
      </div>
      <div className="flex gap-1">
        {ONBOARDING_STEPS.map((step) => {
          const complete = isStepComplete(step.key, collectedData)
          return (
            <div
              key={step.key}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                complete ? "bg-primary" : "bg-muted"
              }`}
              title={step.label}
            />
          )
        })}
      </div>
    </div>
  )
}
