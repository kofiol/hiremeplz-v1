// ============================================================================
// Onboarding Data Status
// Shared helpers for tracking onboarding progress
// ============================================================================

// Re-export the CollectedData shape for consumers that only need the type
export type CollectedData = {
  fullName: string | null
  teamMode: "solo" | "team" | null
  profilePath: "linkedin" | "manual" | null
  linkedinUrl: string | null
  experienceLevel:
    | "intern_new_grad"
    | "entry"
    | "mid"
    | "senior"
    | "lead"
    | "director"
    | null
  skills: { name: string }[] | null
  experiences:
    | {
        title: string
        company: string | null
        startDate: string | null
        endDate: string | null
        highlights: string | null
      }[]
    | null
  educations:
    | {
        school: string
        degree: string | null
        field: string | null
        startYear: string | null
        endYear: string | null
      }[]
    | null
  currentRateMin: number | null
  currentRateMax: number | null
  dreamRateMin: number | null
  dreamRateMax: number | null
  currency: "USD" | "EUR" | "GBP" | "CAD" | "AUD" | null
  engagementTypes: ("full_time" | "part_time")[] | null
}

// ============================================================================
// getDataStatus — extracted from chat/route.ts for shared use
// ============================================================================

export function getDataStatus(data: Partial<CollectedData>) {
  const filled: string[] = []
  const missing: string[] = []

  // fullName is always first
  if (data.fullName) filled.push(`fullName: ${data.fullName}`)
  else missing.push("fullName (ask: 'What's your name?')")

  // teamMode is auto-set to "solo" — skip asking
  if (data.teamMode) filled.push(`teamMode: ${data.teamMode}`)

  if (data.experienceLevel)
    filled.push(`experienceLevel: ${data.experienceLevel}`)
  else missing.push("experienceLevel")

  if (data.skills?.length)
    filled.push(`skills: ${data.skills.map((s) => s.name).join(", ")}`)
  else
    missing.push(
      "skills (ask for specific technical skills, frameworks, languages - need at least 3)"
    )

  if (data.experiences?.length)
    filled.push(
      `experiences: ${data.experiences.map((e) => `${e.title} at ${e.company}`).join("; ")}`
    )
  else
    missing.push(
      "experiences (ask for recent job: title, company name, rough dates, what they worked on - need at least 1)"
    )

  if (data.educations?.length)
    filled.push(
      `educations: ${data.educations.map((e) => `${e.degree} from ${e.school}`).join("; ")}`
    )
  else missing.push("education (need at least 1 - school and degree/field)")

  if (
    data.currentRateMin !== null &&
    data.currentRateMin !== undefined
  )
    filled.push(
      `currentRate: $${data.currentRateMin}${data.currentRateMax ? `-${data.currentRateMax}` : "+"}${data.currency ? ` ${data.currency}` : ""}`
    )
  else missing.push("currentRate")

  if (
    data.dreamRateMin !== null &&
    data.dreamRateMin !== undefined
  )
    filled.push(
      `dreamRate: $${data.dreamRateMin}${data.dreamRateMax ? `-${data.dreamRateMax}` : "+"}`
    )
  else missing.push("dreamRate")

  // Engagement types are optional but asked before LinkedIn
  if (data.engagementTypes?.length)
    filled.push(`engagementTypes: ${data.engagementTypes.join(", ")}`)
  else missing.push("engagementTypes (ask: 'Full-time, part-time, or both?')")

  // LinkedIn URL is the final optional step (not required for analysis)
  if (data.linkedinUrl)
    filled.push(`linkedinUrl: ${data.linkedinUrl}`)

  // Track whether only optional items remain
  const linkedinPending = !data.linkedinUrl
  const allRequiredDone = missing.length === 0

  if (allRequiredDone && linkedinPending) {
    missing.push("linkedinUrl (OPTIONAL FINAL STEP — ask if they want to add their LinkedIn URL or skip. If the user says skip/no/decline/analyze in ANY form, immediately call trigger_profile_analysis with confirmation: true. Do NOT ask again. Do NOT re-prompt.)")
  }

  return { filled, missing }
}

