"use client"

import { useState } from "react"
import { useSession } from "@/app/auth/session-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Bug, Lightbulb, Star, Send, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type FeedbackType = "bug" | "feature" | "review"

const feedbackTypes: {
  type: FeedbackType
  label: string
  description: string
  icon: typeof Bug
}[] = [
  {
    type: "bug",
    label: "Bug Report",
    description: "Something isn't working as expected",
    icon: Bug,
  },
  {
    type: "feature",
    label: "Feature Request",
    description: "Suggest an improvement or new feature",
    icon: Lightbulb,
  },
  {
    type: "review",
    label: "Review",
    description: "Share your experience with hireMePlz",
    icon: Star,
  },
]

export default function FeedbackPage() {
  const { session } = useSession()
  const [type, setType] = useState<FeedbackType>("bug")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session || !content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, content: content.trim() }),
      })

      if (!res.ok) throw new Error("Failed to submit")
      setSubmitted(true)
    } catch (err) {
      console.error("Feedback submission failed:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleReset() {
    setContent("")
    setType("bug")
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-6 sm:px-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent">
            <CheckCircle className="size-6 text-accent-foreground" />
          </div>
          <h2 className="text-xl font-medium tracking-tight">
            Thanks for your feedback
          </h2>
          <p className="text-center text-muted-foreground">
            We read every submission and use it to improve hireMePlz.
          </p>
          <Button variant="outline" onClick={handleReset} className="mt-2">
            Submit another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 overflow-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="shrink-0 text-center">
          <h1 className="mb-3 text-3xl font-medium tracking-tight lg:text-4xl">
            Feedback
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Share your thoughts and help us improve hireMePlz.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Type selector */}
          <div>
            <label className="mb-3 block text-sm font-medium text-muted-foreground">
              What kind of feedback?
            </label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as FeedbackType)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {feedbackTypes.map(({ type: t, label, description, icon: Icon }) => {
                const isSelected = type === t
                return (
                  <label
                    key={t}
                    className={cn(
                      "group flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all duration-200",
                      isSelected
                        ? "border-foreground/20 bg-accent/50"
                        : "border-border/50 hover:border-border hover:bg-accent/30"
                    )}
                  >
                    <RadioGroupItem value={t} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{label}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </label>
                )
              })}
            </RadioGroup>
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="feedback-content"
              className="mb-2 block text-sm font-medium text-muted-foreground"
            >
              Details
            </label>
            <Textarea
              id="feedback-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                type === "bug"
                  ? "Describe what happened, what you expected, and steps to reproduce..."
                  : type === "feature"
                    ? "Describe the feature and how it would help you..."
                    : "Tell us about your experience..."
              }
              className="min-h-[160px] resize-none"
              maxLength={5000}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {content.length}/5000
            </p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!content.trim() || isSubmitting || !session}
            className="w-full sm:w-auto sm:self-end"
          >
            {isSubmitting ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
