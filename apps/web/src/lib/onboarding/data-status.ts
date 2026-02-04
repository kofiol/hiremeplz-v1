import type { CollectedData } from "./schema"

export function getDataStatus(data: Partial<CollectedData>) {
  const filled: string[] = []
  const missing: string[] = []

  // 1. Name
  if (data.fullName) filled.push(`fullName: ${data.fullName}`)
  else missing.push("fullName (ask: 'What's your name?')")

  if (data.teamMode) filled.push(`teamMode: ${data.teamMode}`)

  // 2. LinkedIn (early — bulk-fills skills, experiences, education)
  if (data.linkedinUrl)
    filled.push(`linkedinUrl: ${data.linkedinUrl}`)
  else
    missing.push("linkedinUrl (ask if they'd like to import their LinkedIn profile to speed things up, or skip to enter manually. If the user says skip/no/manual, move on immediately.)")

  // 3. Experience level
  if (data.experienceLevel)
    filled.push(`experienceLevel: ${data.experienceLevel}`)
  else missing.push("experienceLevel")

  // 4. Skills
  if (data.skills?.length)
    filled.push(`skills: ${data.skills.map((s) => s.name).join(", ")}`)
  else
    missing.push(
      "skills (ask for specific technical skills, frameworks, languages - need at least 3)"
    )

  // 5. Experiences
  if (data.experiences?.length)
    filled.push(
      `experiences: ${data.experiences.map((e) => `${e.title} at ${e.company}`).join("; ")}`
    )
  else
    missing.push(
      "experiences (ask for recent job: title, company name, rough dates, what they worked on - need at least 1)"
    )

  // 6. Education
  if (data.educations?.length)
    filled.push(
      `educations: ${data.educations.map((e) => `${e.degree} from ${e.school}`).join("; ")}`
    )
  else missing.push("education (need at least 1 - school and degree/field)")

  // 7. Engagement types (before rates)
  if (data.engagementTypes?.length)
    filled.push(`engagementTypes: ${data.engagementTypes.join(", ")}`)
  else missing.push("engagementTypes (ask: 'Full-time, part-time, or both?')")

  // 8. Current rate
  if (
    data.currentRateMin !== null &&
    data.currentRateMin !== undefined
  )
    filled.push(
      `currentRate: $${data.currentRateMin}${data.currentRateMax ? `-${data.currentRateMax}` : "+"}${data.currency ? ` ${data.currency}` : ""}`
    )
  else missing.push("currentRate")

  // 9. Dream rate
  if (
    data.dreamRateMin !== null &&
    data.dreamRateMin !== undefined
  )
    filled.push(
      `dreamRate: $${data.dreamRateMin}${data.dreamRateMax ? `-${data.dreamRateMax}` : "+"}`
    )
  else missing.push("dreamRate")

  const allRequiredDone = missing.length === 0

  if (allRequiredDone) {
    // All done — trigger analysis
  }

  return { filled, missing }
}
