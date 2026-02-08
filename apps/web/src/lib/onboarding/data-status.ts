import type { CollectedData } from "./schema"
import { isSkipped } from "./schema"
import { ONBOARDING_STEPS } from "./constants"

const TOTAL_STEPS = 8

export function getDataStatus(data: Partial<CollectedData>) {
  const filled: string[] = []
  const missing: string[] = []

  // Name (always collected before chat starts — never missing)
  if (data.fullName) filled.push(`fullName: ${data.fullName}`)

  // teamMode is auto-set, not counted in steps
  if (data.teamMode) filled.push(`teamMode: ${data.teamMode}`)

  // 2. LinkedIn (optional but asked early — can bulk-fill skills, experiences, education)
  if (isSkipped(data.linkedinUrl))
    filled.push("linkedinUrl: (skipped)")
  else if (data.linkedinUrl)
    filled.push(`linkedinUrl: ${data.linkedinUrl}`)
  else
    missing.push("linkedinUrl (optional — offer to import or skip)")

  // 3. Experience level
  if (isSkipped(data.experienceLevel))
    filled.push("experienceLevel: (skipped)")
  else if (data.experienceLevel)
    filled.push(`experienceLevel: ${data.experienceLevel}`)
  else missing.push("experienceLevel (junior/mid/senior/lead)")

  // 4. Skills
  if (isSkipped(data.skills))
    filled.push("skills: (skipped)")
  else if (data.skills?.length)
    filled.push(`skills: ${data.skills.map((s) => s.name).join(", ")}`)
  else missing.push("skills (need 3+)")

  // 5. Experiences
  if (isSkipped(data.experiences))
    filled.push("experiences: (skipped)")
  else if (data.experiences?.length)
    filled.push(
      `experiences: ${data.experiences.map((e) => `${e.title} at ${e.company}`).join("; ")}`
    )
  else missing.push("experiences (need 1+)")

  // 6. Education
  if (isSkipped(data.educations))
    filled.push("educations: (skipped)")
  else if (data.educations?.length)
    filled.push(
      `educations: ${data.educations.map((e) => `${e.degree} from ${e.school}`).join("; ")}`
    )
  else missing.push("educations (need 1+)")

  // 7. Engagement types
  if (isSkipped(data.engagementTypes))
    filled.push("engagementTypes: (skipped)")
  else if (data.engagementTypes?.length)
    filled.push(`engagementTypes: ${data.engagementTypes.join(", ")}`)
  else missing.push("engagementTypes (full-time/part-time/both)")

  // 8. Current rate
  if (isSkipped(data.currentRateMin))
    filled.push("currentRate: (skipped)")
  else if (data.currentRateMin !== null && data.currentRateMin !== undefined)
    filled.push(
      `currentRate: $${data.currentRateMin}${data.currentRateMax && !isSkipped(data.currentRateMax) ? `-${data.currentRateMax}` : "+"}${data.currency ? ` ${data.currency}` : ""}`
    )
  else missing.push("currentRate (hourly)")

  // 9. Dream rate
  if (isSkipped(data.dreamRateMin))
    filled.push("dreamRate: (skipped)")
  else if (data.dreamRateMin !== null && data.dreamRateMin !== undefined)
    filled.push(
      `dreamRate: $${data.dreamRateMin}${data.dreamRateMax && !isSkipped(data.dreamRateMax) ? `-${data.dreamRateMax}` : "+"}`
    )
  else missing.push("dreamRate (hourly)")

  // Calculate progress (exclude teamMode from count since it's auto-set)
  const filledCount = filled.filter(f => !f.startsWith("teamMode")).length
  const currentStep = filledCount + 1
  const isLastStep = missing.length === 1

  return {
    filled,
    missing,
    progress: {
      current: Math.min(currentStep, TOTAL_STEPS),
      total: TOTAL_STEPS,
      percent: Math.round((filledCount / TOTAL_STEPS) * 100),
      isLastStep,
    },
  }
}

// ============================================================================
// Shared step completion helpers
// ============================================================================

export function isStepComplete(key: string, data: Partial<CollectedData>): boolean {
  switch (key) {
    case "linkedinUrl": return isSkipped(data.linkedinUrl) || !!data.linkedinUrl
    case "experienceLevel": return isSkipped(data.experienceLevel) || !!data.experienceLevel
    case "skills": return isSkipped(data.skills) || (Array.isArray(data.skills) && data.skills.length > 0)
    case "experiences": return isSkipped(data.experiences) || (Array.isArray(data.experiences) && data.experiences.length > 0)
    case "educations": return isSkipped(data.educations) || (Array.isArray(data.educations) && data.educations.length > 0)
    case "engagementTypes": return isSkipped(data.engagementTypes) || (Array.isArray(data.engagementTypes) && data.engagementTypes.length > 0)
    case "currentRate": return isSkipped(data.currentRateMin) || (typeof data.currentRateMin === "number")
    case "dreamRate": return isSkipped(data.dreamRateMin) || (typeof data.dreamRateMin === "number")
    default: return false
  }
}

export function countCompletedSteps(data: Partial<CollectedData>): number {
  return ONBOARDING_STEPS.filter((s) => isStepComplete(s.key, data)).length
}
