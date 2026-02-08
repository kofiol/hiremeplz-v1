"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { FlaskConical, UserRound, Sparkles, Mic } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useSession } from "@/app/auth/session-provider"
import { useFocusMode } from "@/hooks/use-focus-mode"
import { useLinkedinPopup } from "@/hooks/use-linkedin-popup"

type SettingsSectionKey = "profile" | "ai_preferences" | "interview_prep" | "beta"

type SettingsResponse = {
  profile: {
    display_name: string | null
    timezone: string | null
    headline: string | null
  }
  preferences: {
    currency: string | null
  }
  ai_preferences: {
    proposal_style: "professional" | "conversational" | "technical" | null
    proposal_temperature: number | null
    vocabulary_level: number | null
    feedback_detail: "concise" | "balanced" | "detailed" | null
  }
  interview_prep: {
    auto_save: boolean
    difficulty_level: "easy" | "medium" | "hard" | null
    session_length: number | null
  }
}

const USER_PLAN_REFRESH_EVENT = "user-plan:refresh"

const sections: { key: SettingsSectionKey; label: string; icon: React.ElementType }[] =
  [
    { key: "profile", label: "Profile", icon: UserRound },
    { key: "ai_preferences", label: "AI Preferences", icon: Sparkles },
    { key: "interview_prep", label: "Interview Prep", icon: Mic },
    { key: "beta", label: "Beta", icon: FlaskConical },
  ]

export function SettingsPanel({
  enabled = true,
  showCancel = false,
  onCancel,
  onSaveSuccess,
}: {
  enabled?: boolean
  showCancel?: boolean
  onCancel?: () => void
  onSaveSuccess?: () => void
}) {
  const { session } = useSession()
  const params = useParams()
  const [focusModeEnabled, setFocusModeEnabled, focusOpacity, setFocusOpacity] = useFocusMode()
  const [linkedinPopupEnabled, setLinkedinPopupEnabled] = useLinkedinPopup()

  const sectionParam = (params as { section?: string[] | string }).section
  const sectionKeyRaw = Array.isArray(sectionParam) ? sectionParam[0] : sectionParam
  const activeSection: SettingsSectionKey =
    sectionKeyRaw && sections.some((s) => s.key === sectionKeyRaw)
      ? (sectionKeyRaw as SettingsSectionKey)
      : "profile"

  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Profile settings
  const [displayName, setDisplayName] = React.useState("")
  const [timezone, setTimezone] = React.useState("UTC")
  const [headline, setHeadline] = React.useState("")
  const [currency, setCurrency] = React.useState("USD")

  // AI preferences
  const [proposalStyle, setProposalStyle] = React.useState<"professional" | "conversational" | "technical">("professional")
  const [proposalTemperature, setProposalTemperature] = React.useState(0.7)
  const [vocabularyLevel, setVocabularyLevel] = React.useState(3)
  const [feedbackDetail, setFeedbackDetail] = React.useState<"concise" | "balanced" | "detailed">("balanced")

  // Interview prep settings
  const [autoSave, setAutoSave] = React.useState(true)
  const [difficultyLevel, setDifficultyLevel] = React.useState<"easy" | "medium" | "hard">("medium")
  const [sessionLength, setSessionLength] = React.useState(10)

  const canLoad = Boolean(session?.access_token)

  const loadSettings = React.useCallback(async () => {
    if (!session?.access_token) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/v1/settings", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        throw new Error("Failed to load settings")
      }

      const body = (await res.json()) as SettingsResponse

      // Profile settings
      setDisplayName(body.profile.display_name ?? "")
      setTimezone(body.profile.timezone ?? "UTC")
      setHeadline(body.profile.headline ?? "")
      setCurrency(body.preferences?.currency ?? "USD")

      // AI preferences
      setProposalStyle(body.ai_preferences?.proposal_style ?? "professional")
      setProposalTemperature(body.ai_preferences?.proposal_temperature ?? 0.7)
      setVocabularyLevel(body.ai_preferences?.vocabulary_level ?? 3)
      setFeedbackDetail(body.ai_preferences?.feedback_detail ?? "balanced")

      // Interview prep settings
      setAutoSave(body.interview_prep?.auto_save ?? true)
      setDifficultyLevel(body.interview_prep?.difficulty_level ?? "medium")
      setSessionLength(body.interview_prep?.session_length ?? 10)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load settings")
    } finally {
      setIsLoading(false)
    }
  }, [session?.access_token])

  React.useEffect(() => {
    if (!enabled) return
    if (!canLoad) return
    loadSettings()
  }, [canLoad, enabled, loadSettings])

  const payload = React.useMemo(() => {
    return {
      profile: {
        displayName: displayName.trim().length > 0 ? displayName.trim() : null,
        timezone: timezone.trim().length > 0 ? timezone.trim() : null,
        headline: headline.trim().length > 0 ? headline.trim() : null,
      },
      aiPreferences: {
        proposalStyle,
        proposalTemperature,
        vocabularyLevel,
        feedbackDetail,
      },
      interviewPrep: {
        autoSave,
        difficultyLevel,
        sessionLength,
      },
    }
  }, [
    displayName,
    timezone,
    headline,
    proposalStyle,
    proposalTemperature,
    vocabularyLevel,
    feedbackDetail,
    autoSave,
    difficultyLevel,
    sessionLength,
  ])

  async function handleSave() {
    if (!session?.access_token) return
    if (isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null)
        let message = "Failed to save settings"

        if (body && typeof body === "object" && "error" in body) {
          const errorValue = (body as { error?: unknown }).error
          if (typeof errorValue === "string") {
            message = errorValue
          } else if (errorValue && typeof errorValue === "object" && "message" in errorValue) {
            const errorMessage = (errorValue as { message?: unknown }).message
            if (typeof errorMessage === "string") {
              message = errorMessage
            }
          }
        }
        throw new Error(message)
      }

      toast.success("Settings saved")
      window.dispatchEvent(new Event(USER_PLAN_REFRESH_EVENT))
      onSaveSuccess?.()
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[220px_1fr]">
        <aside className="space-y-1 rounded-xl bg-muted/30 p-2">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.key
            return (
              <Link
                key={section.key}
                href={`/settings/${section.key}`}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span className="truncate">{section.label}</span>
              </Link>
            )
          })}
        </aside>

        <div className="space-y-6">
          {activeSection === "profile" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-medium">Profile</h2>
                <p className="text-xs text-muted-foreground">Your basic information and professional identity</p>
              </div>
              <div className="space-y-5 rounded-xl border border-border/50 bg-card p-5">
                <div className="space-y-2">
                  <Label htmlFor="settings-display-name">Display name</Label>
                  <Input
                    id="settings-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    disabled={isLoading || !canLoad}
                  />
                  <p className="text-muted-foreground text-xs">
                    How you'll appear across the platform.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="settings-headline">Professional headline</Label>
                  <Input
                    id="settings-headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Full-Stack Developer | React & Node.js Expert"
                    disabled={isLoading || !canLoad}
                  />
                  <p className="text-muted-foreground text-xs">
                    A brief tagline describing what you do.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="settings-timezone">Timezone</Label>
                  <Input
                    id="settings-timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="America/New_York"
                    disabled={isLoading || !canLoad}
                  />
                  <p className="text-muted-foreground text-xs">
                    IANA timezone (e.g., America/New_York, Europe/London, Asia/Tokyo).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="settings-currency">Currency</Label>
                  <Input
                    id="settings-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    placeholder="USD"
                    disabled={isLoading || !canLoad}
                  />
                  <p className="text-muted-foreground text-xs">
                    Three-letter code (e.g. USD, EUR, GBP).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "ai_preferences" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-medium">AI Preferences</h2>
                <p className="text-xs text-muted-foreground">Control how AI generates proposals and provides feedback</p>
              </div>
              <div className="space-y-5 rounded-xl border border-border/50 bg-card p-5">
                <div className="space-y-2">
                  <Label>Proposal writing style</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        { value: "professional", label: "Professional", desc: "Formal and structured" },
                        { value: "conversational", label: "Conversational", desc: "Friendly and approachable" },
                        { value: "technical", label: "Technical", desc: "Detail-oriented" },
                      ] as const
                    ).map((style) => (
                      <div
                        key={style.value}
                        role="button"
                        tabIndex={isLoading || !canLoad ? -1 : 0}
                        aria-disabled={isLoading || !canLoad}
                        onClick={() => {
                          if (isLoading || !canLoad) return
                          setProposalStyle(style.value)
                        }}
                        onKeyDown={(e) => {
                          if (isLoading || !canLoad) return
                          if (e.key !== "Enter" && e.key !== " ") return
                          e.preventDefault()
                          setProposalStyle(style.value)
                        }}
                        className={`flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-sm transition-all cursor-pointer ${
                          proposalStyle === style.value
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/50 hover:border-primary/30 hover:bg-accent/40"
                        } ${isLoading || !canLoad ? "pointer-events-none opacity-50" : ""}`}
                      >
                        <span className="font-medium">{style.label}</span>
                        <span className="text-xs text-muted-foreground">{style.desc}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Defines the tone and structure of generated proposals.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Creativity level (temperature)</Label>
                    <span className="text-sm text-muted-foreground">{proposalTemperature.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[proposalTemperature]}
                    min={0.3}
                    max={1.0}
                    step={0.1}
                    onValueChange={(vals) => setProposalTemperature(vals[0])}
                    disabled={isLoading || !canLoad}
                  />
                  <p className="text-muted-foreground text-xs">
                    Lower = more conservative and predictable. Higher = more creative and varied.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Vocabulary level</Label>
                  <div className="flex gap-1.5 rounded-full bg-muted/50 p-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setVocabularyLevel(value)}
                        className={`size-9 rounded-full text-sm transition-all duration-200 ${
                          value === vocabularyLevel
                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                        }`}
                        disabled={isLoading || !canLoad}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    1 = simple and clear, 5 = advanced and academic.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Feedback detail level</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        { value: "concise", label: "Concise", desc: "Brief highlights only" },
                        { value: "balanced", label: "Balanced", desc: "Moderate detail" },
                        { value: "detailed", label: "Detailed", desc: "Comprehensive analysis" },
                      ] as const
                    ).map((level) => (
                      <div
                        key={level.value}
                        role="button"
                        tabIndex={isLoading || !canLoad ? -1 : 0}
                        aria-disabled={isLoading || !canLoad}
                        onClick={() => {
                          if (isLoading || !canLoad) return
                          setFeedbackDetail(level.value)
                        }}
                        onKeyDown={(e) => {
                          if (isLoading || !canLoad) return
                          if (e.key !== "Enter" && e.key !== " ") return
                          e.preventDefault()
                          setFeedbackDetail(level.value)
                        }}
                        className={`flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-sm transition-all cursor-pointer ${
                          feedbackDetail === level.value
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/50 hover:border-primary/30 hover:bg-accent/40"
                        } ${isLoading || !canLoad ? "pointer-events-none opacity-50" : ""}`}
                      >
                        <span className="font-medium">{level.label}</span>
                        <span className="text-xs text-muted-foreground">{level.desc}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Controls how much feedback you receive on interview practice and proposals.
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/50 bg-card p-5">
                <div>
                  <Label>Focus Mode</Label>
                  <p className="text-muted-foreground text-xs mt-1">
                    Dim earlier messages after the AI responds so you can focus on your reply.
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2.5 transition-colors duration-150 hover:border-primary/30">
                  <span className="text-sm">Enable Focus Mode</span>
                  <Checkbox
                    checked={focusModeEnabled}
                    onCheckedChange={(value) => setFocusModeEnabled(value === true)}
                  />
                </div>

                {focusModeEnabled && (
                  <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Dim intensity</Label>
                      <span className="text-sm text-muted-foreground">{focusOpacity}%</span>
                    </div>
                    <Slider
                      value={[focusOpacity]}
                      min={0}
                      max={50}
                      step={5}
                      onValueChange={(vals) => setFocusOpacity(vals[0])}
                    />
                    <p className="text-muted-foreground text-xs">
                      How much to dim the conversation history. 0% = no dimming, 50% = heavy.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "interview_prep" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-medium">Interview Prep</h2>
                <p className="text-xs text-muted-foreground">Configure AI interview practice sessions</p>
              </div>
              <div className="space-y-5 rounded-xl border border-border/50 bg-card p-5">
                <div className="space-y-2">
                  <Label>Difficulty level</Label>
                  <div className="flex gap-2">
                    {(
                      [
                        { value: "easy", label: "Easy", color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" },
                        { value: "medium", label: "Medium", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20" },
                        { value: "hard", label: "Hard", color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" },
                      ] as const
                    ).map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setDifficultyLevel(level.value)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                          difficultyLevel === level.value
                            ? level.color
                            : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                        }`}
                        disabled={isLoading || !canLoad}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Higher difficulty means tougher questions and more pressure.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Session length (minutes)</Label>
                  <div className="flex gap-2">
                    {[5, 10, 15].map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setSessionLength(minutes)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                          sessionLength === minutes
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                        }`}
                        disabled={isLoading || !canLoad}
                      >
                        {minutes}m
                      </button>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Recommended practice duration per session.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 transition-colors duration-150 hover:border-primary/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Auto-save sessions</Label>
                    <p className="text-muted-foreground text-xs">
                      Automatically save transcripts and analysis.
                    </p>
                  </div>
                  <Checkbox
                    checked={autoSave}
                    onCheckedChange={(value) => setAutoSave(value === true)}
                    disabled={isLoading || !canLoad}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "beta" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-medium">Beta Features</h2>
                <p className="text-xs text-muted-foreground">Experimental features in active development</p>
              </div>
              <div className="space-y-4 rounded-xl border border-border/50 bg-card p-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label>LinkedIn Import Popup</Label>
                    <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
                      BETA
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Open a dedicated popup for entering your LinkedIn URL with real-time validation.
                  </p>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2.5 transition-colors duration-150 hover:border-primary/30">
                    <span className="text-sm">Enable LinkedIn Popup</span>
                    <Checkbox
                      checked={linkedinPopupEnabled}
                      onCheckedChange={(value) => setLinkedinPopupEnabled(value === true)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            {showCancel ? (
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
            ) : null}
            <Button
              onClick={handleSave}
              disabled={!canLoad || isLoading || isSaving}
              className="w-full shadow-sm sm:w-auto"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
