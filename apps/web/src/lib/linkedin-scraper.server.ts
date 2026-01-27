import "server-only"
import { tasks, runs } from "@trigger.dev/sdk/v3"

// ============================================================================
// Types
// ============================================================================

export interface DistilledProfile {
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
  experienceLevel:
    | "intern_new_grad"
    | "entry"
    | "mid"
    | "senior"
    | "lead"
    | "director"
    | null
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

export type ScrapeStatus =
  | { status: "running" }
  | { status: "completed"; profile: DistilledProfile }
  | { status: "failed"; error: string }

// ============================================================================
// Public API
// ============================================================================

/**
 * Trigger a LinkedIn profile scrape via trigger.dev.
 * Returns immediately with a run ID for polling.
 */
export async function triggerLinkedInScrape(url: string): Promise<{ runId: string }> {
  const handle = await tasks.trigger("linkedin-profile-scraper", { url })
  return { runId: handle.id }
}

/**
 * Check the status of a LinkedIn scrape run.
 * Returns the current status and profile data if completed.
 */
export async function getLinkedInScrapeStatus(runId: string): Promise<ScrapeStatus> {
  const run = await runs.retrieve(runId)

  if (run.status === "COMPLETED") {
    const output = run.output as LinkedInScraperOutput | undefined
    if (output?.success && output.profile) {
      return { status: "completed", profile: output.profile }
    }
    return {
      status: "failed",
      error: output?.error ?? "Scraping completed but returned no profile data",
    }
  }

  const terminalFailures = new Set([
    "FAILED",
    "CRASHED",
    "SYSTEM_FAILURE",
    "INTERRUPTED",
    "CANCELED",
    "EXPIRED",
    "TIMED_OUT",
  ])

  if (terminalFailures.has(run.status)) {
    return {
      status: "failed",
      error: `Run ${run.status.toLowerCase().replace(/_/g, " ")}`,
    }
  }

  return { status: "running" }
}
