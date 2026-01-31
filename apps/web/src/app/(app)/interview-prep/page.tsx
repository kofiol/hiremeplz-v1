"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/app/auth/session-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Mic,
  MessageSquare,
  DollarSign,
  Brain,
  Sparkles,
  ArrowRight,
  User,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type InterviewType,
  interviewTypeLabels,
  interviewTypeDescriptions,
} from "@/lib/agents/interview-agent"

const interviewTypes: {
  type: InterviewType
  icon: typeof Mic
  gradient: string
}[] = [
  {
    type: "client_discovery",
    icon: MessageSquare,
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    type: "technical",
    icon: Brain,
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    type: "rate_negotiation",
    icon: DollarSign,
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    type: "behavioral",
    icon: User,
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
]

export default function InterviewPrepPage() {
  const { session, isLoading: sessionLoading } = useSession()
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<InterviewType>("client_discovery")
  const [isStarting, setIsStarting] = useState(false)

  async function handleStart() {
    if (!session || isStarting) return
    setIsStarting(true)

    try {
      const res = await fetch("/api/v1/interview-prep/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ interviewType: selectedType }),
      })

      if (!res.ok) throw new Error("Failed to create session")
      const data = await res.json()
      router.push(`/interview-prep/session/${data.sessionId}`)
    } catch (err) {
      console.error("Failed to start interview:", err)
      setIsStarting(false)
    }
  }

  if (sessionLoading) {
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
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-6 lg:py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 text-primary"
            >
              <Sparkles className="mr-1 size-3" />
              BETA
            </Badge>
          </div>
          <h1 className="mb-3 text-3xl font-bold tracking-tight lg:text-4xl">
            Interview{" "}
            <span className="interview-prep-gradient">Practice</span>
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Practice with an AI interviewer that adapts to your profile.
            Get scored on communication, confidence, and content quality.
          </p>
        </div>

        {/* Interview type selector */}
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Choose Interview Type
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {interviewTypes.map(({ type, icon: Icon, gradient }) => {
              const isSelected = selectedType === type
              return (
                <Card
                  key={type}
                  className={cn(
                    "group relative cursor-pointer border transition-all duration-200",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border/50 hover:border-border hover:bg-accent/30"
                  )}
                  onClick={() => setSelectedType(type)}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br transition-transform duration-200 group-hover:scale-105",
                        gradient
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-5",
                          isSelected ? "text-primary" : "text-foreground/70"
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {interviewTypeLabels[type]}
                        </h3>
                        {isSelected && (
                          <div className="size-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {interviewTypeDescriptions[type]}
                      </p>
                    </div>
                    <ChevronRight
                      className={cn(
                        "mt-1 size-4 shrink-0 transition-transform duration-200",
                        isSelected
                          ? "translate-x-0 text-primary"
                          : "-translate-x-1 text-muted-foreground/50 group-hover:translate-x-0"
                      )}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* How it works */}
        <div className="mb-8 rounded-xl border border-border/30 bg-muted/30 p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            How it works
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Speak naturally",
                desc: "Answer questions using your microphone. The AI adapts to your profile.",
              },
              {
                step: "2",
                title: "5-7 questions",
                desc: "A focused session covering key scenarios for your interview type.",
              },
              {
                step: "3",
                title: "Get your score",
                desc: "Detailed feedback on communication, confidence, and content quality.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {item.step}
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleStart}
            disabled={isStarting || !session}
            className="group relative min-w-[240px] overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isStarting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Preparing session...
                </>
              ) : (
                <>
                  <Mic className="size-4" />
                  Start Interview
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </span>
            <div className="absolute inset-0 -z-0 bg-gradient-to-r from-primary via-primary to-primary/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Button>
        </div>
      </div>
    </div>
  )
}
