"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useSession } from "@/app/auth/session-provider"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import type { CollectedData } from "@/lib/onboarding/schema"
import { isSkipped } from "@/lib/onboarding/schema"

type AnalysisResultsProps = {
  collectedData: CollectedData
  onComplete?: () => void
}

export function FinishOnboarding({ collectedData, onComplete }: AnalysisResultsProps) {
  const { session } = useSession()
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-3 pt-4 pb-8"
    >
      <Button
        size="lg"
        onClick={async () => {
          if (onComplete) {
            onComplete()
            return
          }
          try {
            const payload: Record<string, unknown> = {}
            if (collectedData.fullName) payload.fullName = collectedData.fullName
            if (collectedData.teamMode) payload.team = { mode: collectedData.teamMode }
            if (collectedData.profilePath) payload.path = collectedData.profilePath
            if (collectedData.linkedinUrl && !isSkipped(collectedData.linkedinUrl)) payload.profileSetup = { linkedinUrl: collectedData.linkedinUrl }
            if (collectedData.experienceLevel && !isSkipped(collectedData.experienceLevel)) payload.experienceLevel = collectedData.experienceLevel
            if (collectedData.skills && !isSkipped(collectedData.skills) && collectedData.skills.length > 0) payload.skills = collectedData.skills
            if (collectedData.experiences && !isSkipped(collectedData.experiences) && collectedData.experiences.length > 0) payload.experiences = collectedData.experiences
            if (collectedData.educations && !isSkipped(collectedData.educations) && collectedData.educations.length > 0) payload.educations = collectedData.educations
            const hasRates = (!isSkipped(collectedData.dreamRateMin) && collectedData.dreamRateMin != null) || (!isSkipped(collectedData.currentRateMin) && collectedData.currentRateMin != null)
            const hasEngagement = collectedData.engagementTypes && !isSkipped(collectedData.engagementTypes)
            if (collectedData.currency || hasRates || hasEngagement) {
              payload.preferences = {
                currency: collectedData.currency ?? "USD",
                hourlyMin: isSkipped(collectedData.dreamRateMin) ? undefined : collectedData.dreamRateMin,
                hourlyMax: isSkipped(collectedData.dreamRateMax) ? undefined : collectedData.dreamRateMax,
                currentHourlyMin: isSkipped(collectedData.currentRateMin) ? undefined : collectedData.currentRateMin,
                currentHourlyMax: isSkipped(collectedData.currentRateMax) ? undefined : collectedData.currentRateMax,
                engagementTypes: isSkipped(collectedData.engagementTypes) ? undefined : collectedData.engagementTypes,
              }
            }
            await fetch("/api/v1/onboarding", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify(payload),
            })
          } catch {
            // Best-effort — navigate regardless
          }
          router.push("/analysis")
        }}
        className="gap-2 px-8 py-5 text-base"
      >
        <CheckCircle className="size-5 text-success" />
        Finish Onboarding
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        You can find your analysis and insights in the Profile tab
      </p>
    </motion.div>
  )
}
