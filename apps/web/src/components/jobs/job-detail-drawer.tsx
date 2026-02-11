"use client"

import {
  Building2,
  ExternalLink,
  Linkedin,
  MapPin,
  Star,
  Users,
  ShieldCheck,
  Briefcase,
  Layers,
  PenLine,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ScoreBadge } from "./score-badge"
import { formatBudget, formatRelativeTime, getScoreBarColor } from "@/lib/jobs/utils"
import type { Job } from "@/lib/jobs/types"

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

type BreakdownKey = "skill_match" | "budget_fit" | "client_quality" | "scope_fit" | "win_probability"

const BREAKDOWN_LABELS: Record<BreakdownKey, string> = {
  skill_match: "Skill Match",
  budget_fit: "Budget Fit",
  client_quality: "Client Quality",
  scope_fit: "Scope Fit",
  win_probability: "Win Probability",
}

const BREAKDOWN_ORDER: BreakdownKey[] = [
  "skill_match",
  "budget_fit",
  "client_quality",
  "scope_fit",
  "win_probability",
]

type JobDetailDrawerProps = {
  job: Job | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JobDetailDrawer({ job, open, onOpenChange }: JobDetailDrawerProps) {
  if (!job) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col"
      >
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            {/* Header */}
            <SheetHeader className="p-0 space-y-3">
              <div className="flex items-start gap-3">
                {/* Logo */}
                <div className="size-12 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {job.company_logo_url ? (
                    <img
                      src={job.company_logo_url}
                      alt={job.company_name ?? "Company"}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Building2 className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-base leading-tight">
                    {job.title}
                  </SheetTitle>
                  <SheetDescription className="mt-1 flex items-center gap-1.5">
                    {job.company_name ?? "Private Client"}
                    <span className="text-border">·</span>
                    {job.platform === "linkedin" ? (
                      <Linkedin className="size-3.5 inline" />
                    ) : (
                      <UpworkIcon className="size-3.5 inline" />
                    )}
                    <span>{formatRelativeTime(job.posted_at)}</span>
                  </SheetDescription>
                </div>
              </div>

              {/* Score + reasoning */}
              {job.ranking && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 border border-border/50 p-3">
                  <ScoreBadge score={job.ranking.score} size="lg" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {job.ranking.reasoning}
                  </p>
                </div>
              )}
            </SheetHeader>

            <Separator />

            {/* Description */}
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <div className="prose prose-sm prose-invert max-w-none text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {job.description}
              </div>
            </div>

            <Separator />

            {/* Skills */}
            <div>
              <h4 className="text-sm font-medium mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Budget */}
              <div className="rounded-lg bg-muted/30 border border-border/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Briefcase className="size-3.5" />
                  Budget
                </div>
                <p className="text-sm font-medium">{formatBudget(job)}</p>
              </div>

              {/* Seniority */}
              {job.seniority && (
                <div className="rounded-lg bg-muted/30 border border-border/30 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Layers className="size-3.5" />
                    Seniority
                  </div>
                  <p className="text-sm font-medium">{job.seniority}</p>
                </div>
              )}

              {/* Location */}
              {job.client_country && (
                <div className="rounded-lg bg-muted/30 border border-border/30 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <MapPin className="size-3.5" />
                    Location
                  </div>
                  <p className="text-sm font-medium">{job.client_country}</p>
                </div>
              )}

              {/* Category */}
              {job.category && (
                <div className="rounded-lg bg-muted/30 border border-border/30 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Layers className="size-3.5" />
                    Category
                  </div>
                  <p className="text-sm font-medium">{job.category}</p>
                </div>
              )}
            </div>

            {/* Client info — Upwork only */}
            {job.platform === "upwork" && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Client Info</h4>
                  <div className="flex flex-wrap gap-3">
                    {job.client_rating != null && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3.5 text-amber-400 fill-amber-400" />
                        <span>{job.client_rating.toFixed(1)} rating</span>
                      </div>
                    )}
                    {job.client_hires != null && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3.5" />
                        <span>{job.client_hires} hires</span>
                      </div>
                    )}
                    {job.client_payment_verified && (
                      <div className="flex items-center gap-1 text-xs text-emerald-400">
                        <ShieldCheck className="size-3.5" />
                        <span>Payment verified</span>
                      </div>
                    )}
                    {job.client_payment_verified === false && (
                      <div className="flex items-center gap-1 text-xs text-red-400">
                        <ShieldCheck className="size-3.5" />
                        <span>Payment not verified</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Match breakdown */}
            {job.ranking && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Match Breakdown</h4>
                  <div className="space-y-2.5">
                    {BREAKDOWN_ORDER.map((key) => {
                      const value = job.ranking!.breakdown[key]
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              {BREAKDOWN_LABELS[key]}
                            </span>
                            <span className="text-xs font-medium tabular-nums">
                              {value}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getScoreBarColor(value)}`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <SheetFooter className="border-t p-4 flex-row gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              window.location.href = `/proposal-writer?job_id=${job.id}`
            }}
          >
            <PenLine className="size-4 mr-1.5" />
            Generate Proposal
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            asChild
          >
            <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4 mr-1.5" />
              Apply directly
            </a>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
