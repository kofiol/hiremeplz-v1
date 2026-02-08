"use client"

import { TrendingUp, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type AnalysisInsightsProps = {
  strengths: string[]
  improvements: string[]
}

export function AnalysisInsights({ strengths, improvements }: AnalysisInsightsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-emerald-500" />
            Top Strengths
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 size-5 shrink-0 rounded-full bg-emerald-500/20 text-center text-xs font-bold leading-5 text-emerald-500">
                {i + 1}
              </span>
              <span>{s}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-500" />
            Areas to Improve
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {improvements.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 size-5 shrink-0 rounded-full bg-amber-500/20 text-center text-xs font-bold leading-5 text-amber-500">
                {i + 1}
              </span>
              <span>{s}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
