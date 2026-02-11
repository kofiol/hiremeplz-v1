/**
 * Job Normalizer
 *
 * Converts raw BrightData LinkedIn job objects into canonical schema
 * for the `jobs` table. Handles dedup, validation, and skill extraction.
 *
 * Ported from playground/raw-job-object-normalizer/route.ts
 */

import { createHash } from "node:crypto"

// ============================================================================
// Types
// ============================================================================

export type RawLinkedInJob = {
  url?: string
  job_posting_id?: string
  job_title?: string
  company_name?: string
  job_location?: string
  job_summary?: string
  job_seniority_level?: string
  job_function?: string
  job_industries?: string
  company_url?: string
  job_posted_time?: string
  job_num_applicants?: number
  discovery_input?: Record<string, unknown>
  apply_link?: string | null
  country_code?: string | null
  title_id?: string | null
  company_logo?: string | null
  job_posted_date?: string | null
  job_poster?: string | null
  application_availability?: boolean
  job_description_formatted?: string
  base_salary?: unknown
  salary_standards?: unknown
  is_easy_apply?: boolean
  timestamp?: string
  input?: {
    url?: string
    discovery_input?: Record<string, unknown>
  }
  [key: string]: unknown
}

export type CanonicalJob = {
  team_id: string
  platform: "linkedin" | "upwork"
  platform_job_id: string
  company_name: string | null
  company_logo_url: string | null
  title: string
  description: string
  apply_url: string
  posted_at: string | null
  fetched_at: string | null
  budget_type: string
  fixed_budget_min: number | null
  fixed_budget_max: number | null
  hourly_min: number | null
  hourly_max: number | null
  currency: string
  client_country: string | null
  client_rating: number | null
  client_hires: number | null
  client_payment_verified: boolean | null
  skills: string[]
  seniority: string | null
  category: string | null
  canonical_hash: string
}

export type JobSource = {
  team_id: string
  platform: "linkedin" | "upwork"
  platform_job_id: string
  url: string | null
  fetched_at: string | null
  raw_json: RawLinkedInJob
}

type NormalizeOptions = {
  teamId: string
  platform: "linkedin" | "upwork"
}

// ============================================================================
// String Helpers
// ============================================================================

function normalizeWhitespace(value: string | null | undefined) {
  if (!value) return null
  return value.replace(/\s+/g, " ").replace(/\s+,/g, ",").trim() || null
}

function truncateText(value: string | null | undefined, maxLength: number) {
  if (!value) return null
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength)
}

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

// ============================================================================
// Field Extraction
// ============================================================================

function inferClientCountry(raw: RawLinkedInJob) {
  if (raw.country_code && typeof raw.country_code === "string") {
    return raw.country_code
  }
  if (raw.job_location && typeof raw.job_location === "string") {
    const normalized = normalizeWhitespace(raw.job_location)
    if (!normalized) return null
    const parts = normalized.split(",")
    const last = parts[parts.length - 1]?.trim()
    return last || null
  }
  return null
}

function buildDescription(raw: RawLinkedInJob) {
  const title = normalizeWhitespace(raw.job_title)
  const company = normalizeWhitespace(raw.company_name)
  const location = normalizeWhitespace(raw.job_location)
  const summary = normalizeWhitespace(raw.job_summary)
  const formatted = normalizeWhitespace(raw.job_description_formatted)
  const segments: string[] = []
  if (title) {
    segments.push(title)
  }
  if (company) {
    segments.push(`Company: ${company}`)
  }
  if (location) {
    segments.push(`Location: ${location}`)
  }
  if (summary && summary !== title) {
    segments.push(summary)
  }
  if (formatted && formatted !== summary) {
    segments.push(formatted)
  }
  const joined = segments.join("\n")
  const normalized = normalizeWhitespace(joined)
  if (!normalized) return ""
  return truncateText(normalized, 4000) ?? ""
}

const SKILL_DICTIONARY = [
  "react",
  "next.js",
  "nextjs",
  "typescript",
  "javascript",
  "node.js",
  "node",
  "tailwind",
  "tailwindcss",
  "supabase",
  "postgres",
  "postgresql",
  "sql",
  "aws",
  "gcp",
  "azure",
  "docker",
  "kubernetes",
]

function extractSkills(title: string, description: string) {
  const target = `${title} ${description}`.toLowerCase()
  const skills = new Set<string>()
  for (const rawSkill of SKILL_DICTIONARY) {
    const normalized = rawSkill.replace(/\./g, "")
    if (target.includes(normalized)) {
      if (normalized === "nextjs") {
        skills.add("nextjs")
      } else if (normalized === "nodejs") {
        skills.add("nodejs")
      } else if (normalized === "tailwindcss" || normalized === "tailwind") {
        skills.add("tailwindcss")
      } else {
        skills.add(normalized)
      }
    }
  }
  return Array.from(skills).sort()
}

function computeCanonicalHash(teamId: string, platform: string, platformJobId: string) {
  const input = `${teamId}${platform}${platformJobId}`
  return createHash("sha256").update(input).digest("hex")
}

// ============================================================================
// Core Normalizer
// ============================================================================

function normalizeRawJob(raw: RawLinkedInJob, options: NormalizeOptions): CanonicalJob | null {
  const platformJobId =
    (typeof raw.job_posting_id === "string" && raw.job_posting_id.trim() !== ""
      ? raw.job_posting_id.trim()
      : null) ?? null

  if (!platformJobId) return null

  const title =
    normalizeWhitespace(raw.job_title) ??
    normalizeWhitespace((raw as { title?: string }).title) ??
    ""

  if (!title) return null

  const companyName = normalizeWhitespace(raw.company_name)
  const companyLogoUrl =
    raw.company_logo && typeof raw.company_logo === "string"
      ? normalizeWhitespace(raw.company_logo)
      : null

  const applyUrl =
    (typeof raw.apply_link === "string" && raw.apply_link.trim() !== ""
      ? raw.apply_link.trim()
      : null) ??
    (typeof raw.url === "string" && raw.url.trim() !== "" ? raw.url.trim() : null) ??
    (raw.input && typeof raw.input.url === "string" && raw.input.url.trim() !== ""
      ? raw.input.url.trim()
      : null)

  if (!applyUrl) return null

  const description = buildDescription(raw)
  const skills = extractSkills(title, description)
  const postedAt = parseDate(raw.job_posted_date ?? null)
  const fetchedAt = parseDate(raw.timestamp ?? null)

  const clientCountry = inferClientCountry(raw)

  const seniority =
    normalizeWhitespace(raw.job_seniority_level) ??
    normalizeWhitespace((raw as { seniority?: string }).seniority)

  const jobFunction = normalizeWhitespace(raw.job_function)
  const jobIndustries = normalizeWhitespace(raw.job_industries)

  const category =
    jobFunction && jobIndustries
      ? `${jobFunction} | ${jobIndustries}`
      : jobFunction || jobIndustries || null

  const canonicalHash = computeCanonicalHash(options.teamId, options.platform, platformJobId)

  return {
    team_id: options.teamId,
    platform: options.platform,
    platform_job_id: platformJobId,
    company_name: companyName,
    company_logo_url: companyLogoUrl,
    title,
    description,
    apply_url: applyUrl,
    posted_at: postedAt,
    fetched_at: fetchedAt,
    budget_type: "unknown",
    fixed_budget_min: null,
    fixed_budget_max: null,
    hourly_min: null,
    hourly_max: null,
    currency: "USD",
    client_country: clientCountry,
    client_rating: null,
    client_hires: null,
    client_payment_verified: null,
    skills,
    seniority: seniority ?? null,
    category,
    canonical_hash: canonicalHash,
  }
}

// ============================================================================
// Public API
// ============================================================================

export function normalizeLinkedInJobs(
  rawJobs: RawLinkedInJob[],
  teamId: string,
): { jobs: CanonicalJob[]; sources: JobSource[]; skipped: number } {
  const options: NormalizeOptions = { teamId, platform: "linkedin" }
  const jobs: CanonicalJob[] = []
  const sources: JobSource[] = []
  const seenHashes = new Set<string>()
  let skipped = 0

  for (const raw of rawJobs) {
    const job = normalizeRawJob(raw, options)
    if (!job) {
      skipped++
      continue
    }
    if (seenHashes.has(job.canonical_hash)) {
      skipped++
      continue
    }
    seenHashes.add(job.canonical_hash)
    jobs.push(job)

    sources.push({
      team_id: teamId,
      platform: "linkedin",
      platform_job_id: job.platform_job_id,
      url: job.apply_url,
      fetched_at: job.fetched_at,
      raw_json: raw,
    })
  }

  return { jobs, sources, skipped }
}
