import type { CollectedData } from "./schema"

export function getDataStatus(data: Partial<CollectedData>) {
  const filled: string[] = []
  const missing: string[] = []

  if (data.fullName) filled.push(`fullName: ${data.fullName}`)
  else missing.push("fullName (ask: 'What's your name?')")

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

  if (data.engagementTypes?.length)
    filled.push(`engagementTypes: ${data.engagementTypes.join(", ")}`)
  else missing.push("engagementTypes (ask: 'Full-time, part-time, or both?')")

  if (data.linkedinUrl)
    filled.push(`linkedinUrl: ${data.linkedinUrl}`)

  const linkedinPending = !data.linkedinUrl
  const allRequiredDone = missing.length === 0

  if (allRequiredDone && linkedinPending) {
    missing.push("linkedinUrl (OPTIONAL FINAL STEP — ask if they want to add their LinkedIn URL or skip. If the user says skip/no/decline/analyze in ANY form, immediately call trigger_profile_analysis with confirmation: true. Do NOT ask again. Do NOT re-prompt.)")
  }

  return { filled, missing }
}
