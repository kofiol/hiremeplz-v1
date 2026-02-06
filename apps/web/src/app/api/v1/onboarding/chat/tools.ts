import { tool } from "@openai/agents"
import { z } from "zod"
import type { CollectedData, SaveProfileDataInput, InputHint } from "@/lib/onboarding/schema"
import { SaveProfileDataParamsSchema } from "@/lib/onboarding/schema"

// ============================================================================
// Tool Context — mutable closure state shared across tools
// ============================================================================

export type SavedField = {
  field: string
  value: unknown
}

export type OnboardingToolContext = {
  collectedData: Partial<CollectedData>
  originalCollectedData: Partial<CollectedData>
  analysisRequested: boolean
  lastSavedFields: SavedField[]
  inputHint?: InputHint
}

// ============================================================================
// save_profile_data tool
// ============================================================================

export function createSaveProfileDataTool(ctx: OnboardingToolContext) {
  return tool({
    name: "save_profile_data",
    description: `Save profile data from the user's message. Call EVERY TIME user provides info. Pass null for fields you are NOT saving.

FIELD GUIDE (use the correct field for each data type):
- fullName: User's name (e.g., "John Smith")
- skills: Technical skills/technologies (e.g., JavaScript, React, AWS) — array of {name: string}
- experiences: Work history — array of {title, company, startDate, endDate, highlights}
- educations: Schools/degrees — array of {school, degree, field, startYear, endYear}
- experienceLevel: Career level (intern_new_grad, entry, mid, senior, lead, director)
- currentRateMin/Max: Current hourly rate range (numbers only)
- dreamRateMin/Max: Target hourly rate range (numbers only)
- engagementTypes: Work style array (["full_time"], ["part_time"], or both)

CRITICAL RULES:
- ONLY save data the user EXPLICITLY stated in their message. NEVER infer, guess, or fabricate values for fields the user did not mention.
- When user lists programming languages/frameworks/tools, save to 'skills' NOT 'educations'.`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameters: SaveProfileDataParamsSchema as any,
    execute: async (_input: unknown) => {
      const args = _input as SaveProfileDataInput
      const savedFields: SavedField[] = []

      // Log what the agent is trying to save for debugging
      const nonNullFields = Object.entries(args)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k]) => k)
      if (nonNullFields.length > 0) {
        console.log("[save_profile_data] Saving fields:", nonNullFields.join(", "))
      }

      for (const [key, value] of Object.entries(args)) {
        if (value !== null && value !== undefined) {
          const existingValue = (ctx.collectedData as Record<string, unknown>)[key]
          // Only track as "new" if the field wasn't already set
          const isNewField = existingValue === null || existingValue === undefined

          // Always update the value
          ;(ctx.collectedData as Record<string, unknown>)[key] = value

          // Only show in UI if it's actually new data
          if (isNewField) {
            savedFields.push({ field: key, value })
          }
        }
      }

      // Track what was saved for UI display
      ctx.lastSavedFields = savedFields

      return "Data saved."
    },
  })
}

// ============================================================================
// set_input_hint tool
// ============================================================================

export function createSetInputHintTool(ctx: OnboardingToolContext) {
  return tool({
    name: "set_input_hint",
    description: `Set the UI input mode shown to the user after your response. Call this EVERY turn.

- "text": Default text input (for open-ended questions: name, details, follow-ups)
- "suggestions": Show pill buttons (provide the suggestions array)
- "skill_selector": Show the skill dropdown component
- "none": Hide input entirely (after triggering analysis)`,
    parameters: z.object({
      type: z.enum(["text", "suggestions", "skill_selector", "none"]),
      suggestions: z
        .array(z.string())
        .nullable()
        .describe("Required when type is 'suggestions'. The pill button labels to show. Pass null otherwise."),
    }),
    execute: async (input) => {
      if (input.type === "suggestions" && input.suggestions) {
        ctx.inputHint = { type: "suggestions", suggestions: input.suggestions }
      } else if (input.type === "suggestions") {
        ctx.inputHint = { type: "text" }
      } else {
        ctx.inputHint = { type: input.type }
      }
      return "Input hint set."
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
      // Validate against ORIGINAL data (pre-turn snapshot) to prevent
      // the agent from fabricating data via save_profile_data then
      // immediately triggering analysis in the same turn.
      const orig = ctx.originalCollectedData
      const data = ctx.collectedData

      // Fields that were missing at turn start — these required user input
      // across prior turns and cannot be filled by fabrication.
      const missingAtStart: string[] = []
      if (!orig.fullName) missingAtStart.push("fullName")
      if (!orig.teamMode) missingAtStart.push("teamMode")
      if (!orig.experienceLevel) missingAtStart.push("experienceLevel")
      if (!orig.skills || orig.skills.length < 3)
        missingAtStart.push("skills (need at least 3)")
      if (!orig.experiences || orig.experiences.length < 1)
        missingAtStart.push("experiences (need at least 1)")
      if (!orig.educations || orig.educations.length < 1)
        missingAtStart.push("educations (need at least 1)")
      if (orig.currentRateMin == null && orig.currentRateMax == null)
        missingAtStart.push("currentRate")
      if (orig.dreamRateMin == null && orig.dreamRateMax == null)
        missingAtStart.push("dreamRate")
      if (!orig.engagementTypes || orig.engagementTypes.length < 1)
        missingAtStart.push("engagementTypes")

      // Allow at most 1 field group to have been newly provided this turn
      // (the field the user was actually asked about).
      // If 2+ groups were missing at turn start, the agent skipped questions.
      if (missingAtStart.length > 1) {
        return `CANNOT trigger analysis yet. Still missing from PRIOR turns: ${missingAtStart.join(", ")}. You skipped questions — go back and ask the user about each one. Do NOT call trigger_profile_analysis again until all items are resolved.`
      }

      // Final check: current data must actually be complete
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
