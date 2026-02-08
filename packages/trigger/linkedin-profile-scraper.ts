/**
 * LinkedIn Profile Scraper Task
 *
 * A trigger.dev task that scrapes LinkedIn profiles using BrightData
 * and returns LLM-optimized, onboarding-ready data.
 *
 * Designed for AI agent invocation - fast, retriable, scalable.
 */

import { logger, schemaTask, wait } from "@trigger.dev/sdk/v3"
import { z } from "zod"

// ============================================================================
// Constants
// ============================================================================

const BRIGHTDATA_DATASET_ID = "gd_l1viktl72bvl7bjuj0"
const BRIGHTDATA_API_BASE = "https://api.brightdata.com/datasets/v3"
const MAX_POLL_ATTEMPTS = 60 // ~6 minutes max with progressive intervals

/**
 * Progressive polling intervals to reduce BrightData API calls while staying responsive.
 *
 * Most scrapes complete in 1-2 minutes, so we check frequently early, then back off.
 * Expected savings:
 * - Fast scrapes (<30s): Complete 2-3x faster (2s vs 5s checks)
 * - Typical scrapes (1-2min): ~same # of calls but better responsiveness
 * - Slow scrapes (3-5min): 30-40% fewer API calls (10s vs 5s intervals at tail)
 */
function getPollInterval(attemptNumber: number): number {
  if (attemptNumber <= 5) return 2 // First 10 seconds: check every 2s (fast scrapes)
  if (attemptNumber <= 15) return 5 // Next 50 seconds: check every 5s (typical scrapes)
  return 10 // After 60s: check every 10s (slow scrapes)
}

// ============================================================================
// Input/Output Schemas (Zod)
// ============================================================================

// Input schema - what AI agents will send
const LinkedInScraperInputSchema = z.object({
  url: z
    .string()
    .url()
    .refine(
      (url) => url.includes("linkedin.com/in/"),
      "Must be a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)"
    ),
  // Optional: allow batch scraping
  additionalUrls: z.array(z.string().url()).optional(),
})

// Output schemas - LLM-optimized, matching onboarding requirements
const SkillSchema = z.object({
  name: z.string(),
})

const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  highlights: z.string().nullable(),
  location: z.string().nullable(),
  duration: z.string().nullable(),
})

const EducationSchema = z.object({
  school: z.string(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  startYear: z.string().nullable(),
  endYear: z.string().nullable(),
})

const CertificationSchema = z.object({
  title: z.string(),
  issuer: z.string().nullable(),
  date: z.string().nullable(),
})

const ActivitySchema = z.object({
  title: z.string(),
  link: z.string().nullable(),
  interaction: z.string().nullable(),
})

// The distilled profile output - optimized for LLM context
const DistilledProfileSchema = z.object({
  // Identity
  name: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  headline: z.string().nullable(),
  about: z.string().nullable(),
  avatarUrl: z.string().nullable(),

  // Location
  location: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string().nullable(),

  // Current status
  currentCompany: z.string().nullable(),
  currentTitle: z.string().nullable(),

  // Professional data (for onboarding)
  experienceLevel: z
    .enum(["intern_new_grad", "entry", "mid", "senior", "lead", "director"])
    .nullable(),
  skills: z.array(SkillSchema),
  experiences: z.array(ExperienceSchema),
  educations: z.array(EducationSchema),
  certifications: z.array(CertificationSchema),

  // Social proof
  followers: z.number().nullable(),
  connections: z.number().nullable(),
  recommendationsCount: z.number().nullable(),

  // Additional context
  languages: z.array(z.string()),
  recentActivity: z.array(ActivitySchema),

  // Meta
  linkedinUrl: z.string(),
  linkedinId: z.string().nullable(),
  scrapedAt: z.string(),
})

// Task output
const TaskOutputSchema = z.object({
  success: z.boolean(),
  profile: DistilledProfileSchema.nullable(),
  profiles: z.array(DistilledProfileSchema).optional(),
  error: z.string().nullable(),
  rawSnapshotId: z.string().nullable(),
})

export type LinkedInScraperInput = z.infer<typeof LinkedInScraperInputSchema>
export type DistilledProfile = z.infer<typeof DistilledProfileSchema>
export type LinkedInScraperOutput = z.infer<typeof TaskOutputSchema>

// ============================================================================
// Raw BrightData Response Type (partial)
// ============================================================================

interface BrightDataLinkedInProfile {
  id?: string
  name?: string
  first_name?: string
  last_name?: string
  city?: string
  country_code?: string
  location?: string | null
  about?: string
  avatar?: string
  headline?: string
  url?: string
  input_url?: string
  linkedin_id?: string
  linkedin_num_id?: string
  followers?: number
  connections?: number
  recommendations_count?: number
  current_company_name?: string
  current_company?: {
    name?: string
    link?: string
  }
  experience?: Array<{
    title?: string
    company?: string
    company_url?: string
    location?: string
    start_date?: string
    end_date?: string
    duration?: string
    description?: string
  }> | null
  education?: Array<{
    title?: string // school name
    url?: string
    start_year?: string
    end_year?: string
    degree?: string
    field_of_study?: string
    description?: string | null
  }>
  skills?: Array<{
    title?: string
  }>
  certifications?: Array<{
    title?: string
    subtitle?: string
    date?: string
  }>
  languages?: Array<{
    title?: string
    proficiency?: string
  }>
  activity?: Array<{
    title?: string
    link?: string
    interaction?: string
    img?: string
  }>
  honors_and_awards?: Array<{
    title?: string
    issuer?: string
    date?: string
  }> | null
}

// ============================================================================
// Distillation Logic
// ============================================================================

/**
 * Infer experience level from years of experience and titles
 */
function inferExperienceLevel(
  experiences: BrightDataLinkedInProfile["experience"]
): DistilledProfile["experienceLevel"] {
  if (!experiences || experiences.length === 0) return null

  const titles = experiences.map((e) => e.title?.toLowerCase() ?? "")

  // Check for leadership titles
  if (titles.some((t) => /\b(ceo|cto|cfo|coo|chief|director|vp|vice president)\b/.test(t))) {
    return "director"
  }
  if (titles.some((t) => /\b(lead|head|principal|staff|architect)\b/.test(t))) {
    return "lead"
  }
  if (titles.some((t) => /\b(senior|sr\.?|iii)\b/.test(t))) {
    return "senior"
  }
  if (titles.some((t) => /\b(junior|jr\.?|associate|ii)\b/.test(t))) {
    return "entry"
  }
  if (titles.some((t) => /\b(intern|trainee|apprentice|graduate)\b/.test(t))) {
    return "intern_new_grad"
  }

  // Estimate by experience count
  if (experiences.length >= 5) return "senior"
  if (experiences.length >= 3) return "mid"
  if (experiences.length >= 1) return "entry"

  return null
}

/**
 * Distill raw BrightData profile into LLM-optimized format
 */
function distillProfile(raw: BrightDataLinkedInProfile): DistilledProfile {
  const name =
    raw.name ||
    [raw.first_name, raw.last_name].filter(Boolean).join(" ") ||
    "Unknown"

  // Extract skills
  const skills: DistilledProfile["skills"] =
    raw.skills?.map((s) => ({ name: s.title ?? "Unknown" })).filter((s) => s.name !== "Unknown") ??
    []

  // Extract experiences
  const experiences: DistilledProfile["experiences"] =
    raw.experience?.map((e) => ({
      title: e.title ?? "Unknown Role",
      company: e.company ?? null,
      startDate: e.start_date ?? null,
      endDate: e.end_date ?? null,
      highlights: e.description ?? null,
      location: e.location ?? null,
      duration: e.duration ?? null,
    })) ?? []

  // Synthesize experience from current_company if experience array is empty
  const currentCompanyName = raw.current_company_name ?? raw.current_company?.name
  if (experiences.length === 0 && currentCompanyName) {
    experiences.push({
      title: raw.headline ?? "Current Role",
      company: currentCompanyName,
      startDate: null,
      endDate: null,
      highlights: null,
      location: raw.location ?? raw.city ?? null,
      duration: null,
    })
  }

  // Extract education
  const educations: DistilledProfile["educations"] =
    raw.education?.map((e) => ({
      school: e.title ?? "Unknown School",
      degree: e.degree ?? null,
      field: e.field_of_study ?? null,
      startYear: e.start_year ?? null,
      endYear: e.end_year ?? null,
    })) ?? []

  // Extract certifications
  const certifications: DistilledProfile["certifications"] =
    raw.certifications?.map((c) => ({
      title: c.title ?? "Unknown",
      issuer: c.subtitle ?? null,
      date: c.date ?? null,
    })) ?? []

  // Extract languages
  const languages: string[] =
    raw.languages?.map((l) => l.title ?? "").filter((l) => l.length > 0) ?? []

  // Extract recent activity (limit to 5)
  const recentActivity: DistilledProfile["recentActivity"] =
    raw.activity?.slice(0, 5).map((a) => ({
      title: a.title ?? "",
      link: a.link ?? null,
      interaction: a.interaction ?? null,
    })) ?? []

  // Get current title from first experience
  const currentTitle = raw.experience?.[0]?.title ?? null

  return {
    // Identity
    name,
    firstName: raw.first_name ?? null,
    lastName: raw.last_name ?? null,
    headline: raw.headline ?? null,
    about: raw.about ?? null,
    avatarUrl: raw.avatar ?? null,

    // Location
    location: raw.location ?? raw.city ?? null,
    city: raw.city ?? null,
    countryCode: raw.country_code ?? null,

    // Current status
    currentCompany: raw.current_company_name ?? raw.current_company?.name ?? null,
    currentTitle,

    // Professional data
    experienceLevel: inferExperienceLevel(raw.experience),
    skills,
    experiences,
    educations,
    certifications,

    // Social proof
    followers: raw.followers ?? null,
    connections: raw.connections ?? null,
    recommendationsCount: raw.recommendations_count ?? null,

    // Additional context
    languages,
    recentActivity,

    // Meta
    linkedinUrl: raw.url ?? raw.input_url ?? "",
    linkedinId: raw.linkedin_id ?? raw.linkedin_num_id ?? null,
    scrapedAt: new Date().toISOString(),
  }
}

// ============================================================================
// BrightData API Helpers
// ============================================================================

async function triggerScrape(urls: string[], apiKey: string): Promise<string> {
  const input = urls.map((url) => ({ url }))

  const response = await fetch(
    `${BRIGHTDATA_API_BASE}/trigger?dataset_id=${BRIGHTDATA_DATASET_ID}&include_errors=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`BrightData trigger failed: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as Record<string, unknown>
  logger.info("BrightData trigger response", { data })

  // Handle multiple possible response formats from BrightData
  const snapshotId =
    (data.snapshot_id as string) ||
    (data.snapshotId as string) ||
    (data.id as string) ||
    (data.snapshot as string)

  if (!snapshotId) {
    throw new Error(`BrightData returned unexpected response format: ${JSON.stringify(data)}`)
  }

  return snapshotId
}

async function checkProgress(
  snapshotId: string,
  apiKey: string
): Promise<{ status: "running" | "ready" | "failed"; error?: string }> {
  const response = await fetch(`${BRIGHTDATA_API_BASE}/progress/${snapshotId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!response.ok) {
    // If progress endpoint fails, assume running and let snapshot fetch handle it
    logger.warn(`Progress check failed: ${response.status}`)
    return { status: "running" }
  }

  const data = (await response.json()) as Record<string, unknown>
  logger.info("BrightData progress response", { data })

  const status = data.status as string
  if (status === "ready" || status === "completed") {
    return { status: "ready" }
  }
  if (status === "failed" || status === "error") {
    return { status: "failed", error: (data.error as string) || "Unknown error" }
  }
  return { status: "running" }
}

async function fetchSnapshot(
  snapshotId: string,
  apiKey: string
): Promise<{ status: "running" | "ready"; data?: BrightDataLinkedInProfile[] }> {
  // First check progress
  const progress = await checkProgress(snapshotId, apiKey)
  if (progress.status === "running") {
    return { status: "running" }
  }
  if (progress.status === "failed") {
    throw new Error(`BrightData scrape failed: ${progress.error}`)
  }

  // Progress is ready, fetch the snapshot
  const response = await fetch(`${BRIGHTDATA_API_BASE}/snapshot/${snapshotId}?format=json`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (response.status === 202) {
    return { status: "running" }
  }

  if (!response.ok) {
    const errorText = await response.text()
    logger.error("Snapshot fetch failed", { status: response.status, error: errorText })
    throw new Error(`BrightData snapshot fetch failed: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as BrightDataLinkedInProfile[]
  logger.info(`Snapshot fetched successfully with ${data.length} profile(s)`)
  return { status: "ready", data }
}

// ============================================================================
// The Task
// ============================================================================

export const scrapeLinkedInProfile = schemaTask({
  id: "linkedin-profile-scraper",
  schema: LinkedInScraperInputSchema,

  // Retry configuration for resilience
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },

  // Allow up to 10 minutes for scraping (BrightData can be slow)
  maxDuration: 600,

  run: async (payload) => {
    const apiKey = process.env.BRIGHTDATA_API_KEY
    if (!apiKey) {
      logger.error("BRIGHTDATA_API_KEY not configured")
      return {
        success: false,
        profile: null,
        error: "BRIGHTDATA_API_KEY environment variable is not set",
        rawSnapshotId: null,
      } satisfies LinkedInScraperOutput
    }

    // Collect all URLs
    const urls = [payload.url, ...(payload.additionalUrls ?? [])]
    logger.info(`Scraping ${urls.length} LinkedIn profile(s)`, { urls })

    try {
      // Step 1: Trigger the scrape
      logger.info("Triggering BrightData scrape...")
      const snapshotId = await triggerScrape(urls, apiKey)
      logger.info(`Snapshot created: ${snapshotId}`)

      // Step 2: Poll for results with progressive intervals
      let attempts = 0
      let profiles: BrightDataLinkedInProfile[] = []

      while (attempts < MAX_POLL_ATTEMPTS) {
        attempts++
        const interval = getPollInterval(attempts)
        logger.info(`Polling for results (attempt ${attempts}/${MAX_POLL_ATTEMPTS}, next check in ${interval}s)...`)

        const result = await fetchSnapshot(snapshotId, apiKey)

        if (result.status === "ready" && result.data) {
          profiles = result.data
          logger.info(`Received ${profiles.length} profile(s) after ${attempts} attempts`)
          break
        }

        // Wait with progressive interval before next poll
        await wait.for({ seconds: interval })
      }

      if (profiles.length === 0) {
        return {
          success: false,
          profile: null,
          error: "Scraping timed out or returned no data",
          rawSnapshotId: snapshotId,
        } satisfies LinkedInScraperOutput
      }

      // Step 3: Distill the profiles
      const distilledProfiles = profiles.map(distillProfile)
      logger.info(`Distilled ${distilledProfiles.length} profile(s)`)

      // Return single profile or batch
      if (distilledProfiles.length === 1) {
        return {
          success: true,
          profile: distilledProfiles[0],
          error: null,
          rawSnapshotId: snapshotId,
        } satisfies LinkedInScraperOutput
      }

      return {
        success: true,
        profile: distilledProfiles[0], // Primary profile
        profiles: distilledProfiles, // All profiles for batch
        error: null,
        rawSnapshotId: snapshotId,
      } satisfies LinkedInScraperOutput
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      logger.error("Scraping failed", { error: errorMessage })

      return {
        success: false,
        profile: null,
        error: errorMessage,
        rawSnapshotId: null,
      } satisfies LinkedInScraperOutput
    }
  },
})
