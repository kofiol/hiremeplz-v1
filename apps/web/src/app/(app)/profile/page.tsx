"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/app/auth/session-provider"
import { useUserPlan } from "@/hooks/use-user-plan"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  AnalysisLoading,
  AnalysisHero,
  AnalysisCategories,
  AnalysisInsights,
  AnalysisCTAs,
  LinkedinStatus,
} from "@/components/analysis"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { RefreshCw, AlertCircle, Pencil, Check, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

// ============================================================================
// Types
// ============================================================================

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

type ProfileFields = {
  displayName: string
  headline: string
  about: string
  location: string
  linkedinUrl: string
}

type FieldKey = keyof ProfileFields

const FIELD_META: { key: FieldKey; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: "displayName", label: "Display Name", placeholder: "Your name" },
  { key: "headline", label: "Headline", placeholder: "e.g. Full-Stack Developer" },
  { key: "about", label: "About", placeholder: "Tell clients about yourself...", multiline: true },
  { key: "location", label: "Location", placeholder: "e.g. Berlin, Germany" },
  { key: "linkedinUrl", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/..." },
]

const FIELD_API_MAP: Record<FieldKey, string> = {
  displayName: "displayName",
  headline: "headline",
  about: "about",
  location: "location",
  linkedinUrl: "linkedinUrl",
}

// ============================================================================
// Inline Editable Field
// ============================================================================

function InlineField({
  label,
  value,
  placeholder,
  multiline,
  onSave,
}: {
  label: string
  value: string
  placeholder: string
  multiline?: boolean
  onSave: (value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value)
      // Focus after render
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [editing, value])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDraft(value)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === "Escape") {
      handleCancel()
    }
  }

  if (editing) {
    return (
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-start gap-2">
          {multiline ? (
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={3}
              className="flex-1"
            />
          ) : (
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1"
            />
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="mt-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-start gap-2">
        <p className={`text-sm ${value ? "text-foreground" : "italic text-muted-foreground/60"}`}>
          {value || placeholder}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-md p-1 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Pencil className="size-3" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Page
// ============================================================================

export default function ProfilePage() {
  const { session, isLoading: sessionLoading } = useSession()
  const { displayName, email } = useUserPlan()
  const router = useRouter()

  // Analysis state
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  // First-visit state
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const [isSavingSeen, setIsSavingSeen] = useState(false)

  // LinkedIn state
  const [linkedinStatus, setLinkedinStatus] = useState<LinkedinScrapeStatus>(null)

  // Profile fields
  const [profileFields, setProfileFields] = useState<ProfileFields>({
    displayName: "",
    headline: "",
    about: "",
    location: "",
    linkedinUrl: "",
  })

  // Resolve user info
  const userInfo = useMemo(() => {
    const name =
      displayName ??
      (session?.user?.user_metadata?.full_name as string) ??
      (session?.user?.user_metadata?.name as string) ??
      "User"

    const userEmail = email ?? session?.user?.email ?? ""

    const avatarUrl =
      (session?.user?.user_metadata?.avatar_url as string) ??
      (session?.user?.user_metadata?.picture as string)

    const initials = name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()

    return { name, email: userEmail, avatarUrl, initials }
  }, [session, displayName, email])

  // Check if this is the first visit (analysis not yet seen)
  useEffect(() => {
    if (!session) return

    async function checkFirstVisit() {
      try {
        const res = await fetch("/api/v1/me", {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.onboarding_completed_at && !data.analysis_seen_at) {
            setIsFirstVisit(true)
          }
        }
      } catch {
        // Ignore — not critical
      }
    }

    checkFirstVisit()
  }, [session])

  // Fetch analysis with polling + auto-trigger
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
          // No analysis exists — auto-trigger one
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
          // Still generating — poll again
          setTimeout(() => setPollCount((c) => c + 1), 3000)
        } else {
          // Max polls reached
          setIsLoading(false)
        }
      } catch (err) {
        console.error("Error fetching analysis:", err)
        setError(err instanceof Error ? err.message : "Failed to load analysis")
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
        const res = await fetch("/api/v1/settings/agent?agent_type=onboarding", {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        })

        if (!res.ok) return

        const data = await res.json()
        const settings = data.settings_json

        if (settings?.linkedin_scrape_run_id) {
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

  // Fetch profile fields from settings API
  const fetchProfileFields = useCallback(async () => {
    if (!session?.access_token) return

    try {
      const response = await fetch("/api/v1/settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!response.ok) return

      const data = await response.json()
      const profile = data.profile
      if (profile) {
        setProfileFields({
          displayName: profile.display_name ?? "",
          headline: profile.headline ?? "",
          about: profile.about ?? "",
          location: profile.location ?? "",
          linkedinUrl: profile.linkedin_url ?? "",
        })
      }
    } catch {
      // silently fail — fields will remain empty
    }
  }, [session?.access_token])

  useEffect(() => {
    if (!sessionLoading && session?.access_token) {
      fetchProfileFields()
    }
  }, [sessionLoading, session?.access_token, fetchProfileFields])

  // Refresh analysis (manual)
  const refreshAnalysis = useCallback(async () => {
    if (!session?.access_token || isRefreshing) return

    setIsRefreshing(true)
    setError(null)

    try {
      const response = await fetch("/api/v1/profile/analysis", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error?.message || "Failed to refresh analysis")
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh analysis")
    } finally {
      setIsRefreshing(false)
    }
  }, [session?.access_token, isRefreshing])

  // "Continue to Overview" handler (first-visit only)
  const handleContinue = useCallback(async () => {
    if (!session) return

    setIsSavingSeen(true)
    try {
      await fetch("/api/v1/analysis/seen", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      router.push("/overview")
    } catch {
      // Redirect anyway
      router.push("/overview")
    }
  }, [session, router])

  // Save inline-editable field
  const saveField = useCallback(
    async (fieldKey: FieldKey, value: string) => {
      if (!session?.access_token) return

      const response = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: {
            [FIELD_API_MAP[fieldKey]]: value || null,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error?.message || "Failed to save")
      }

      setProfileFields((prev) => ({ ...prev, [fieldKey]: value }))
      toast.success("Profile updated")
      window.dispatchEvent(new CustomEvent("user-plan:refresh"))
    },
    [session?.access_token],
  )

  // Loading state — show analysis loading spinner with progress steps
  if (sessionLoading || (isLoading && !analysis)) {
    return <AnalysisLoading pollCount={pollCount} />
  }

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="mx-auto max-w-3xl space-y-8 p-4 lg:p-6">
        {/* LinkedIn status banner */}
        {linkedinStatus && (
          <LinkedinStatus status={linkedinStatus} />
        )}

        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarImage src={userInfo.avatarUrl} alt={userInfo.name} />
              <AvatarFallback className="text-lg">
                {userInfo.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {userInfo.name}
              </h1>
              <p className="text-muted-foreground">{userInfo.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Profile
                </Badge>
                <Badge variant="outline" className="text-xs">
                  BETA
                </Badge>
              </div>
            </div>
          </div>
          {!isFirstVisit && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAnalysis}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw
                className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Analyzing..." : "Refresh Analysis"}
            </Button>
          )}
        </div>

        {/* Profile Details Card */}
        <div className="rounded-lg border border-border/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Profile Details</h2>
          <div className="space-y-4">
            {FIELD_META.map((field) => (
              <InlineField
                key={field.key}
                label={field.label}
                value={profileFields[field.key]}
                placeholder={field.placeholder}
                multiline={field.multiline}
                onSave={(v) => saveField(field.key, v)}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Analysis content */}
        {analysis ? (
          <div className="space-y-6">
            {/* Hero score ring */}
            <AnalysisHero
              score={analysis.overallScore}
              firstName={userInfo.name.split(" ")[0]}
            />

            <Separator />

            {/* Category bars */}
            <AnalysisCategories categories={analysis.categories} />

            {/* Strengths & Improvements grid */}
            <AnalysisInsights
              strengths={analysis.strengths}
              improvements={analysis.improvements}
            />

            <Separator />

            {/* Detailed feedback markdown */}
            <div className="rounded-lg border border-border/50 p-6">
              <div className="prose prose-base prose-invert max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {analysis.detailedFeedback}
                </ReactMarkdown>
              </div>
            </div>

            {/* First visit: CTAs with "Continue to Overview" */}
            {isFirstVisit ? (
              <AnalysisCTAs
                categories={analysis.categories}
                improvements={analysis.improvements}
                onContinue={handleContinue}
                isLoading={isSavingSeen}
              />
            ) : (
              /* Returning user: timestamp + refresh */
              <p className="text-xs text-muted-foreground">
                Last analyzed{" "}
                {new Date(analysis.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/50 p-12 text-center">
            <p className="text-muted-foreground">
              No profile analysis yet. Run your first analysis to see scores and
              feedback.
            </p>
            <Button
              onClick={refreshAnalysis}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw
                className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Analyzing..." : "Run Analysis"}
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
