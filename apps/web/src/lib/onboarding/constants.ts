export const ONBOARDING_AGENT_TYPE = "onboarding"

export const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  intern_new_grad: "Junior",
  entry: "Entry-Level",
  mid: "Mid-Level",
  senior: "Senior",
  lead: "Lead",
  director: "Director-Level",
}

export const ONBOARDING_STEPS = [
  { key: "fullName", label: "Name" },
  { key: "linkedinUrl", label: "LinkedIn" },
  { key: "experienceLevel", label: "Experience Level" },
  { key: "skills", label: "Skills" },
  { key: "experiences", label: "Work Experience" },
  { key: "educations", label: "Education" },
  { key: "engagementTypes", label: "Engagement Type" },
  { key: "currentRate", label: "Current Rate" },
  { key: "dreamRate", label: "Dream Rate" },
] as const

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"]
