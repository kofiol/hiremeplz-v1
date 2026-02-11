"use client"

import { Building2, Bookmark, Linkedin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ScoreBadge } from "./score-badge"
import { formatBudget, formatRelativeTime } from "@/lib/jobs/utils"
import type { Job } from "@/lib/jobs/types"

type JobCardProps = {
  job: Job
  onSelect: (job: Job) => void
  onToggleBookmark: (jobId: string) => void
}

function UpworkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.214-1.832-2.148-4.032-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.548-1.405-.002-2.543-1.143-2.545-2.548V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z" />
    </svg>
  )
}

const MAX_VISIBLE_SKILLS = 3

export function JobCard({ job, onSelect, onToggleBookmark }: JobCardProps) {
  const visibleSkills = job.skills.slice(0, MAX_VISIBLE_SKILLS)
  const overflowCount = job.skills.length - MAX_VISIBLE_SKILLS

  return (
    <button
      type="button"
      onClick={() => onSelect(job)}
      className="w-full text-left rounded-lg border border-border/50 bg-card p-4 transition-colors hover:bg-accent/50 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex gap-3">
        {/* Company logo */}
        <div className="size-10 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          {job.company_logo_url ? (
            <img
              src={job.company_logo_url}
              alt={job.company_name ?? "Company"}
              className="size-full object-cover"
            />
          ) : (
            <Building2 className="size-5 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex gap-4">
          {/* Left: title, skills, footer */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Title + company */}
            <div className="min-w-0">
              <h3 className="font-medium text-sm leading-tight truncate">
                {job.title}
              </h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {job.company_name ?? "Private Client"}
              </p>
            </div>

          {/* Skill tags */}
          <div className="flex flex-wrap gap-1">
            {visibleSkills.map((skill) => (
              <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0">
                {skill}
              </Badge>
            ))}
            {overflowCount > 0 && (
              <Badge variant="ghost" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                +{overflowCount} more
              </Badge>
            )}
          </div>

          {/* Footer: budget, time, platform, bookmark */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{formatBudget(job)}</span>
              <span className="text-border">|</span>
              <span>{formatRelativeTime(job.posted_at)}</span>
            </div>

            <div className="flex items-center gap-1">
              {/* Platform icon */}
              {job.platform === "linkedin" ? (
                <Linkedin className="size-3.5 text-muted-foreground" />
              ) : (
                <UpworkIcon className="size-3.5 text-muted-foreground" />
              )}

              {/* Bookmark */}
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleBookmark(job.id)
                }}
              >
                <Bookmark
                  className={cn(
                    "size-3.5",
                    job.is_bookmarked
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  )}
                />
              </Button>
            </div>
          </div>
          </div>

          {/* Right: score + AI summary */}
          {job.ranking && (
            <div className="shrink-0 w-44 flex flex-col items-end gap-1.5 text-right">
              <ScoreBadge score={job.ranking.score} size="lg" />
              {job.ai_summary && (
                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-4">
                  {job.ai_summary}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
