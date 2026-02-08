"use client"

import { ScoreRing } from "@/components/ui/score-indicator"

type AnalysisHeroProps = {
  score: number
  firstName: string
}

function getScoreMessage(score: number): { title: string; subtitle: string } {
  if (score >= 80) {
    return {
      title: "Impressive profile!",
      subtitle: "You're well-positioned to land top freelance opportunities.",
    }
  }
  if (score >= 60) {
    return {
      title: "Looking good!",
      subtitle: "A few tweaks could make your profile even stronger.",
    }
  }
  if (score >= 40) {
    return {
      title: "Solid foundation",
      subtitle: "Let's work on strengthening your profile together.",
    }
  }
  return {
    title: "Great start!",
    subtitle: "We've identified some key areas to focus on.",
  }
}

export function AnalysisHero({ score, firstName }: AnalysisHeroProps) {
  const message = getScoreMessage(score)

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {firstName ? `${message.title}, ${firstName}` : message.title}
        </h1>
        <p className="text-muted-foreground">{message.subtitle}</p>
      </div>
      <ScoreRing score={score} size={180} />
      <p className="text-sm text-muted-foreground">Your Profile Score</p>
    </div>
  )
}
