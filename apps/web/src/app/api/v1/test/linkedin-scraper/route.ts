import { NextResponse } from "next/server"
import { tasks, runs } from "@trigger.dev/sdk/v3"

/**
 * Type definitions matching the LinkedIn scraper task output
 */
interface DistilledProfile {
  name: string
  firstName: string | null
  lastName: string | null
  headline: string | null
  about: string | null
  avatarUrl: string | null
  location: string | null
  city: string | null
  countryCode: string | null
  currentCompany: string | null
  currentTitle: string | null
  experienceLevel: "intern_new_grad" | "entry" | "mid" | "senior" | "lead" | "director" | null
  skills: { name: string }[]
  experiences: {
    title: string
    company: string | null
    startDate: string | null
    endDate: string | null
    highlights: string | null
    location: string | null
    duration: string | null
  }[]
  educations: {
    school: string
    degree: string | null
    field: string | null
    startYear: string | null
    endYear: string | null
  }[]
  certifications: {
    title: string
    issuer: string | null
    date: string | null
  }[]
  followers: number | null
  connections: number | null
  recommendationsCount: number | null
  languages: string[]
  recentActivity: {
    title: string
    link: string | null
    interaction: string | null
  }[]
  linkedinUrl: string
  linkedinId: string | null
  scrapedAt: string
}

interface LinkedInScraperOutput {
  success: boolean
  profile: DistilledProfile | null
  profiles?: DistilledProfile[]
  error: string | null
  rawSnapshotId: string | null
}

/**
 * Subscribe to run completion using realtime updates
 * This avoids polling and doesn't count against compute usage
 */
async function waitForRunCompletion(runId: string): Promise<{
  ok: boolean
  output?: LinkedInScraperOutput
  error?: string
}> {
  // Use realtime subscription instead of polling to avoid compute costs
  // runs.subscribeToRun returns an async iterator that yields run updates
  for await (const run of runs.subscribeToRun(runId)) {
    // Check if run is completed successfully
    if (run.isCompleted && run.isSuccess) {
      return {
        ok: true,
        output: run.output as LinkedInScraperOutput,
      }
    }

    // Check if run failed
    if (run.isCompleted && !run.isSuccess) {
      return {
        ok: false,
        error: `Run failed: ${run.error?.message ?? "Unknown error"}`,
      }
    }

    // Check for terminal failure states
    if (run.status === "EXPIRED" || run.status === "TIMED_OUT") {
      return {
        ok: false,
        error: `Run ${run.status.toLowerCase()}`,
      }
    }
  }

  // If subscription ended without completion
  return {
    ok: false,
    error: "Run subscription ended unexpectedly",
  }
}

/**
 * POST /api/v1/test/linkedin-scraper
 *
 * Test endpoint for the LinkedIn profile scraper.
 * Triggers the trigger.dev task and waits for the result.
 *
 * Request body:
 * - url: LinkedIn profile URL (e.g., https://linkedin.com/in/username)
 *
 * Response:
 * - success: boolean
 * - profile: DistilledProfile | null
 * - error: string | null
 * - rawSnapshotId: string | null
 * - runId: string (trigger.dev run ID)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, profile: null, error: "URL is required", rawSnapshotId: null },
        { status: 400 }
      )
    }

    // Validate LinkedIn URL format
    if (!url.includes("linkedin.com/in/")) {
      return NextResponse.json(
        {
          success: false,
          profile: null,
          error: "Invalid LinkedIn URL. Must be a profile URL (e.g., https://linkedin.com/in/username)",
          rawSnapshotId: null,
        },
        { status: 400 }
      )
    }

    // Trigger the task
    const handle = await tasks.trigger("linkedin-profile-scraper", { url })

    // Subscribe to realtime updates (task can take 2-5 minutes due to BrightData)
    // Using subscribeToRun avoids compute costs from short polling intervals
    const result = await waitForRunCompletion(handle.id)

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          profile: null,
          error: result.error ?? "Unknown error",
          rawSnapshotId: null,
          runId: handle.id,
        },
        { status: 500 }
      )
    }

    const output = result.output!

    return NextResponse.json({
      success: output.success,
      profile: output.profile,
      error: output.error,
      rawSnapshotId: output.rawSnapshotId,
      runId: handle.id,
    })
  } catch (error) {
    console.error("LinkedIn scraper API error:", error)
    return NextResponse.json(
      {
        success: false,
        profile: null,
        error: error instanceof Error ? error.message : "Internal server error",
        rawSnapshotId: null,
      },
      { status: 500 }
    )
  }
}
