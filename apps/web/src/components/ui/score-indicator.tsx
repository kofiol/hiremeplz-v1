"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

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
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
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
  className?: string
}

export function ProfileScoreCard({
  score,
  title,
  summary,
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
        "relative overflow-hidden rounded-2xl border bg-gradient-to-b from-card to-card/80 p-6 text-center shadow-lg",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

      <div className="relative flex flex-col items-center gap-4">
        <ScoreIndicator
          value={score}
          maxValue={100}
          size={140}
          strokeWidth={10}
          label={getScoreLabel()}
        />

        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
      </div>
    </div>
  )
}
