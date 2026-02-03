"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "@/app/auth/session-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ScoreRing, CategoryBar } from "@/components/ui/score-indicator"
import {
  Sparkles,
  ArrowLeft,
  RotateCcw,
  History,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  Shield,
  Zap,
  Clock,
  Target,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { InterviewAnalysis } from "@/lib/agents/analysis-agent"
import {
  type InterviewType,
  interviewTypeLabels,
} from "@/lib/agents/interview-agent"

type SessionData = {
  id: string
  interview_type: InterviewType
  status: string
  transcript: { role: string; text: string; timestamp: string }[]
  metrics: {
    thinkingPauses?: number[]
    reactionTimes?: number[]
    responseDurations?: number[]
    fillerWordCount?: number
    totalDuration?: number
    questionCount?: number
  }
  analysis: InterviewAnalysis | null
  overall_score: number | null
  started_at: string | null
  finished_at: string | null
}

const categoryConfig = {
  communication: {
    label: "Communication",
    icon: MessageSquare,
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-500",
  },
  confidence: {
    label: "Confidence",
    icon: Shield,
    color: "from-purple-500 to-pink-500",
    bg: "bg-purple-500",
  },
  contentQuality: {
    label: "Content Quality",
    icon: Target,
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-500",
  },
  responsiveness: {
    label: "Responsiveness",
    icon: Zap,
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-500",
  },
}

export default function InterviewResultsPage() {
  const { session: authSession, isLoading: authLoading } = useSession()
  const router = useRouter()
  const { sessionId } = useParams<{ sessionId: string }>()
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showTranscript, setShowTranscript] = useState(false)
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    async function loadSession() {
      if (!authSession || !sessionId) return

      try {
        const res = await fetch(`/api/v1/interview-prep/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${authSession.access_token}`,
          },
        })

        if (!res.ok) throw new Error("Failed to load session")
        const data = await res.json()
        setSessionData(data)

        // If analysis not ready yet, poll
        if (!data.analysis && pollCount < 30) {
          setTimeout(() => setPollCount((c) => c + 1), 3000)
        }
      } catch (err) {
        console.error("Error loading results:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [authSession, sessionId, pollCount])

  if (authLoading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading results...</span>
        </div>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Session not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/interview-prep")}
          >
            Back to Interview Prep
          </Button>
        </div>
      </div>
    )
  }

  const analysis = sessionData.analysis
  const metrics = sessionData.metrics

  if (!analysis) {
    const steps = [
      "Reading your transcript",
      "Evaluating communication clarity",
      "Scoring confidence and composure",
      "Reviewing content quality",
      "Writing personalized feedback",
    ]
    const activeStep = Math.min(Math.floor(pollCount / 2), steps.length - 1)

    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6">
        <div className="interview-orb interview-orb-analyzing">
          <Sparkles className="size-8 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">Analyzing your interview...</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This usually takes 10-15 seconds
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          {steps.map((step, i) => (
            <div
              key={step}
              className="flex items-center gap-2.5 text-muted-foreground"
            >
              {i < activeStep ? (
                <div className="flex size-4 items-center justify-center">
                  <div className="size-1.5 rounded-full bg-foreground" />
                </div>
              ) : i === activeStep ? (
                <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <div className="flex size-4 items-center justify-center">
                  <div className="size-1.5 rounded-full bg-muted-foreground/30" />
                </div>
              )}
              <span className={i <= activeStep ? "text-foreground" : ""}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const pauses = metrics.thinkingPauses ?? metrics.reactionTimes
  const avgThinkTime = pauses?.length
    ? Math.round(
        pauses.reduce((a: number, b: number) => a + b, 0) /
          pauses.length /
          1000
      )
    : null

  return (
    <ScrollArea className="h-full overflow-hidden">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-6 lg:py-12">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/interview-prep")}
          >
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            <Sparkles className="mr-1 size-3" />
            BETA
          </Badge>
        </div>

        <h1 className="mb-1 text-2xl font-bold">Interview Results</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          {interviewTypeLabels[sessionData.interview_type]} &middot;{" "}
          {metrics.totalDuration
            ? `${Math.round(metrics.totalDuration / 1000 / 60)} min`
            : "N/A"}
        </p>

        {/* Score card */}
        <Card className="mb-6 overflow-hidden border-border/50">
          <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-start sm:gap-10">
            <ScoreRing score={analysis.overallScore} />
            <div className="flex-1 space-y-5">
              {(
                Object.entries(categoryConfig) as [
                  keyof typeof categoryConfig,
                  (typeof categoryConfig)[keyof typeof categoryConfig],
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

        {/* Quick metrics */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Questions",
              value: metrics.questionCount ?? "N/A",
              icon: MessageSquare,
            },
            {
              label: "Filler words",
              value: metrics.fillerWordCount ?? 0,
              icon: AlertTriangle,
            },
            {
              label: "Avg think time",
              value: avgThinkTime !== null ? `${avgThinkTime}s` : "N/A",
              icon: Clock,
            },
            {
              label: "Overall",
              value: `${analysis.overallScore}/100`,
              icon: Target,
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/30">
              <CardContent className="flex items-center gap-3 p-4">
                <stat.icon className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold tabular-nums">
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Strengths & Improvements */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-emerald-500" />
                Top Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.strengths.map((s, i) => (
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
              {analysis.improvements.map((s, i) => (
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

        {/* Detailed feedback */}
        <Card className="mb-6 border-border/30">
          <CardHeader>
            <CardTitle className="text-base">Detailed Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm prose-invert max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {analysis.detailedFeedback}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Transcript (expandable) */}
        <Card className="mb-8 border-border/30">
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowTranscript(!showTranscript)}
          >
            <CardTitle className="flex items-center justify-between text-base">
              <span>Full Transcript</span>
              {showTranscript ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </CardTitle>
          </CardHeader>
          {showTranscript && (
            <CardContent>
              <div className="space-y-3">
                {sessionData.transcript
                  ?.filter((t) => t.text?.trim())
                  .map((entry, i) => (
                    <div key={i} className="flex gap-3">
                      <Badge
                        variant={
                          entry.role === "assistant" ? "secondary" : "outline"
                        }
                        className="mt-0.5 shrink-0 text-[10px]"
                      >
                        {entry.role === "assistant" ? "INT" : "YOU"}
                      </Badge>
                      <p className="text-sm">{entry.text}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          )}
        </Card>

        <Separator className="mb-6" />

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/interview-prep")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Prep
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/interview-prep/history")}
          >
            <History className="mr-2 size-4" />
            View History
          </Button>
          <Button onClick={() => router.push("/interview-prep")}>
            <RotateCcw className="mr-2 size-4" />
            Practice Again
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
}
