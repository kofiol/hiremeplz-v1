"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/app/auth/session-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft,
  History,
  ChevronRight,
  Inbox,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type InterviewType,
  interviewTypeLabels,
} from "@/lib/agents/interview-agent"

type SessionSummary = {
  id: string
  interview_type: InterviewType
  status: string
  overall_score: number | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  context: string | null
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground"
  if (score >= 70) return "text-emerald-500"
  if (score >= 50) return "text-amber-500"
  return "text-red-500"
}

function scoreBgColor(score: number | null): string {
  if (score === null) return "bg-muted"
  if (score >= 70) return "bg-emerald-500/10"
  if (score >= 50) return "bg-amber-500/10"
  return "bg-red-500/10"
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function InterviewHistoryPage() {
  const { session: authSession, isLoading: authLoading } = useSession()
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSessions() {
      if (!authSession) return

      try {
        const res = await fetch("/api/v1/interview-prep/sessions", {
          headers: {
            Authorization: `Bearer ${authSession.access_token}`,
          },
        })

        if (!res.ok) throw new Error("Failed to load sessions")
        const data = await res.json()
        setSessions(data.sessions ?? [])
      } catch (err) {
        console.error("Error loading history:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSessions()
  }, [authSession])

  if (authLoading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full overflow-hidden">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-6 lg:py-12">
        {/* Header */}
        <div className="mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/interview-prep")}
          >
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
        </div>

        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <History className="size-5 text-muted-foreground" />
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight lg:text-4xl">
            Past Interviews
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Review your previous interview sessions and track your progress.
          </p>
        </div>

        {/* Best score card */}
        {(() => {
          const completedSessions = sessions.filter(
            (s) => s.status === "completed" && s.overall_score !== null
          )
          if (completedSessions.length === 0) return null

          const bestSession = completedSessions.reduce((best, current) =>
            (current.overall_score ?? 0) > (best.overall_score ?? 0)
              ? current
              : best
          )

          return (
            <Card
              className="group mb-8 cursor-pointer border-primary/20 bg-primary/5 transition-all hover:border-primary/40 hover:bg-primary/10"
              onClick={() =>
                router.push(`/interview-prep/results/${bestSession.id}`)
              }
            >
              <CardContent className="flex items-center gap-6 p-6">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                  <Trophy className="size-8 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Personal Best
                  </p>
                  <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight">
                    {bestSession.overall_score}
                    <span className="ml-1.5 text-lg font-normal text-muted-foreground">
                      / 100
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {interviewTypeLabels[bestSession.interview_type]} &middot;{" "}
                    {formatDate(bestSession.created_at)}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          )
        })()}

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No interviews yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete your first interview practice to see results here.
              </p>
            </div>
            <Button onClick={() => router.push("/interview-prep")}>
              Start Practice
            </Button>
          </div>
        ) : (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              All Sessions
            </h2>
            <div className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/50 bg-card/50">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="group flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/20"
                  onClick={() => router.push(`/interview-prep/results/${s.id}`)}
                >
                  {/* Score */}
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-bold tabular-nums",
                      scoreBgColor(s.overall_score),
                      scoreColor(s.overall_score)
                    )}
                  >
                    {s.overall_score !== null ? s.overall_score : "—"}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {interviewTypeLabels[s.interview_type]}
                      </p>
                      <Badge
                        variant={s.status === "completed" ? "secondary" : "outline"}
                        className="text-[10px] opacity-70"
                      >
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </Badge>
                    </div>
                    {s.context && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {s.context}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {formatDate(s.created_at)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
