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
const MAX_POLL_ATTEMPTS = 60 // 5 minutes max (60 * 5s)
const POLL_INTERVAL_SECONDS = 5

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
    `${BRIGHTDATA_API_BASE}/scrape?dataset_id=${BRIGHTDATA_DATASET_ID}&notify=false&include_errors=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`BrightData trigger failed: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as { snapshot_id: string }
  return data.snapshot_id
}

async function fetchSnapshot(
  snapshotId: string,
  apiKey: string
): Promise<{ status: "running" | "ready"; data?: BrightDataLinkedInProfile[] }> {
  const response = await fetch(`${BRIGHTDATA_API_BASE}/snapshot/${snapshotId}?format=json`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (response.status === 202) {
    return { status: "running" }
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`BrightData snapshot fetch failed: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as BrightDataLinkedInProfile[]
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

      // Step 2: Poll for results
      let attempts = 0
      let profiles: BrightDataLinkedInProfile[] = []

      while (attempts < MAX_POLL_ATTEMPTS) {
        attempts++
        logger.info(`Polling for results (attempt ${attempts}/${MAX_POLL_ATTEMPTS})...`)

        const result = await fetchSnapshot(snapshotId, apiKey)

        if (result.status === "ready" && result.data) {
          profiles = result.data
          logger.info(`Received ${profiles.length} profile(s)`)
          break
        }

        // Wait before next poll
        await wait.for({ seconds: POLL_INTERVAL_SECONDS })
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
