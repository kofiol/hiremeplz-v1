import { tool } from "@openai/agents"
import { z } from "zod"
import type { CollectedData, SaveProfileDataInput } from "@/lib/onboarding/schema"
import { SaveProfileDataParamsSchema } from "@/lib/onboarding/schema"

// ============================================================================
// Tool Context — mutable closure state shared across tools
// ============================================================================

export type OnboardingToolContext = {
  collectedData: Partial<CollectedData>
  analysisRequested: boolean
}

// ============================================================================
// save_profile_data tool
// ============================================================================

export function createSaveProfileDataTool(ctx: OnboardingToolContext) {
  return tool({
    name: "save_profile_data",
    description:
      "Save structured profile data extracted from the user's message. Call EVERY TIME user provides info. Pass null for fields you are NOT saving.",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameters: SaveProfileDataParamsSchema as any,
    execute: async (_input: unknown) => {
      const args = _input as SaveProfileDataInput
      for (const [key, value] of Object.entries(args)) {
        if (value !== null && value !== undefined) {
          ;(ctx.collectedData as Record<string, unknown>)[key] = value
        }
      }
      return "Data saved."
    },
  })
}

// ============================================================================
// trigger_profile_analysis tool
// ============================================================================

export function createTriggerAnalysisTool(ctx: OnboardingToolContext) {
  return tool({
    name: "trigger_profile_analysis",
    description:
      "Trigger profile analysis. ONLY call when STILL NEEDED says 'ALL DONE'. You must have asked about LinkedIn (user provided URL or explicitly skipped) before calling this.",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameters: z.object({ confirmation: z.literal(true) }) as any,
    execute: async () => {
      const data = ctx.collectedData
      const missing: string[] = []
      if (!data.fullName) missing.push("fullName")
      if (!data.teamMode) missing.push("teamMode")
      if (!data.experienceLevel) missing.push("experienceLevel")
      if (!data.skills || data.skills.length < 3)
        missing.push("skills (need at least 3)")
      if (!data.experiences || data.experiences.length < 1)
        missing.push("experiences (need at least 1)")
      if (!data.educations || data.educations.length < 1)
        missing.push("educations (need at least 1)")
      if (data.currentRateMin == null && data.currentRateMax == null)
        missing.push("currentRate")
      if (data.dreamRateMin == null && data.dreamRateMax == null)
        missing.push("dreamRate")
      if (!data.engagementTypes || data.engagementTypes.length < 1)
        missing.push("engagementTypes")

      if (missing.length > 0) {
        return `CANNOT trigger analysis yet. Still missing: ${missing.join(", ")}. Ask the user about these first. Do NOT call trigger_profile_analysis again until all items are resolved.`
      }

      ctx.analysisRequested = true
      return "Analysis queued."
    },
  })
}
