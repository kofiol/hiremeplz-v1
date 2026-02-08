"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, ClipboardList, Sparkles, Target, FileText, Mic, ArrowRight } from "lucide-react"

export type OnboardingMode = "chatbot" | "form"

type WelcomeScreenProps = {
  fullName: string | null
  isLoading: boolean
  onNameSubmit: (name: string) => void
  onStart: (mode: OnboardingMode) => void
}

const BENEFITS = [
  {
    icon: Target,
    title: "Smart Job Matching",
    description: "AI ranks opportunities by fit, budget, and win probability",
  },
  {
    icon: FileText,
    title: "Tailored Proposals",
    description: "Generate cover letters in your voice, tuned to each job",
  },
  {
    icon: Mic,
    title: "Interview Practice",
    description: "Real-time voice prep with AI feedback on your performance",
  },
]

export function WelcomeScreen({ fullName, isLoading, onNameSubmit, onStart }: WelcomeScreenProps) {
  const [nameInput, setNameInput] = useState("")
  const hasName = !!fullName?.trim()
  const firstName = fullName?.split(" ")[0] ?? ""

  // Phase 1: Name collection
  if (!hasName) {
    return (
      <motion.div
        key="name-input"
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35 }}
        className="flex flex-1 flex-col items-center justify-center p-6 min-h-0 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md space-y-6 text-center"
        >
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Before we get started
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              What's your full name?
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              const trimmed = nameInput.trim()
              if (trimmed) onNameSubmit(trimmed)
            }}
            className="flex flex-col gap-4"
          >
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="John Doe"
              className="text-center text-lg h-12"
              autoFocus
            />
            <Button
              type="submit"
              disabled={!nameInput.trim()}
              className="gap-2"
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </motion.div>
      </motion.div>
    )
  }

  // Phase 2: Mode selection (name is known)
  return (
    <motion.div
      key="welcome"
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35 }}
      className="flex flex-1 flex-col items-center justify-center p-6 min-h-0 overflow-y-auto"
    >
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <h1
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
            suppressHydrationWarning
          >
            Welcome, {firstName}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Let's set up your freelance profile in about 5 minutes.
          </p>
        </motion.div>

        {/* Value proposition */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-xl border border-border/50 bg-card/50 p-6"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="size-4" />
            What this unlocks
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <benefit.icon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{benefit.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground border-t border-border/50 pt-4">
            The more we know about your skills, experience, and goals, the better we can match you with the right opportunities and help you win them.
          </p>
        </motion.div>

        {/* Mode selection */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          <p className="text-center text-sm text-muted-foreground">
            Choose how you'd like to complete your profile:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Chatbot option */}
            <button
              onClick={() => onStart("chatbot")}
              disabled={isLoading}
              className="group relative flex flex-col items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-5 text-left transition-all hover:border-primary/50 hover:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <h3 className="font-medium">AI Conversation</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chat naturally with our AI assistant. It'll guide you through questions and can even import from LinkedIn.
                </p>
              </div>
              <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Recommended
              </span>
            </button>

            {/* Form option */}
            <button
              onClick={() => onStart("form")}
              disabled={isLoading}
              className="group flex flex-col items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-5 text-left transition-all hover:border-primary/50 hover:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-muted/80">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <h3 className="font-medium">Standard Form</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Prefer forms? Fill out your profile step-by-step with traditional inputs.
                </p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Loading state */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Starting...
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
