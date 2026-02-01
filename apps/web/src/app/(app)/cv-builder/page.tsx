"use client"

import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { useSession } from "@/app/auth/session-provider"
import { CVPreview, emptyCVData, type CVData } from "@/components/cv-preview"
import { CVChat } from "@/components/cv-chat"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Download, Eye, MessageSquare, RefreshCw } from "lucide-react"

// ============================================================================
// State Management
// ============================================================================

type ToolCallEvent = {
  name: string
  args: Record<string, unknown>
}

type CVAction =
  | { type: "SET_DATA"; data: CVData }
  | { type: "APPLY_TOOL_CALLS"; toolCalls: ToolCallEvent[] }

function cvReducer(state: CVData, action: CVAction): CVData {
  switch (action.type) {
    case "SET_DATA":
      return action.data

    case "APPLY_TOOL_CALLS": {
      let next = { ...state }

      for (const tc of action.toolCalls) {
        switch (tc.name) {
          case "update_personal_info": {
            const args = tc.args as {
              name?: string | null
              headline?: string | null
              email?: string | null
              location?: string | null
            }
            next = {
              ...next,
              personalInfo: {
                ...next.personalInfo,
                ...(args.name != null && { name: args.name }),
                ...(args.headline != null && { headline: args.headline }),
                ...(args.email != null && { email: args.email }),
                ...(args.location != null && { location: args.location }),
              },
            }
            break
          }

          case "update_summary": {
            const args = tc.args as { summary: string }
            next = { ...next, summary: args.summary }
            break
          }

          case "update_experience": {
            const args = tc.args as {
              index: number
              title?: string | null
              company?: string | null
              startDate?: string | null
              endDate?: string | null
              highlights?: string | null
            }
            const experiences = [...next.experiences]
            if (args.index >= 0 && args.index < experiences.length) {
              const existing = experiences[args.index]
              experiences[args.index] = {
                ...existing,
                ...(args.title != null && { title: args.title }),
                ...(args.company != null && { company: args.company }),
                ...(args.startDate != null && { startDate: args.startDate }),
                ...(args.endDate !== undefined && { endDate: args.endDate }),
                ...(args.highlights != null && { highlights: args.highlights }),
              }
              next = { ...next, experiences }
            }
            break
          }

          case "update_education": {
            const args = tc.args as {
              index: number
              school?: string | null
              degree?: string | null
              field?: string | null
              startYear?: number | null
              endYear?: number | null
            }
            const educations = [...next.educations]
            if (args.index >= 0 && args.index < educations.length) {
              const existing = educations[args.index]
              educations[args.index] = {
                ...existing,
                ...(args.school != null && { school: args.school }),
                ...(args.degree != null && { degree: args.degree }),
                ...(args.field != null && { field: args.field }),
                ...(args.startYear !== undefined && { startYear: args.startYear }),
                ...(args.endYear !== undefined && { endYear: args.endYear }),
              }
              next = { ...next, educations }
            }
            break
          }

          case "update_skills": {
            const args = tc.args as {
              skills: Array<{ name: string; level: number; years: number | null }>
            }
            next = { ...next, skills: args.skills }
            break
          }
        }
      }

      return next
    }

    default:
      return state
  }
}

// ============================================================================
// Data Fetching & Generation
// ============================================================================

type CVDataResponse = {
  rawProfile: CVData
  generatedCV: CVData | null
}

async function fetchCVData(accessToken: string): Promise<CVDataResponse> {
  const response = await fetch("/api/v1/cv-builder/data", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch CV data")
  }

  return response.json()
}

async function generateCV(
  accessToken: string,
  rawProfileData: CVData,
  onProgress: (message: string) => void,
): Promise<CVData> {
  const response = await fetch("/api/v1/cv-builder/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ rawProfileData }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error?.message || "Failed to generate CV")
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let generatedCV: CVData | null = null

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
        if (parsed.type === "progress") {
          onProgress(parsed.message)
        } else if (parsed.type === "cv_generated") {
          generatedCV = parsed.data
        } else if (parsed.type === "error") {
          throw new Error(parsed.message || "Generation failed")
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }

  if (!generatedCV) {
    throw new Error("No CV was generated")
  }

  return generatedCV
}

async function saveCV(accessToken: string, cvData: CVData): Promise<void> {
  const response = await fetch("/api/v1/cv-builder/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ cvData }),
  })

  if (!response.ok) {
    console.error("Failed to save CV")
  }
}

// ============================================================================
// Page Component
// ============================================================================

export default function CVBuilderPage() {
  const { session, isLoading: isSessionLoading } = useSession()
  const [cvData, dispatch] = useReducer(cvReducer, emptyCVData())
  const [rawProfile, setRawProfile] = useState<CVData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState("")
  const generationTriggered = useRef(false)

  // Fetch profile data once session is available
  useEffect(() => {
    if (isSessionLoading) return
    if (!session?.access_token) return

    let cancelled = false

    fetchCVData(session.access_token)
      .then((response) => {
        if (cancelled) return
        setRawProfile(response.rawProfile)

        if (response.generatedCV) {
          // Use existing generated CV
          dispatch({ type: "SET_DATA", data: response.generatedCV })
        } else if (!generationTriggered.current) {
          // Auto-generate if no existing CV
          generationTriggered.current = true
          setIsGenerating(true)
          setGenerationProgress("Starting generation...")

          generateCV(
            session.access_token,
            response.rawProfile,
            (msg) => { if (!cancelled) setGenerationProgress(msg) },
          )
            .then((cv) => {
              if (!cancelled) dispatch({ type: "SET_DATA", data: cv })
            })
            .catch((err) => {
              console.error("CV generation failed:", err)
              // Fall back to raw profile
              if (!cancelled) dispatch({ type: "SET_DATA", data: response.rawProfile })
            })
            .finally(() => {
              if (!cancelled) {
                setIsGenerating(false)
                setGenerationProgress("")
              }
            })
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false)
      })

    return () => {
      cancelled = true
    }
  }, [session?.access_token, isSessionLoading])

  const handleRegenerate = useCallback(async () => {
    if (!session?.access_token || !rawProfile || isGenerating) return

    setIsGenerating(true)
    setGenerationProgress("Starting generation...")

    try {
      const cv = await generateCV(
        session.access_token,
        rawProfile,
        setGenerationProgress,
      )
      dispatch({ type: "SET_DATA", data: cv })
    } catch (err) {
      console.error("CV regeneration failed:", err)
    } finally {
      setIsGenerating(false)
      setGenerationProgress("")
    }
  }, [session?.access_token, rawProfile, isGenerating])

  const handleCVUpdate = useCallback((toolCalls: ToolCallEvent[]) => {
    dispatch({ type: "APPLY_TOOL_CALLS", toolCalls })
  }, [])

  // Save CV to DB whenever cvData changes (after initial load)
  const isInitialLoad = useRef(true)
  useEffect(() => {
    if (isLoadingData || isGenerating) {
      isInitialLoad.current = true
      return
    }
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }
    if (!session?.access_token) return

    // Debounce save
    const timeout = setTimeout(() => {
      saveCV(session.access_token, cvData)
    }, 1000)

    return () => clearTimeout(timeout)
  }, [cvData, session?.access_token, isLoadingData, isGenerating])

  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  // If session finished loading with no token, stop showing spinner
  const effectiveLoading = isSessionLoading || (isLoadingData && !!session?.access_token)

  if (effectiveLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading profile data...</span>
        </div>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">{generationProgress || "Generating your CV..."}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden" data-cv-builder>
      {/* Desktop: two-column layout */}
      <div className="hidden h-full lg:grid lg:grid-cols-2">
        {/* Left: CV Preview */}
        <div className="flex flex-col border-r">
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
            <h2 className="text-sm font-semibold">Preview</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportPDF}
                className="gap-1.5"
              >
                <Download className="size-3.5" />
                Export PDF
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 bg-muted/30">
            <div className="p-4">
              <CVPreview data={cvData} className="rounded-lg border shadow-sm" />
            </div>
          </ScrollArea>
        </div>

        {/* Right: AI Chat */}
        <CVChat
          cvData={cvData}
          onCVUpdate={handleCVUpdate}
          className="h-full overflow-hidden"
        />
      </div>

      {/* Mobile: tabbed layout */}
      <Tabs defaultValue="preview" className="flex h-full flex-col lg:hidden">
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="size-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5">
              <MessageSquare className="size-3.5" />
              Chat
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPDF}
              className="gap-1.5"
            >
              <Download className="size-3.5" />
            </Button>
          </div>
        </div>

        <TabsContent value="preview" className="min-h-0 flex-1 overflow-hidden bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-4">
              <CVPreview data={cvData} className="rounded-lg border shadow-sm" />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="chat" className="min-h-0 flex-1 overflow-hidden">
          <CVChat
            cvData={cvData}
            onCVUpdate={handleCVUpdate}
            className="h-full"
          />
        </TabsContent>
      </Tabs>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the CV preview */
          body * {
            visibility: hidden;
          }
          [data-cv-preview],
          [data-cv-preview] * {
            visibility: visible;
          }
          [data-cv-preview] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          /* A4 page setup */
          @page {
            size: A4;
            margin: 0;
          }

          /* Ensure clean background */
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  )
}
