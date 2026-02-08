"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"

type Variant = "incomplete" | "complete"

function useOnboardingApiMock(enabled: boolean) {
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return

    const originalFetch = window.fetch

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString()
      const method = (init?.method ?? "GET").toUpperCase()

      if (url.startsWith("/api/v1/onboarding")) {
        if (url.endsWith("/chat") && method === "POST") {
          let prompt = ""

          if (init?.body && typeof init.body === "string") {
            try {
              const parsed = JSON.parse(init.body)
              if (typeof parsed.message === "string") {
                prompt = parsed.message
              }
            } catch {
            }
          }

          const replyLines = [
            prompt
              ? `You said: "${prompt}".`
              : "This is a mock onboarding conversation.",
            "In test mode, no data is sent to the server.",
            "Use this flow to validate chat UI and UX behaviour.",
          ]

          const body = JSON.stringify({
            message: replyLines.join("\n\n"),
            collectedData: null,
          })

          return new Response(body, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          })
        }

        if (url.endsWith("/progress") && method === "POST") {
          const body = JSON.stringify({ ok: true })

          return new Response(body, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          })
        }

        if (method === "GET") {
          const body = JSON.stringify({
            messages: [],
            collectedData: null,
            hasStarted: false,
          })

          return new Response(body, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          })
        }
      }

      if (url === "/api/v1/me") {
        const body = JSON.stringify({
          profile_completeness_score: 0.4,
        })

        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        })
      }

      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [enabled])
}

export default function OverviewUiTestPage() {
  const [variant, setVariant] = useState<Variant>("incomplete")
  const [isGuardChecked, setIsGuardChecked] = useState(false)
  const [isCheckingCompleteness, setIsCheckingCompleteness] = useState(true)

  useOnboardingApiMock(true)

  const profileCompleteness = variant === "incomplete" ? 0.4 : 0.95

  useEffect(() => {
    let isActive = true

    async function simulateGuard() {
      setIsGuardChecked(false)
      setIsCheckingCompleteness(true)

      await new Promise((resolve) => setTimeout(resolve, 600))

      if (!isActive) return

      setIsGuardChecked(true)
      setIsCheckingCompleteness(false)
    }

    simulateGuard()

    return () => {
      isActive = false
    }
  }, [variant])

  if (!isGuardChecked || isCheckingCompleteness) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Checking mock profile completeness…</span>
        </div>
        <p className="max-w-md text-center text-xs text-muted-foreground">
          This page is a UI-only mirror of the overview onboarding flow.
          All API calls are mocked so you can safely iterate on layout,
          loading states, and the chat experience.
        </p>
      </div>
    )
  }

  if (profileCompleteness < 0.8) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium">Overview UI test</span>
            <Separator orientation="vertical" className="h-4" />
            <span>Variant: incomplete profile</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVariant("incomplete")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                variant === "incomplete"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground border border-border"
              }`}
            >
              Chat onboarding
            </button>
            <button
              type="button"
              onClick={() => setVariant("complete")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                variant === "complete"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground border border-border"
              }`}
            >
              Dashboard cards
            </button>
          </div>
        </div>
        <div className="flex-1">
          <OnboardingShell />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium">Overview UI test</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Variant: complete profile</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVariant("incomplete")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              variant === "incomplete"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground border border-border"
            }`}
          >
            Chat onboarding
          </button>
          <button
            type="button"
            onClick={() => setVariant("complete")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              variant === "complete"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground border border-border"
            }`}
          >
            Dashboard cards
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium">Overview</h1>
          <Badge variant="outline">Signed in (mock)</Badge>
        </div>
        <Separator />
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Today’s actions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Generate cover letters (N), Apply to top jobs (N), Reply needed (N)
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pipeline snapshot</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Empty state
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent agent runs</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Empty state
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              New high-score job, daily limit reached, suspicious job detected
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

