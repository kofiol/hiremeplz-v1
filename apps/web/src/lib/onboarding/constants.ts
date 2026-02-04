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
  { key: "experienceLevel", label: "Experience Level" },
  { key: "skills", label: "Skills" },
  { key: "experiences", label: "Work Experience" },
  { key: "educations", label: "Education" },
  { key: "currentRate", label: "Current Rate" },
  { key: "dreamRate", label: "Dream Rate" },
  { key: "engagementTypes", label: "Engagement Type" },
  { key: "linkedinUrl", label: "LinkedIn" },
] as const

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"]
