"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/app/auth/session-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Mic,
  MessageSquare,
  DollarSign,
  Brain,
  ArrowRight,
  User,
  History,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type InterviewType,
  interviewTypeLabels,
  interviewTypeDescriptions,
  interviewContextPlaceholders,
} from "@/lib/agents/interview-agent"

const interviewTypes: {
  type: InterviewType
  icon: typeof Mic
}[] = [
  { type: "client_discovery", icon: MessageSquare },
  { type: "technical", icon: Brain },
  { type: "rate_negotiation", icon: DollarSign },
  { type: "behavioral", icon: User },
]

export default function InterviewPrepPage() {
  const { session, isLoading: sessionLoading } = useSession()
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<InterviewType>("client_discovery")
  const [context, setContext] = useState("")
  const [isStarting, setIsStarting] = useState(false)

  const contextTrimmed = context.trim()
  const canStart = !!session && !isStarting && contextTrimmed.length > 0

  async function handleStart() {
    if (!canStart) return
    setIsStarting(true)

    try {
      const res = await fetch("/api/v1/interview-prep/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interviewType: selectedType,
          context: contextTrimmed,
        }),
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
    <ScrollArea className="h-full overflow-hidden">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-8 lg:px-6 lg:py-12">
        {/* Header */}
        <div className="mb-5 shrink-0 text-center">
          <div className="mb-2 flex items-center justify-center">
            <Badge variant="outline">BETA</Badge>
          </div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight lg:text-3xl">
            Interview Practice
          </h1>
          <p className="mx-auto max-w-lg text-sm text-muted-foreground">
            Practice with an AI that role-plays as the actual client.
            Get scored on communication, confidence, and content quality.
          </p>
        </div>

        {/* Interview type selector */}
        <div className="mb-5 shrink-0">
          <Label className="mb-2.5 text-xs uppercase tracking-wider text-muted-foreground">
            Interview Type
          </Label>
          <RadioGroup
            value={selectedType}
            onValueChange={(v) => setSelectedType(v as InterviewType)}
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
          >
            {interviewTypes.map(({ type, icon: Icon }) => {
              const isSelected = selectedType === type
              return (
                <label
                  key={type}
                  className={cn(
                    "group relative flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-all duration-150",
                    isSelected
                      ? "border-foreground/20 bg-accent/50"
                      : "border-border/50 hover:border-border hover:bg-accent/30"
                  )}
                >
                  <RadioGroupItem value={type} className="mt-0.5 shrink-0" />
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {interviewTypeLabels[type]}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {interviewTypeDescriptions[type]}
                    </p>
                  </div>
                </label>
              )
            })}
          </RadioGroup>
        </div>

        {/* Context textarea */}
        <div className="mb-5 shrink-0">
          <div className="mb-2.5 flex items-baseline justify-between">
            <Label htmlFor="interview-context" className="text-xs uppercase tracking-wider text-muted-foreground">
              Client / Job Context
            </Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {context.length}/2000
            </span>
          </div>
          <Textarea
            id="interview-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={interviewContextPlaceholders[selectedType]}
            className="min-h-[120px] resize-none"
            maxLength={2000}
          />
          {contextTrimmed && (
            <div className="mt-3 rounded-lg border border-border/30 bg-muted/30 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Preview
              </p>
              <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {contextTrimmed}
                </ReactMarkdown>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Paste a job posting or describe the client. The AI will role-play as this person.
          </p>
        </div>

        {/* Bottom actions */}
        <div className="flex shrink-0 items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/interview-prep/history")}
            className="text-muted-foreground"
          >
            <History className="mr-1.5 size-3.5" />
            Past Interviews
          </Button>
          <Button
            size="lg"
            onClick={handleStart}
            disabled={!canStart}
            className="group min-w-[200px]"
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Preparing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Mic className="size-4" />
                Start Interview
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
}
