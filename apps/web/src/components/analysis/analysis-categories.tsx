"use client"

import { Brain, Briefcase, DollarSign, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CategoryBar } from "@/components/ui/score-indicator"

type Categories = {
  skillsBreadth: number
  experienceQuality: number
  ratePositioning: number
  marketReadiness: number
}

type AnalysisCategoriesProps = {
  categories: Categories
}

const categoryConfig = {
  skillsBreadth: {
    label: "Skills & Expertise",
    icon: Brain,
    color: "from-blue-500 to-cyan-500",
  },
  experienceQuality: {
    label: "Experience Quality",
    icon: Briefcase,
    color: "from-purple-500 to-pink-500",
  },
  ratePositioning: {
    label: "Rate Positioning",
    icon: DollarSign,
    color: "from-amber-500 to-orange-500",
  },
  marketReadiness: {
    label: "Market Readiness",
    icon: TrendingUp,
    color: "from-emerald-500 to-teal-500",
  },
} as const

export function AnalysisCategories({ categories }: AnalysisCategoriesProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">Category Breakdown</h2>
        {(
          Object.entries(categoryConfig) as [
            keyof typeof categoryConfig,
            (typeof categoryConfig)[keyof typeof categoryConfig],
          ][]
        ).map(([key, config]) => (
          <CategoryBar
            key={key}
            label={config.label}
            score={categories[key]}
            icon={config.icon}
            colorClass={config.color}
          />
        ))}
      </CardContent>
    </Card>
  )
}
