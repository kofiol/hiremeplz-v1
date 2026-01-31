"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import {
  Brain,
  Briefcase,
  DollarSign,
  TrendingUp,
} from "lucide-react"

const DEFAULT_COLORS = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#84cc16", // lime-500
  "#22c55e", // green-500
]

type ScoreIndicatorProps = {
  value: number
  maxValue?: number
  size?: number
  strokeWidth?: number
  className?: string
  showLabel?: boolean
  label?: string
  colors?: string[]
}

export function ScoreIndicator({
  value,
  maxValue = 100,
  size = 160,
  strokeWidth = 12,
  className,
  showLabel = true,
  label,
  colors = DEFAULT_COLORS,
}: ScoreIndicatorProps) {
  const normalizedValue = Math.min(Math.max(value, 0), maxValue)
  const percentage = (normalizedValue / maxValue) * 100

  // Calculate the color based on percentage
  const getColor = () => {
    const index = Math.min(
      Math.floor((percentage / 100) * colors.length),
      colors.length - 1
    )
    return colors[index]
  }

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // Only use 270 degrees (3/4 of the circle) for the gauge
  const arcLength = circumference * 0.75
  const strokeDashoffset = arcLength - (arcLength * percentage) / 100

  const color = getColor()

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform rotate-[135deg]"
      >
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          className="text-muted/20"
        />
        {/* Colored progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Score value in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
        <span
          className="text-4xl font-bold tabular-nums"
          style={{ color }}
        >
          {Math.round(normalizedValue)}
        </span>
        {showLabel && (
          <span className="text-xs text-muted-foreground">
            {label || `out of ${maxValue}`}
          </span>
        )}
      </div>
    </div>
  )
}

type ProfileScoreCardProps = {
  score: number
  title: string
  summary: string
  userName?: string
  userAvatar?: string
  className?: string
}

export function ProfileScoreCard({
  score,
  title,
  summary,
  userName,
  userAvatar,
  className,
}: ProfileScoreCardProps) {
  const getScoreLabel = () => {
    if (score >= 80) return "Excellent"
    if (score >= 60) return "Good"
    if (score >= 40) return "Fair"
    if (score >= 20) return "Needs Work"
    return "Getting Started"
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5",
        className
      )}
    >
      <div className="relative flex items-center gap-5">
        {/* Gauge on the left */}
        <div className="shrink-0">
          <ScoreIndicator
            value={score}
            maxValue={100}
            size={100}
            strokeWidth={8}
            label={getScoreLabel()}
          />
        </div>

        {/* User info on the right */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-3">
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={userName || "User avatar"}
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover ring-2 ring-border"
                unoptimized
              />
            ) : userName ? (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {userName.charAt(0).toUpperCase()}
              </div>
            ) : null}
            <div className="min-w-0">
              {userName && (
                <p className="truncate text-sm font-medium text-foreground">
                  {userName}
                </p>
              )}
              <h3 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                {title}
              </h3>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {summary}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Shared Score Components (used by interview-prep and onboarding)
// ============================================================================

export function ScoreRing({
  score,
  size = 160,
}: {
  score: number
  size?: number
}) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getColor = (s: number) => {
    if (s >= 80) return "text-emerald-500"
    if (s >= 60) return "text-amber-500"
    return "text-red-500"
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-1000 ease-out", getColor(score))}
          style={{
            animation: "score-fill 1.5s ease-out forwards",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-4xl font-bold tabular-nums", getColor(score))}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">out of 100</span>
      </div>
    </div>
  )
}

export function CategoryBar({
  label,
  score,
  icon: Icon,
  colorClass,
}: {
  label: string
  score: number
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums">{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out", colorClass)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================================
// Profile Analysis Results (rich structured UI for onboarding)
// ============================================================================

const profileCategoryConfig = {
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
}

type ProfileAnalysis = {
  overallScore: number
  categories: {
    skillsBreadth: number
    experienceQuality: number
    ratePositioning: number
    marketReadiness: number
  }
  strengths: string[]
  improvements: string[]
  detailedFeedback: string
}

export function ProfileAnalysisResults({
  analysis,
}: {
  analysis: ProfileAnalysis
}) {
  // Guard against old-format data missing structured fields
  if (!analysis.categories) return null

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Profile Analysis</h2>
      {/* Score card with ring + category bars */}
      <Card className="overflow-hidden border-border/50">
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start sm:gap-10">
          <ScoreRing score={analysis.overallScore} />
          <div className="flex-1 space-y-5">
            {(
              Object.entries(profileCategoryConfig) as [
                keyof typeof profileCategoryConfig,
                (typeof profileCategoryConfig)[keyof typeof profileCategoryConfig],
              ][]
            ).map(([key, config]) => (
              <CategoryBar
                key={key}
                label={config.label}
                score={analysis.categories[key]}
                icon={config.icon}
                colorClass={config.color}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
