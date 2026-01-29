"use client"

import * as React from "react"
import Image from "next/image"
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
        "relative overflow-hidden rounded-2xl border bg-gradient-to-b from-card to-card/80 p-5 shadow-lg",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

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
              <h3 className="truncate text-base font-semibold tracking-tight">
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
