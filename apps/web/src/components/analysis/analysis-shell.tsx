"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/app/auth/session-provider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AnalysisLoading } from "./analysis-loading"
import { AnalysisHero } from "./analysis-hero"
import { AnalysisCategories } from "./analysis-categories"
import { AnalysisInsights } from "./analysis-insights"
import { AnalysisCTAs } from "./analysis-ctas"
import { LinkedinStatus } from "./linkedin-status"

type ProfileAnalysis = {
  id: string
  overallScore: number
  categories: {
    skillsBreadth: number
    experienceQuality: number
    ratePositioning: number
    marketReadiness: number
  }
  strengths: string[]
  improvements: string[]
  detailedFeedback: string
  createdAt: string
}

type LinkedinScrapeStatus = "enriching" | "completed" | "failed" | null

export function AnalysisShell() {
  const { session, isLoading: authLoading } = useSession()
  const router = useRouter()
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [linkedinStatus, setLinkedinStatus] = useState<LinkedinScrapeStatus>(null)
  const [firstName, setFirstName] = useState("")

  // Fetch user's first name from /me endpoint
  useEffect(() => {
    if (!session) return

    async function fetchUserInfo() {
      try {
        const res = await fetch("/api/v1/me", {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.display_name) {
            setFirstName(data.display_name.split(" ")[0])
          }
        }
      } catch {
        // Ignore errors, firstName is optional
      }
    }

    fetchUserInfo()
  }, [session])

  // Fetch analysis data with polling, auto-trigger if none exists
  useEffect(() => {
    if (!session) return

    let analysisTriggered = false

    async function fetchAnalysis() {
      try {
        const res = await fetch("/api/v1/profile/analysis", {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        })

        if (!res.ok) {
          throw new Error("Failed to fetch analysis")
        }

        const data = await res.json()

        if (data.analysis) {
          setAnalysis(data.analysis)
          setIsLoading(false)
        } else if (pollCount === 0 && !analysisTriggered) {
          // No analysis exists yet - trigger one (form path)
          analysisTriggered = true
          try {
            const postRes = await fetch("/api/v1/profile/analysis", {
              method: "POST",
              headers: { Authorization: `Bearer ${session!.access_token}` },
            })
            if (postRes.ok) {
              const postData = await postRes.json()
              if (postData.analysis) {
                setAnalysis(postData.analysis)
                setIsLoading(false)
                return
              }
            }
          } catch {
            // POST failed, continue polling
          }
          setTimeout(() => setPollCount((c) => c + 1), 3000)
        } else if (pollCount < 30) {
          // Analysis not ready yet, poll again
          setTimeout(() => setPollCount((c) => c + 1), 3000)
        } else {
          // Max polls reached, stop loading
          setIsLoading(false)
        }
      } catch (err) {
        console.error("Error fetching analysis:", err)
        setIsLoading(false)
      }
    }

    fetchAnalysis()
  }, [session, pollCount])

  // Check LinkedIn scrape status
  useEffect(() => {
    if (!session) return

    async function checkLinkedinStatus() {
      try {
        // Fetch user agent settings to check for linkedin_scrape_run_id
        const res = await fetch("/api/v1/settings/agent?agent_type=onboarding", {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        })

        if (!res.ok) return

        const data = await res.json()
        const settings = data.settings_json

        if (settings?.linkedin_scrape_run_id) {
          // Check the status of the scrape run
          const runRes = await fetch(`/api/v1/linkedin-scrape/status?run_id=${settings.linkedin_scrape_run_id}`, {
            headers: { Authorization: `Bearer ${session!.access_token}` },
          })

          if (runRes.ok) {
            const runData = await runRes.json()
            if (runData.status === "running" || runData.status === "queued") {
              setLinkedinStatus("enriching")
            } else if (runData.status === "succeeded") {
              setLinkedinStatus("completed")
            } else if (runData.status === "failed") {
              setLinkedinStatus("failed")
            }
          }
        }
      } catch {
        // Ignore errors for LinkedIn status
      }
    }

    checkLinkedinStatus()
  }, [session])

  const handleContinue = useCallback(async () => {
    if (!session) return

    setIsSaving(true)
    try {
      // Mark analysis as seen
      await fetch("/api/v1/analysis/seen", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      // Redirect to overview
      router.push("/overview")
    } catch (err) {
      console.error("Error marking analysis as seen:", err)
      // Redirect anyway
      router.push("/overview")
    }
  }, [session, router])

  if (authLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (isLoading || !analysis) {
    return <AnalysisLoading pollCount={pollCount} />
  }

  return (
    <ScrollArea className="h-full overflow-hidden">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6 lg:py-12">
        {/* LinkedIn status banner */}
        {linkedinStatus && (
          <div className="mb-6">
            <LinkedinStatus status={linkedinStatus} />
          </div>
        )}

        {/* Hero section with score */}
        <AnalysisHero score={analysis.overallScore} firstName={firstName} />

        <Separator className="my-8" />

        {/* Category breakdown */}
        <div className="mb-6">
          <AnalysisCategories categories={analysis.categories} />
        </div>

        {/* Strengths & Improvements */}
        <div className="mb-8">
          <AnalysisInsights
            strengths={analysis.strengths}
            improvements={analysis.improvements}
          />
        </div>

        <Separator className="mb-8" />

        {/* CTAs */}
        <AnalysisCTAs
          categories={analysis.categories}
          improvements={analysis.improvements}
          onContinue={handleContinue}
          isLoading={isSaving}
        />
      </div>
    </ScrollArea>
  )
}
