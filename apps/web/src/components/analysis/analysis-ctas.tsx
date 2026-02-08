"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, Wrench, Mic, FileText, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"

type Categories = {
  skillsBreadth: number
  experienceQuality: number
  ratePositioning: number
  marketReadiness: number
}

type AnalysisCTAsProps = {
  categories: Categories
  improvements: string[]
  onContinue: () => void
  isLoading?: boolean
}

type ContextualCTA = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

function getContextualCTAs(categories: Categories, improvements: string[]): ContextualCTA[] {
  const ctas: ContextualCTA[] = []
  const improvementsText = improvements.join(" ").toLowerCase()

  if (categories.skillsBreadth < 50) {
    ctas.push({
      label: "Add more skills",
      href: "/profile",
      icon: Wrench,
    })
  }

  if (categories.experienceQuality < 50) {
    ctas.push({
      label: "Enhance experience",
      href: "/profile",
      icon: FileText,
    })
  }

  if (categories.ratePositioning < 50) {
    ctas.push({
      label: "Review rate strategy",
      href: "/settings/preferences",
      icon: DollarSign,
    })
  }

  if (improvementsText.includes("interview")) {
    ctas.push({
      label: "Practice interviews",
      href: "/interview-prep",
      icon: Mic,
    })
  }

  if (improvementsText.includes("cv") || improvementsText.includes("resume")) {
    ctas.push({
      label: "Build your CV",
      href: "/cv-builder",
      icon: FileText,
    })
  }

  // Limit to 3 contextual CTAs
  return ctas.slice(0, 3)
}

export function AnalysisCTAs({ categories, improvements, onContinue, isLoading }: AnalysisCTAsProps) {
  const router = useRouter()
  const contextualCTAs = getContextualCTAs(categories, improvements)

  return (
    <div className="flex flex-col items-center gap-4">
      {contextualCTAs.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {contextualCTAs.map((cta) => (
            <Button
              key={cta.href}
              variant="outline"
              size="sm"
              onClick={() => router.push(cta.href)}
              className="gap-2"
            >
              <cta.icon className="size-4" />
              {cta.label}
            </Button>
          ))}
        </div>
      )}

      <Button
        size="lg"
        onClick={onContinue}
        disabled={isLoading}
        className="gap-2 px-8"
      >
        {isLoading ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Saving...
          </>
        ) : (
          <>
            Continue to Overview
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        You can revisit your analysis anytime in your Profile
      </p>
    </div>
  )
}
