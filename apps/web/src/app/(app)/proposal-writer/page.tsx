"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { useSession } from "@/app/auth/session-provider"
import { supabase } from "@/lib/supabaseClient"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================

type Platform = "upwork" | "fiverr" | "linkedin" | "toptal" | "other"
type Tone = "professional" | "casual" | "confident"
type Length = "short" | "medium" | "long"

type HistoryMessage = { role: string; content: string }

type ProfileData = {
  displayName: string | null
  headline: string | null
  about: string | null
  skills: { name: string; years: number | null }[]
  experiences: {
    title: string
    company: string | null
    highlights: string | null
  }[]
  educations: {
    school: string | null
    degree: string | null
    field: string | null
  }[]
}

// ============================================================================
// Page
// ============================================================================

export default function ProposalWriterPage() {
  const { session } = useSession()

  // Input state
  const [jobPosting, setJobPosting] = useState("")
  const [platform, setPlatform] = useState<Platform>("upwork")
  const [customPlatform, setCustomPlatform] = useState("")
  const [tone, setTone] = useState<Tone>("professional")
  const [length, setLength] = useState<Length>("medium")

  // Output state
  const [proposal, setProposal] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refinement state
  const [conversationHistory, setConversationHistory] = useState<
    HistoryMessage[]
  >([])
  const [refinementInput, setRefinementInput] = useState("")
  const [hasGenerated, setHasGenerated] = useState(false)

  // Copy state
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Profile state
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [useProfile, setUseProfile] = useState(true)

  // Auto-scroll ref
  const outputRef = useRef<HTMLDivElement>(null)

  // Abort controller
  const abortRef = useRef<AbortController | null>(null)

  // ── Fetch profile data on mount ──────────────────────────────────────────

  useEffect(() => {
    async function fetchProfile() {
      if (!session?.user?.id) {
        setProfileLoading(false)
        return
      }

      try {
        const userId = session.user.id

        const [profileRes, skillsRes, experiencesRes, educationsRes] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("display_name, headline, about")
              .eq("user_id", userId)
              .maybeSingle(),
            supabase
              .from("user_skills")
              .select("name, years")
              .eq("user_id", userId),
            supabase
              .from("user_experiences")
              .select("title, company, highlights")
              .eq("user_id", userId),
            supabase
              .from("user_educations")
              .select("school, degree, field")
              .eq("user_id", userId),
          ])

        const profile = profileRes.data as {
          display_name: string | null
          headline: string | null
          about: string | null
        } | null
        const skills = (skillsRes.data ?? []) as {
          name: string
          years: number | null
        }[]
        const experiences = (experiencesRes.data ?? []) as {
          title: string
          company: string | null
          highlights: string | null
        }[]
        const educations = (educationsRes.data ?? []) as {
          school: string | null
          degree: string | null
          field: string | null
        }[]

        const hasAny =
          profile?.display_name ||
          profile?.headline ||
          skills.length > 0 ||
          experiences.length > 0 ||
          educations.length > 0

        if (hasAny) {
          setProfileData({
            displayName: profile?.display_name ?? null,
            headline: profile?.headline ?? null,
            about: profile?.about ?? null,
            skills,
            experiences,
            educations,
          })
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err)
      } finally {
        setProfileLoading(false)
      }
    }

    fetchProfile()
  }, [session?.user?.id])

  // Profile summary for display
  const profileSummary = useMemo(() => {
    if (!profileData) return null
    const parts: string[] = []
    if (profileData.skills.length > 0) {
      parts.push(`${profileData.skills.length} skills`)
    }
    if (profileData.experiences.length > 0) {
      parts.push(
        `${profileData.experiences.length} experience${profileData.experiences.length > 1 ? "s" : ""}`
      )
    }
    if (profileData.educations.length > 0) {
      parts.push(
        `${profileData.educations.length} education${profileData.educations.length > 1 ? "s" : ""}`
      )
    }
    return parts.join(", ")
  }, [profileData])

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [proposal, isStreaming])

  // Cleanup copy timeout
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  // ── Stream proposal ──────────────────────────────────────────────────────

  const streamProposal = useCallback(
    async (history: HistoryMessage[]) => {
      if (!session?.access_token) return

      setIsStreaming(true)
      setError(null)
      setProposal("")

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch("/api/v1/proposals/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            jobPosting,
            platform,
            customPlatform: platform === "other" ? customPlatform : undefined,
            tone,
            length,
            skipProfile: !useProfile,
            conversationHistory: history,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(
            data?.error?.message ?? `Request failed (${response.status})`
          )
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let accumulated = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === "text") {
                accumulated += parsed.content
                setProposal(accumulated)
              } else if (parsed.type === "error") {
                throw new Error(parsed.message)
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue
              throw e
            }
          }
        }

        // Update conversation history
        const newHistory: HistoryMessage[] = [
          ...history,
          { role: "assistant", content: accumulated },
        ]
        setConversationHistory(newHistory)
        setHasGenerated(true)
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return
        setError(err instanceof Error ? err.message : "Generation failed")
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [session?.access_token, jobPosting, platform, customPlatform, tone, length, useProfile]
  )

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(() => {
    const history: HistoryMessage[] = []
    setConversationHistory([])
    streamProposal(history)
  }, [streamProposal])

  const handleRegenerate = useCallback(() => {
    setConversationHistory([])
    streamProposal([])
  }, [streamProposal])

  const handleRefine = useCallback(() => {
    const feedback = refinementInput.trim()
    if (!feedback) return
    const updatedHistory: HistoryMessage[] = [
      ...conversationHistory,
      { role: "user", content: feedback },
    ]
    setConversationHistory(updatedHistory)
    setRefinementInput("")
    streamProposal(updatedHistory)
  }, [refinementInput, conversationHistory, streamProposal])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(proposal)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: no-op
    }
  }, [proposal])

  // ── Word count ───────────────────────────────────────────────────────────

  const wordCount = proposal.trim()
    ? proposal.trim().split(/\s+/).length
    : 0

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-hidden px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="shrink-0">
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Proposal Writer
            </h1>
            <Badge
              variant="secondary"
              className="text-xs font-semibold uppercase"
            >
              BETA
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Paste a job posting and get a winning freelance proposal powered by
            your profile.
          </p>
        </div>

        {/* Profile Context Card */}
        {!profileLoading && (
          <div className="shrink-0">
            {profileData ? (
              <Collapsible open={profileOpen} onOpenChange={setProfileOpen}>
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-4 py-2.5 text-sm text-muted-foreground">
                  {/* Toggle profile on/off */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setUseProfile((v) => !v)
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${useProfile ? "bg-green-500" : "bg-muted-foreground/30"}`}
                    role="switch"
                    aria-checked={useProfile}
                    aria-label="Use profile data"
                  >
                    <span
                      className={`pointer-events-none inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${useProfile ? "translate-x-[18px]" : "translate-x-[3px]"}`}
                    />
                  </button>

                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-2 text-left transition-colors hover:text-foreground"
                    >
                      <span className="flex-1">
                        {useProfile
                          ? `Using your profile: ${profileSummary}`
                          : "Profile data disabled"}
                      </span>
                      <ChevronDown
                        className={`size-4 shrink-0 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="mt-2 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-sm text-muted-foreground">
                    {profileData.displayName && (
                      <p className="mb-1">
                        <span className="font-medium text-foreground">
                          {profileData.displayName}
                        </span>
                        {profileData.headline && (
                          <span> — {profileData.headline}</span>
                        )}
                      </p>
                    )}
                    {profileData.skills.length > 0 && (
                      <p className="mb-1">
                        <span className="font-medium text-foreground">
                          Skills:{" "}
                        </span>
                        {profileData.skills.map((s) => s.name).join(", ")}
                      </p>
                    )}
                    {profileData.experiences.length > 0 && (
                      <div className="mb-1">
                        <span className="font-medium text-foreground">
                          Experience:{" "}
                        </span>
                        {profileData.experiences.map((e, i) => (
                          <span key={i}>
                            {e.title}
                            {e.company ? ` at ${e.company}` : ""}
                            {i < profileData.experiences.length - 1
                              ? ", "
                              : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    {profileData.educations.length > 0 && (
                      <p>
                        <span className="font-medium text-foreground">
                          Education:{" "}
                        </span>
                        {profileData.educations
                          .map((e) =>
                            [e.degree, e.field, e.school]
                              .filter(Boolean)
                              .join(", ")
                          )
                          .join(" | ")}
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-4 py-2.5 text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setUseProfile((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${useProfile ? "bg-yellow-500" : "bg-muted-foreground/30"}`}
                  role="switch"
                  aria-checked={useProfile}
                  aria-label="Use profile data"
                >
                  <span
                    className={`pointer-events-none inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${useProfile ? "translate-x-[18px]" : "translate-x-[3px]"}`}
                  />
                </button>
                <span className="flex-1">
                  {useProfile
                    ? "No profile data found. Complete onboarding for personalized proposals."
                    : "Profile data disabled — generating without profile context."}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Job Posting Input */}
        <Textarea
          value={jobPosting}
          onChange={(e) => setJobPosting(e.target.value)}
          placeholder="Paste the job title, description, and any requirements here..."
          className={`text-base ${hasGenerated || isStreaming ? "max-h-[120px] min-h-[80px] shrink-0" : "min-h-0 flex-1 resize-none"}`}
          disabled={isStreaming}
        />

        {/* Config Selects */}
        <div className="flex shrink-0 flex-wrap items-end gap-3">
          <div>
            <Select
              value={platform}
              onValueChange={(v) => setPlatform(v as Platform)}
              disabled={isStreaming}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upwork">Upwork</SelectItem>
                <SelectItem value="fiverr">Fiverr</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="toptal">Toptal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {platform === "other" && (
            <Input
              value={customPlatform}
              onChange={(e) => setCustomPlatform(e.target.value)}
              placeholder="e.g. Freelancer.com"
              className="w-[180px]"
              disabled={isStreaming}
            />
          )}

          <Select
            value={tone}
            onValueChange={(v) => setTone(v as Tone)}
            disabled={isStreaming}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="confident">Confident</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={length}
            onValueChange={(v) => setLength(v as Length)}
            disabled={isStreaming}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Length" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="short">Short</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="long">Long</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={jobPosting.trim().length < 10 || isStreaming}
          className="w-full shrink-0 gap-2"
          size="lg"
        >
          <Sparkles className="size-4" />
          {isStreaming ? "Generating..." : "Generate Proposal"}
        </Button>

        {/* Error */}
        {error && (
          <div className="shrink-0 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Output Card */}
        {(proposal || isStreaming) && (
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {/* Toolbar */}
              <div className="flex shrink-0 items-center justify-end gap-1 border-b border-border/50 px-4 py-2">
                {!isStreaming && hasGenerated && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleRegenerate}
                    title="Regenerate"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopy}
                  disabled={!proposal || isStreaming}
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>

              {/* Proposal content */}
              <div
                ref={outputRef}
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
              >
                <div className="prose prose-base prose-invert max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {proposal}
                  </ReactMarkdown>
                  {isStreaming && (
                    <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-foreground/50" />
                  )}
                </div>
              </div>

              {/* Word count footer */}
              {proposal && (
                <div className="shrink-0 border-t border-border/50 px-4 py-2 text-right">
                  <span className="text-xs text-muted-foreground">
                    {wordCount} words · {length}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Refinement Input */}
        {hasGenerated && !isStreaming && (
          <div className="flex shrink-0 gap-2">
            <Textarea
              value={refinementInput}
              onChange={(e) => setRefinementInput(e.target.value)}
              placeholder="Make it shorter, emphasize React experience, more casual..."
              className="min-h-[44px] flex-1 resize-none text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleRefine()
                }
              }}
            />
            <Button
              onClick={handleRefine}
              disabled={!refinementInput.trim()}
              size="default"
            >
              Refine
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
