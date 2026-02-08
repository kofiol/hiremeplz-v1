"use client"

import { useMemo } from "react"
import { ONBOARDING_STEPS } from "@/lib/onboarding/constants"
import { isStepComplete } from "@/lib/onboarding/data-status"
import type { CollectedData } from "@/lib/onboarding/schema"

type StepIndicatorProps = {
  collectedData: CollectedData
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
