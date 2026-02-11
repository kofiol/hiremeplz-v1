import { cn } from "@/lib/utils"
import { getScoreColor } from "@/lib/jobs/utils"

type ScoreBadgeProps = {
  score: number
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ScoreBadge({ score, size = "md", className }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 min-w-[2rem]",
    md: "text-sm px-2 py-0.5 min-w-[2.5rem]",
    lg: "text-base px-2.5 py-1 min-w-[3rem]",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-semibold tabular-nums",
        getScoreColor(score),
        sizeClasses[size],
        className
      )}
    >
      {score}
    </span>
  )
}
