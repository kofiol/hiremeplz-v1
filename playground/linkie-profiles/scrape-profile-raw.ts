/**
 * LinkedIn Profile Scraper - Playground Test Script
 *
 * Usage:
 *   npx tsx playground/linkie-profiles/scrape-profile-raw.ts <linkedin_url>
 *
 * Example:
 *   npx tsx playground/linkie-profiles/scrape-profile-raw.ts https://www.linkedin.com/in/elad-moshe-05a90413/
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

// ============================================================================
// Constants
// ============================================================================

const DATASET_ID = "gd_l1viktl72bvl7bjuj0"
const API_TOKEN =
  process.env.BRIGHTDATA_API_KEY ??
  "ad0360fc9b58de114227b5934f4a537dd8c7c6d61d98d5a4e2401b7d203e2074"

// ============================================================================
// Types
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
    title?: string
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
}

// LLM-optimized output (matches onboarding requirements)
interface DistilledProfile {
  // Identity
  name: string
  firstName: string | null
  lastName: string | null
  headline: string | null
  about: string | null
  avatarUrl: string | null

  // Location
  location: string | null
  city: string | null
  countryCode: string | null

  // Current status
  currentCompany: string | null
  currentTitle: string | null

  // Professional data (for onboarding)
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

  // Social proof
  followers: number | null
  connections: number | null
  recommendationsCount: number | null

  // Additional context
  languages: string[]
  recentActivity: {
    title: string
    link: string | null
    interaction: string | null
  }[]

  // Meta
  linkedinUrl: string
  linkedinId: string | null
  scrapedAt: string
}

// ============================================================================
// Distillation Logic
// ============================================================================

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

function distillProfile(raw: BrightDataLinkedInProfile): DistilledProfile {
  const name =
    raw.name || [raw.first_name, raw.last_name].filter(Boolean).join(" ") || "Unknown"

  // Extract skills
  const skills =
    raw.skills?.map((s) => ({ name: s.title ?? "Unknown" })).filter((s) => s.name !== "Unknown") ??
    []

  // Extract experiences
  const experiences =
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
  const educations =
    raw.education?.map((e) => ({
      school: e.title ?? "Unknown School",
      degree: e.degree ?? null,
      field: e.field_of_study ?? null,
      startYear: e.start_year ?? null,
      endYear: e.end_year ?? null,
    })) ?? []

  // Extract certifications
  const certifications =
    raw.certifications?.map((c) => ({
      title: c.title ?? "Unknown",
      issuer: c.subtitle ?? null,
      date: c.date ?? null,
    })) ?? []

  // Extract languages
  const languages = raw.languages?.map((l) => l.title ?? "").filter((l) => l.length > 0) ?? []

  // Extract recent activity (limit to 5)
  const recentActivity =
    raw.activity?.slice(0, 5).map((a) => ({
      title: a.title ?? "",
      link: a.link ?? null,
      interaction: a.interaction ?? null,
    })) ?? []

  // Get current title from first experience
  const currentTitle = raw.experience?.[0]?.title ?? null

  return {
    name,
    firstName: raw.first_name ?? null,
    lastName: raw.last_name ?? null,
    headline: raw.headline ?? null,
    about: raw.about ?? null,
    avatarUrl: raw.avatar ?? null,
    location: raw.location ?? raw.city ?? null,
    city: raw.city ?? null,
    countryCode: raw.country_code ?? null,
    currentCompany: raw.current_company_name ?? raw.current_company?.name ?? null,
    currentTitle,
    experienceLevel: inferExperienceLevel(raw.experience),
    skills,
    experiences,
    educations,
    certifications,
    followers: raw.followers ?? null,
    connections: raw.connections ?? null,
    recommendationsCount: raw.recommendations_count ?? null,
    languages,
    recentActivity,
    linkedinUrl: raw.url ?? raw.input_url ?? "",
    linkedinId: raw.linkedin_id ?? raw.linkedin_num_id ?? null,
    scrapedAt: new Date().toISOString(),
  }
}

// ============================================================================
// BrightData API
// ============================================================================

async function triggerScrape(profileUrls: string[]): Promise<string> {
  console.log(`Triggering scrape for ${profileUrls.length} profile(s)...`)

  const input = profileUrls.map((url) => ({ url }))

  const response = await fetch(
    `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${DATASET_ID}&notify=false&include_errors=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to trigger scrape: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as { snapshot_id: string }
  return data.snapshot_id
}

async function pollForResults(snapshotId: string): Promise<BrightDataLinkedInProfile[]> {
  const startTime = Date.now()
  const maxWaitTime = 5 * 60 * 1000 // 5 minutes max

  console.log(`\nSnapshot ID: ${snapshotId}`)
  console.log("Polling for results (this may take a few minutes)...\n")

  while (Date.now() - startTime < maxWaitTime) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    process.stdout.write(`\r  Waiting... (${elapsed}s elapsed)`)

    const response = await fetch(
      `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      }
    )

    if (response.status === 202) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      continue
    }

    process.stdout.write("\n\n")

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch snapshot: ${response.status} - ${errorText}`)
    }

    return (await response.json()) as BrightDataLinkedInProfile[]
  }

  throw new Error("Timeout waiting for results")
}

// ============================================================================
// Main
// ============================================================================

async function scrapeProfiles(profileUrls: string[]): Promise<void> {
  try {
    const snapshotId = await triggerScrape(profileUrls)
    const rawProfiles = await pollForResults(snapshotId)

    console.log(`Received ${rawProfiles.length} raw profile(s)`)

    // Distill profiles
    const distilledProfiles = rawProfiles.map(distillProfile)

    // Save raw data
    const outputDir = path.join(process.cwd(), "playground", "linkie-profiles", "output")
    await fs.mkdir(outputDir, { recursive: true })

    const timestamp = Date.now()
    const rawPath = path.join(outputDir, `${timestamp}_raw.json`)
    const distilledPath = path.join(outputDir, `${timestamp}_distilled.json`)

    await fs.writeFile(rawPath, JSON.stringify(rawProfiles, null, 2))
    await fs.writeFile(distilledPath, JSON.stringify(distilledProfiles, null, 2))

    console.log(`Raw data saved to: ${rawPath}`)
    console.log(`Distilled data saved to: ${distilledPath}`)

    // Print summary
    console.log("\n" + "=".repeat(70))
    console.log("DISTILLED PROFILES (LLM-Optimized)")
    console.log("=".repeat(70))

    for (const profile of distilledProfiles) {
      console.log(`
┌─────────────────────────────────────────────────────────────────────┐
│ ${profile.name.padEnd(67)} │
├─────────────────────────────────────────────────────────────────────┤
│ Headline:    ${(profile.headline ?? "N/A").slice(0, 54).padEnd(54)} │
│ Location:    ${(profile.location ?? "N/A").slice(0, 54).padEnd(54)} │
│ Company:     ${(profile.currentCompany ?? "N/A").slice(0, 54).padEnd(54)} │
│ Title:       ${(profile.currentTitle ?? "N/A").slice(0, 54).padEnd(54)} │
│ Level:       ${(profile.experienceLevel ?? "N/A").padEnd(54)} │
├─────────────────────────────────────────────────────────────────────┤
│ Skills:      ${profile.skills.length} skill(s)${" ".repeat(45)} │
│ Experience:  ${profile.experiences.length} position(s)${" ".repeat(42)} │
│ Education:   ${profile.educations.length} school(s)${" ".repeat(44)} │
│ Certs:       ${profile.certifications.length} certification(s)${" ".repeat(37)} │
│ Languages:   ${profile.languages.length > 0 ? profile.languages.join(", ").slice(0, 50) : "N/A"}${" ".repeat(Math.max(0, 54 - (profile.languages.length > 0 ? profile.languages.join(", ").slice(0, 50).length : 3)))} │
├─────────────────────────────────────────────────────────────────────┤
│ Followers:   ${String(profile.followers ?? "N/A").padEnd(54)} │
│ Connections: ${String(profile.connections ?? "N/A").padEnd(54)} │
│ URL:         ${profile.linkedinUrl.slice(0, 54).padEnd(54)} │
└─────────────────────────────────────────────────────────────────────┘`)

      // Print skills
      if (profile.skills.length > 0) {
        console.log("\n  Skills:")
        profile.skills.slice(0, 10).forEach((s) => console.log(`    - ${s.name}`))
        if (profile.skills.length > 10) {
          console.log(`    ... and ${profile.skills.length - 10} more`)
        }
      }

      // Print experiences
      if (profile.experiences.length > 0) {
        console.log("\n  Experience:")
        profile.experiences.slice(0, 3).forEach((e) => {
          console.log(`    - ${e.title} at ${e.company ?? "Unknown"}`)
          if (e.startDate || e.endDate) {
            console.log(`      ${e.startDate ?? "?"} - ${e.endDate ?? "Present"}`)
          }
        })
        if (profile.experiences.length > 3) {
          console.log(`    ... and ${profile.experiences.length - 3} more positions`)
        }
      }

      // Print education
      if (profile.educations.length > 0) {
        console.log("\n  Education:")
        profile.educations.forEach((e) => {
          console.log(`    - ${e.school}`)
          if (e.degree || e.field) {
            console.log(`      ${[e.degree, e.field].filter(Boolean).join(" in ")}`)
          }
        })
      }

      // Print about (truncated)
      if (profile.about) {
        console.log("\n  About:")
        const truncatedAbout =
          profile.about.length > 200 ? profile.about.slice(0, 200) + "..." : profile.about
        console.log(`    ${truncatedAbout.replace(/\n/g, "\n    ")}`)
      }

      console.log("")
    }

    // Print JSON for easy copying
    console.log("\n" + "=".repeat(70))
    console.log("JSON OUTPUT (for AI agents)")
    console.log("=".repeat(70))
    console.log(JSON.stringify(distilledProfiles, null, 2))
  } catch (error) {
    console.error("\nError:", error instanceof Error ? error.message : error)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)

  let urls: string[]

  if (args.length === 0) {
    urls = [
      "https://www.linkedin.com/in/elad-moshe-05a90413/",
      "https://www.linkedin.com/in/jonathan-myrvik-3baa01109",
    ]
    console.log("No URL provided. Running with test URLs:")
  } else {
    urls = args
    console.log("Scraping provided URLs:")
  }

  urls.forEach((url) => console.log(`  - ${url}`))
  console.log("")

  await scrapeProfiles(urls)
}

main().catch((err) => {
  console.error("\nFailed:", err.message)
  process.exit(1)
})
