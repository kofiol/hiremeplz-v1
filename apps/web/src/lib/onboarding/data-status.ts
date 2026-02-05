import type { CollectedData } from "./schema"

const TOTAL_STEPS = 9

export function getDataStatus(data: Partial<CollectedData>) {
  const filled: string[] = []
  const missing: string[] = []

  // 1. Name
  if (data.fullName) filled.push(`fullName: ${data.fullName}`)
  else missing.push("fullName")

  // teamMode is auto-set, not counted in steps
  if (data.teamMode) filled.push(`teamMode: ${data.teamMode}`)

  // 2. LinkedIn (optional but asked early — can bulk-fill skills, experiences, education)
  if (data.linkedinUrl)
    filled.push(`linkedinUrl: ${data.linkedinUrl}`)
  else
    missing.push("linkedinUrl (optional — offer to import or skip)")

  // 3. Experience level
  if (data.experienceLevel)
    filled.push(`experienceLevel: ${data.experienceLevel}`)
  else missing.push("experienceLevel (junior/mid/senior/lead)")

  // 4. Skills
  if (data.skills?.length)
    filled.push(`skills: ${data.skills.map((s) => s.name).join(", ")}`)
  else missing.push("skills (need 3+)")

  // 5. Experiences
  if (data.experiences?.length)
    filled.push(
      `experiences: ${data.experiences.map((e) => `${e.title} at ${e.company}`).join("; ")}`
    )
  else missing.push("experiences (need 1+)")

  // 6. Education
  if (data.educations?.length)
    filled.push(
      `educations: ${data.educations.map((e) => `${e.degree} from ${e.school}`).join("; ")}`
    )
  else missing.push("educations (need 1+)")

  // 7. Engagement types
  if (data.engagementTypes?.length)
    filled.push(`engagementTypes: ${data.engagementTypes.join(", ")}`)
  else missing.push("engagementTypes (full-time/part-time/both)")

  // 8. Current rate
  if (data.currentRateMin !== null && data.currentRateMin !== undefined)
    filled.push(
      `currentRate: $${data.currentRateMin}${data.currentRateMax ? `-${data.currentRateMax}` : "+"}${data.currency ? ` ${data.currency}` : ""}`
    )
  else missing.push("currentRate (hourly)")

  // 9. Dream rate
  if (data.dreamRateMin !== null && data.dreamRateMin !== undefined)
    filled.push(
      `dreamRate: $${data.dreamRateMin}${data.dreamRateMax ? `-${data.dreamRateMax}` : "+"}`
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
