"use client"

import { Sparkles } from "lucide-react"

type AnalysisLoadingProps = {
  pollCount: number
}

const ANALYSIS_STEPS = [
  "Gathering your profile data",
  "Evaluating skills & expertise",
  "Analyzing experience quality",
  "Reviewing rate positioning",
  "Generating personalized insights",
]

export function AnalysisLoading({ pollCount }: AnalysisLoadingProps) {
  const activeStep = Math.min(Math.floor(pollCount / 2), ANALYSIS_STEPS.length - 1)

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/10">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <Sparkles className="size-8 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium">Analyzing your profile...</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This usually takes 10-15 seconds
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        {ANALYSIS_STEPS.map((step, i) => (
          <div
            key={step}
            className="flex items-center gap-2.5 text-muted-foreground"
          >
            {i < activeStep ? (
              <div className="flex size-4 items-center justify-center">
                <div className="size-1.5 rounded-full bg-foreground" />
              </div>
            ) : i === activeStep ? (
              <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <div className="flex size-4 items-center justify-center">
                <div className="size-1.5 rounded-full bg-muted-foreground/30" />
              </div>
            )}
            <span className={i <= activeStep ? "text-foreground" : ""}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
