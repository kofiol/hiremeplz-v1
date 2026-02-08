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
// Skip guard: determine current step from collected data
// ============================================================================

function isFieldPresent(value: unknown): boolean {
  if (value === "skipped") return true
  if (typeof value === "string" && value.length > 0) return true
  if (Array.isArray(value) && value.length > 0) return true
  if (typeof value === "number") return true
  return false
}

/**
 * Returns the primary key of the first missing step, or null if all done.
 * Only this step (and its paired fields) can be legitimately skipped.
 */
function getCurrentStep(data: Partial<CollectedData>): string | null {
  const steps: Array<{ key: string; check: () => boolean }> = [
    { key: "linkedinUrl", check: () => isFieldPresent(data.linkedinUrl) },
    { key: "experienceLevel", check: () => isFieldPresent(data.experienceLevel) },
    { key: "skills", check: () => isFieldPresent(data.skills) },
    { key: "experiences", check: () => isFieldPresent(data.experiences) },
    { key: "educations", check: () => isFieldPresent(data.educations) },
    { key: "engagementTypes", check: () => isFieldPresent(data.engagementTypes) },
    { key: "currentRateMin", check: () => isFieldPresent(data.currentRateMin) || isFieldPresent(data.currentRateMax) },
    { key: "dreamRateMin", check: () => isFieldPresent(data.dreamRateMin) || isFieldPresent(data.dreamRateMax) },
  ]
  for (const step of steps) {
    if (!step.check()) return step.key
  }
  return null
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
- skills: Technical skills/technologies — array of {name: string}. Include context when provided, e.g. "React (5 years, primary)" as the name. **If user wants to skip, save "skipped".**
- experiences: Work history — array of {title, company, startDate, endDate, highlights}. **If user wants to skip, save "skipped".**
- educations: Schools/degrees — array of {school, degree, field, startYear, endYear}. **If user wants to skip, save "skipped".**
- experienceLevel: Career level (intern_new_grad, entry, mid, senior, lead, director). **If user wants to skip, save "skipped".**
- currentRateMin/Max: Current hourly rate range (numbers only). **If user wants to skip, save "skipped" to currentRateMin.**
- dreamRateMin/Max: Target hourly rate range (numbers only). **If user wants to skip, save "skipped" to dreamRateMin.**
- engagementTypes: Work style array (["full_time"], ["part_time"], or both). **If user wants to skip, save "skipped".**
- linkedinUrl: LinkedIn profile URL. **If user wants to skip or enter manually, save "skipped".**

**SKIPPING**: When user explicitly says "skip", "pass", "nah", "I don't want to answer this", save the string "skipped" as the value for that field.

CRITICAL: The 'highlights' field on experiences is the MOST IMPORTANT field for analysis scoring.
Save accomplishments, tech stack used, scale/impact (team size, users, revenue), and outcomes.
Example highlights: "Built real-time analytics dashboard serving 50K users using React + D3.js. Led team of 4. Reduced page load by 60%."
Do NOT leave highlights empty if the user provided any detail about what they did.

CRITICAL RULES:
- ONLY save data the user EXPLICITLY stated in their message. NEVER infer, guess, or fabricate values for fields the user did not mention.
- When user lists programming languages/frameworks/tools, save to 'skills' NOT 'educations'.`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameters: SaveProfileDataParamsSchema as any,
    execute: async (_input: unknown) => {
      const args = _input as SaveProfileDataInput
      const savedFields: SavedField[] = []

      // ── Anti-fabrication: block bulk skips ──────────────────────
      // The agent asks ONE question per turn, so at most 1 field
      // should be newly set to "skipped" per tool call. When the
      // model sends "skipped" for fields the user was never asked
      // about, silently drop them.
      const PAIRED_FIELDS: Record<string, string> = {
        currentRateMax: "currentRateMin",
        dreamRateMax: "dreamRateMin",
      }
      const STEP_ORDER = [
        "linkedinUrl", "experienceLevel", "skills", "experiences",
        "educations", "engagementTypes", "currentRateMin", "dreamRateMin",
      ]

      const newlySkippedSteps = new Set<string>()
      for (const [key, value] of Object.entries(args)) {
        if (value === "skipped") {
          const origValue = (ctx.originalCollectedData as Record<string, unknown>)[key]
          if (origValue === null || origValue === undefined) {
            // Map paired rate fields to their primary key
            const stepKey = PAIRED_FIELDS[key] ?? key
            newlySkippedSteps.add(stepKey)
          }
        }
      }

      // Check if real (non-skip) data is also being saved in this call
      const hasSavingRealData = Object.entries(args).some(([key, value]) => {
        if (value === null || value === undefined || value === "skipped") return false
        // Ignore fields that already had a value (updates like skill context)
        // — what matters is the call contains real data alongside skips
        return STEP_ORDER.includes(PAIRED_FIELDS[key] ?? key) || key === "fullName"
      })

      if (newlySkippedSteps.size > 0 && hasSavingRealData) {
        // Agent is saving real data AND skipping other fields in the same call.
        // The user answered one question — they didn't also say "skip" for
        // something they were never asked about. Drop ALL skips.
        const dropped: string[] = []
        for (const [key, value] of Object.entries(args)) {
          if (value === "skipped") {
            const origValue = (ctx.originalCollectedData as Record<string, unknown>)[key]
            if (origValue === null || origValue === undefined) {
              ;(args as Record<string, unknown>)[key] = null
              dropped.push(key)
            }
          }
        }
        if (dropped.length > 0) {
          console.warn(
            `[save_profile_data] Blocked skip+data combo: dropped skips for ${dropped.join(", ")}`
          )
        }
      } else if (newlySkippedSteps.size > 1) {
        // Multiple skips without real data — keep only the first step
        const keepStep = STEP_ORDER.find((k) => newlySkippedSteps.has(k))
        const dropped: string[] = []
        for (const [key, value] of Object.entries(args)) {
          if (value === "skipped") {
            const stepKey = PAIRED_FIELDS[key] ?? key
            if (stepKey !== keepStep) {
              ;(args as Record<string, unknown>)[key] = null
              dropped.push(key)
            }
          }
        }
        if (dropped.length > 0) {
          console.warn(
            `[save_profile_data] Blocked bulk skip: kept ${keepStep}, dropped ${dropped.join(", ")}`
          )
        }
      }

      // ── Skip-only-current-step guard ──────────────────────────
      // A skip is only valid for the CURRENT step (the first missing
      // field). The agent sometimes fabricates skips for future steps
      // it hasn't asked about yet (e.g., skipping dreamRate right
      // after saving currentRate).
      if (newlySkippedSteps.size > 0) {
        const currentStep = getCurrentStep(ctx.originalCollectedData)
        const dropped: string[] = []
        for (const [key, value] of Object.entries(args)) {
          if (value === "skipped") {
            const stepKey = PAIRED_FIELDS[key] ?? key
            if (currentStep && stepKey !== currentStep) {
              ;(args as Record<string, unknown>)[key] = null
              dropped.push(key)
            }
          }
        }
        if (dropped.length > 0) {
          console.warn(
            `[save_profile_data] Blocked off-step skip: current step is ${currentStep}, dropped ${dropped.join(", ")}`
          )
        }
      }

      // ── Currency guard ─────────────────────────────────────────
      // Currency should only be saved alongside NUMERIC rate fields.
      // The agent tends to hallucinate "USD" as a default, and
      // "skipped" rate values are non-null strings — so check for
      // actual numbers, not just non-null.
      const savingRates = typeof args.currentRateMin === "number"
        || typeof args.currentRateMax === "number"
        || typeof args.dreamRateMin === "number"
        || typeof args.dreamRateMax === "number"
      if (!savingRates && args.currency != null) {
        args.currency = null
      }

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

// Helper: Check if a field is present or explicitly skipped
function isFieldComplete(value: unknown): boolean {
  if (value === "skipped") return true
  if (typeof value === "string" && value.length > 0) return true
  if (Array.isArray(value) && value.length > 0) return true
  if (typeof value === "number") return true
  return false
}

export function createTriggerAnalysisTool(ctx: OnboardingToolContext) {
  return tool({
    name: "trigger_profile_analysis",
    description:
      "Trigger profile analysis. ONLY call when all 8 steps have been asked (answered OR skipped). User can skip any step by saying 'skip', 'pass', 'nah', etc.",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameters: z.object({ confirmation: z.literal(true) }) as any,
    execute: async () => {
      // Validate against ORIGINAL data (pre-turn snapshot) to prevent
      // the agent from fabricating data via save_profile_data then
      // immediately triggering analysis in the same turn.
      const orig = ctx.originalCollectedData
      const data = ctx.collectedData

      // Anti-fabrication guardrail: count fields that were missing at turn
      // start but now have REAL data (not "skipped"). Multiple skips in one
      // turn are fine — the user can skip as many as they want. But filling
      // 2+ fields with real data in a single turn suggests fabrication.
      let newRealFields = 0
      const stillMissing: string[] = []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as Record<string, any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const o = orig as Record<string, any>

      function checkField(fieldName: string, origComplete: boolean, nowComplete: boolean, skipKey: string) {
        if (!origComplete) {
          if (!nowComplete) {
            stillMissing.push(fieldName)
          } else if (d[skipKey] !== "skipped") {
            newRealFields++
          }
          // If value is "skipped" — that's fine, user explicitly skipped
        }
      }

      checkField("fullName", isFieldComplete(o.fullName), isFieldComplete(d.fullName), "fullName")
      checkField("teamMode", isFieldComplete(o.teamMode), isFieldComplete(d.teamMode), "teamMode")
      checkField("experienceLevel", isFieldComplete(o.experienceLevel), isFieldComplete(d.experienceLevel), "experienceLevel")
      checkField("linkedinUrl", isFieldComplete(o.linkedinUrl), isFieldComplete(d.linkedinUrl), "linkedinUrl")
      checkField("skills", isFieldComplete(o.skills), isFieldComplete(d.skills), "skills")
      checkField("experiences", isFieldComplete(o.experiences), isFieldComplete(d.experiences), "experiences")
      checkField("educations", isFieldComplete(o.educations), isFieldComplete(d.educations), "educations")
      checkField("currentRate", isFieldComplete(o.currentRateMin) || isFieldComplete(o.currentRateMax), isFieldComplete(d.currentRateMin) || isFieldComplete(d.currentRateMax), "currentRateMin")
      checkField("dreamRate", isFieldComplete(o.dreamRateMin) || isFieldComplete(o.dreamRateMax), isFieldComplete(d.dreamRateMin) || isFieldComplete(d.dreamRateMax), "dreamRateMin")
      checkField("engagementTypes", isFieldComplete(o.engagementTypes), isFieldComplete(d.engagementTypes), "engagementTypes")

      // Block if agent fabricated 2+ real fields in one turn
      if (newRealFields > 1 && stillMissing.length === 0) {
        return `CANNOT trigger analysis yet. Too many fields were filled in a single turn — this looks like fabrication. Go back and ask the user about each remaining step.`
      }

      // Final check: current data must be complete (answered OR skipped)
      const missing: string[] = []
      if (!isFieldComplete(data.fullName)) missing.push("fullName")
      if (!isFieldComplete(data.teamMode)) missing.push("teamMode")
      if (!isFieldComplete(data.experienceLevel)) missing.push("experienceLevel")
      if (!isFieldComplete(data.linkedinUrl)) missing.push("linkedinUrl")
      if (!isFieldComplete(data.skills)) missing.push("skills")
      if (!isFieldComplete(data.experiences)) missing.push("experiences")
      if (!isFieldComplete(data.educations)) missing.push("educations")
      if (!isFieldComplete(data.currentRateMin) && !isFieldComplete(data.currentRateMax))
        missing.push("currentRate")
      if (!isFieldComplete(data.dreamRateMin) && !isFieldComplete(data.dreamRateMax))
        missing.push("dreamRate")
      if (!isFieldComplete(data.engagementTypes)) missing.push("engagementTypes")

      if (missing.length > 0) {
        return `CANNOT trigger analysis yet. Still missing: ${missing.join(", ")}. Ask the user about these (or let them skip). Do NOT call trigger_profile_analysis again until all 8 steps are addressed.`
      }

      ctx.analysisRequested = true
      return "Analysis queued."
    },
  })
}
