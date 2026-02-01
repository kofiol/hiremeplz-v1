import { NextRequest } from "next/server"
import { Agent, run, tool } from "@openai/agents"
import { z } from "zod"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import {
  triggerLinkedInScrape as triggerScrapeUtil,
  getLinkedInScrapeStatus as getScrapeStatusUtil,
} from "@/lib/linkedin-scraper.server"
import { getDataStatus } from "@/lib/onboarding-voice-config"
import { verifyAuth, getSupabaseAdmin } from "@/lib/auth.server"
// Profile completeness is now binary — set to 1 after onboarding

// ============================================================================
// Zod Schema for Collected Onboarding Data
// ============================================================================

const SkillSchema = z.object({
  name: z.string(),
})

const ExperienceSchema = z.object({
  title: z.string(),
  company: z.union([z.string(), z.null()]),
  startDate: z.union([z.string(), z.null()]),
  endDate: z.union([z.string(), z.null()]),
  highlights: z.union([z.string(), z.null()]),
})

const EducationSchema = z.object({
  school: z.string(),
  degree: z.union([z.string(), z.null()]),
  field: z.union([z.string(), z.null()]),
  startYear: z.union([z.string(), z.null()]),
  endYear: z.union([z.string(), z.null()]),
})

const CollectedDataSchema = z.object({
  fullName: z.union([z.string(), z.null()]),
  teamMode: z.union([z.enum(["solo", "team"]), z.null()]),
  profilePath: z.union([z.enum(["linkedin", "manual"]), z.null()]),
  linkedinUrl: z.union([z.string(), z.null()]),
  experienceLevel: z.union([
    z.enum(["intern_new_grad", "entry", "mid", "senior", "lead", "director"]),
    z.null(),
  ]),
  skills: z.union([z.array(SkillSchema), z.null()]),
  experiences: z.union([z.array(ExperienceSchema), z.null()]),
  educations: z.union([z.array(EducationSchema), z.null()]),
  currentRateMin: z.union([z.number(), z.null()]),
  currentRateMax: z.union([z.number(), z.null()]),
  dreamRateMin: z.union([z.number(), z.null()]),
  dreamRateMax: z.union([z.number(), z.null()]),
  currency: z.union([z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]), z.null()]),
  engagementTypes: z.union([
    z.array(z.enum(["full_time", "part_time"])),
    z.null(),
  ]),
})

type CollectedData = z.infer<typeof CollectedDataSchema>

// Profile Analysis Response Schema
const ProfileAnalysisResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  categories: z.object({
    skillsBreadth: z.number().min(0).max(100),
    experienceQuality: z.number().min(0).max(100),
    ratePositioning: z.number().min(0).max(100),
    marketReadiness: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()).min(1).max(3),
  improvements: z.array(z.string()).min(1).max(3),
  detailedFeedback: z.string(),
})

type ProfileAnalysisResponse = z.infer<typeof ProfileAnalysisResponseSchema>

const ProfileAnalysisJsonSchema = {
  type: "json_schema" as const,
  name: "ProfileAnalysisResponse",
  strict: true,
  schema: {
    type: "object" as const,
    additionalProperties: false,
    required: [
      "overallScore",
      "categories",
      "strengths",
      "improvements",
      "detailedFeedback",
    ],
    properties: {
      overallScore: { type: "number" },
      categories: {
        type: "object" as const,
        additionalProperties: false,
        required: [
          "skillsBreadth",
          "experienceQuality",
          "ratePositioning",
          "marketReadiness",
        ],
        properties: {
          skillsBreadth: { type: "number" },
          experienceQuality: { type: "number" },
          ratePositioning: { type: "number" },
          marketReadiness: { type: "number" },
        },
      },
      strengths: { type: "array", items: { type: "string" } },
      improvements: { type: "array", items: { type: "string" } },
      detailedFeedback: { type: "string" },
    },
  },
}

// ============================================================================
// Request Schema
// ============================================================================

const RequestSchema = z.object({
  message: z.string(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  collectedData: CollectedDataSchema.partial(),
  stream: z.boolean().optional().default(false),
})

// ============================================================================
// Persist onboarding data + analysis to Supabase
// ============================================================================

type ProfileAnalysisData = {
  overallScore: number
  categories: {
    skillsBreadth: number
    experienceQuality: number
    ratePositioning: number
    marketReadiness: number
  }
  strengths: string[]
  improvements: string[]
  detailedFeedback: string
}

const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  intern_new_grad: "Junior",
  entry: "Entry-Level",
  mid: "Mid-Level",
  senior: "Senior",
  lead: "Lead",
  director: "Director-Level",
}

function generateHeadline(data: Partial<CollectedData>): string {
  const level = data.experienceLevel
    ? EXPERIENCE_LEVEL_LABELS[data.experienceLevel] ?? ""
    : ""
  const topSkills = (data.skills ?? []).slice(0, 4).map((s) => s.name)
  const primaryTitle = data.experiences?.[0]?.title ?? "Freelancer"

  if (topSkills.length > 0) {
    return `${level} ${primaryTitle} — ${topSkills.join(" | ")}`.trim()
  }
  return `${level} ${primaryTitle}`.trim()
}

function generateAbout(data: Partial<CollectedData>): string {
  const name = data.fullName ?? "Freelancer"
  const level = data.experienceLevel
    ? EXPERIENCE_LEVEL_LABELS[data.experienceLevel]?.toLowerCase() ?? ""
    : ""
  const skills = (data.skills ?? []).map((s) => s.name)
  const latestExp = data.experiences?.[0]
  const engagementLabel =
    data.engagementTypes?.includes("full_time") &&
    data.engagementTypes?.includes("part_time")
      ? "full-time and part-time"
      : data.engagementTypes?.includes("full_time")
        ? "full-time"
        : "part-time"

  const parts: string[] = []

  if (latestExp) {
    const companyPart = latestExp.company ? ` at ${latestExp.company}` : ""
    parts.push(
      `${name} is a ${level} ${latestExp.title}${companyPart}.`.replace(
        /\s+/g,
        " "
      )
    )
  } else {
    parts.push(`${name} is a ${level} freelance professional.`.replace(/\s+/g, " "))
  }

  if (skills.length > 0) {
    const skillList =
      skills.length <= 3
        ? skills.join(", ")
        : `${skills.slice(0, 3).join(", ")} and ${skills.length - 3} more`
    parts.push(`Specializing in ${skillList}.`)
  }

  parts.push(`Available for ${engagementLabel} engagements.`)

  return parts.join(" ")
}

async function persistOnboardingComplete(
  authContext: { userId: string; teamId: string },
  collectedData: Partial<CollectedData>,
  analysis: ProfileAnalysisData
) {
  const supabase = getSupabaseAdmin()
  const { userId, teamId } = authContext
  const now = new Date().toISOString()

  // Generate headline and about from collected data
  const headline = generateHeadline(collectedData)
  const about = generateAbout(collectedData)

  // Save profile with generated fields and mark onboarding complete (score = 1)
  await supabase
    .from("profiles")
    .update({
      display_name: collectedData.fullName ?? undefined,
      headline,
      about,
      team_mode: collectedData.teamMode ?? "solo",
      linkedin_url: collectedData.linkedinUrl ?? undefined,
      profile_completeness_score: 1,
      onboarding_completed_at: now,
      updated_at: now,
    } as never)
    .eq("user_id", userId)
    .eq("team_id", teamId)

  // Save skills (delete + insert)
  if (collectedData.skills && collectedData.skills.length > 0) {
    await supabase
      .from("user_skills")
      .delete()
      .eq("user_id", userId)
      .eq("team_id", teamId)

    await supabase.from("user_skills").insert(
      collectedData.skills.map((s) => ({
        team_id: teamId,
        user_id: userId,
        name: s.name,
        level: 3,
        years: null,
      }))
    )
  }

  // Save experiences
  if (collectedData.experiences && collectedData.experiences.length > 0) {
    await supabase
      .from("user_experiences")
      .delete()
      .eq("user_id", userId)
      .eq("team_id", teamId)

    await supabase.from("user_experiences").insert(
      collectedData.experiences.map((e) => ({
        team_id: teamId,
        user_id: userId,
        title: e.title,
        company: e.company ?? null,
        start_date: e.startDate ?? null,
        end_date: e.endDate ?? null,
        highlights: e.highlights ?? null,
      }))
    )
  }

  // Save educations
  if (collectedData.educations && collectedData.educations.length > 0) {
    await supabase
      .from("user_educations")
      .delete()
      .eq("user_id", userId)
      .eq("team_id", teamId)

    await supabase.from("user_educations").insert(
      collectedData.educations.map((e) => ({
        team_id: teamId,
        user_id: userId,
        school: e.school,
        degree: e.degree ?? null,
        field: e.field ?? null,
        start_year: e.startYear ? parseInt(e.startYear) : null,
        end_year: e.endYear ? parseInt(e.endYear) : null,
      }))
    )
  }

  // Save preferences
  const hasDreamRate =
    collectedData.dreamRateMin != null || collectedData.dreamRateMax != null
  const hasCurrentRate =
    collectedData.currentRateMin != null || collectedData.currentRateMax != null

  if (hasDreamRate || hasCurrentRate || collectedData.currency) {
    await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        team_id: teamId,
        platforms: ["upwork", "linkedin"],
        currency: collectedData.currency ?? "USD",
        hourly_min: collectedData.dreamRateMin ?? null,
        hourly_max: collectedData.dreamRateMax ?? null,
        current_hourly_min: collectedData.currentRateMin ?? null,
        current_hourly_max: collectedData.currentRateMax ?? null,
        project_types: ["short_gig", "medium_project"],
        tightness: 3,
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
  }

  // Save profile analysis
  await supabase.from("profile_analyses").insert({
    team_id: teamId,
    user_id: userId,
    overall_score: analysis.overallScore,
    categories: analysis.categories,
    strengths: analysis.strengths,
    improvements: analysis.improvements,
    detailed_feedback: analysis.detailedFeedback,
  })
}

function readEnvLocalValue(key: string) {
  try {
    const envPath = path.join(process.cwd(), ".env.local")
    if (!existsSync(envPath)) {
      return null
    }

    const lines = readFileSync(envPath, "utf8").split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) {
        continue
      }

      const separatorIndex = trimmed.indexOf("=")
      if (separatorIndex === -1) {
        continue
      }

      const currentKey = trimmed.slice(0, separatorIndex).trim()
      if (currentKey !== key) {
        continue
      }

      let value = trimmed.slice(separatorIndex + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      return value || null
    }
  } catch {
    return null
  }

  return null
}

// ============================================================================
// LinkedIn URL Detection (server-side, kept for scrape trigger)
// ============================================================================

const LINKEDIN_URL_RE = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i

function extractLinkedInUrl(message: string): string | null {
  const match = message.match(LINKEDIN_URL_RE)
  return match ? match[0] : null
}

// ============================================================================
// Agent Instructions
// ============================================================================

const CONVERSATIONAL_AGENT_INSTRUCTIONS = `You are a friendly, casual onboarding assistant for HireMePlz, a platform that helps freelancers find work.

## Your Personality
- Warm, approachable, and conversational
- Concise but not robotic
- No emojis
- Never be annoying or repetitive
- **ALWAYS use the user's first name frequently** — aim to include it in almost every response to make the conversation personal and engaging

## CRITICAL RULES
1. **ONE question per message** — never ask multiple questions
2. **Check the "ALREADY COLLECTED" section** — NEVER ask about those items
3. **ONLY ask the question marked "<<<< ASK THIS ONE NEXT"** in the STILL NEEDED list — do NOT skip ahead, do NOT pick a different item
4. **ALWAYS call save_profile_data** whenever the user provides ANY profile information
5. **NEVER call trigger_profile_analysis AND ask a question in the same turn.** If there are STILL NEEDED items, ask the next question and do NOT trigger analysis.
6. **NEVER call trigger_profile_analysis if ANY items remain in STILL NEEDED** — even optional ones. Ask about them first.
7. **NEVER say "last thing", "final question", or similar** unless the item marked NEXT is linkedinUrl. You do not know how many items remain — just ask the next one naturally.

## Flow (STILL NEEDED list controls the order — trust it, do NOT reorder)
The system generates a numbered STILL NEEDED list. ALWAYS ask about item #1 (marked <<<<). The order is:
fullName → experienceLevel → skills → experiences → education → currentRate → dreamRate → engagementTypes → linkedinUrl
(teamMode is auto-set to "solo" and not asked)

## LinkedIn Enhancement (final step)
When the user provides a LinkedIn URL at the end:
- The system will automatically scrape their profile and merge data with what was manually collected
- After LinkedIn data is merged, if all required fields are present, call trigger_profile_analysis
- If the user says "skip" or similar, call trigger_profile_analysis with the manually collected data

## Probing for Detail — ALWAYS prefer asking for more over accepting thin answers
- It is MUCH better to ask a follow-up than to accept a vague answer and later penalize the user in the analysis.
- When the user gives a bare-bones answer for experiences (e.g. "dev at Google"), ask a follow-up: "Nice! Roughly when was that, and what did you work on?"
- When the user gives fewer than 3 skills, say something like: "Got it — any other tools or frameworks you use regularly?"
- When experience descriptions lack detail (no dates, no highlights, no metrics), ask ONE follow-up: "Could you share rough dates and a key accomplishment from that role?"
- For education, if they just say a school name, ask: "What did you study there?"
- You may ask UP TO TWO follow-ups per topic if the answers are very thin. After two follow-ups, accept what you have and move on.
- The goal is to collect RICH data so the profile analysis is accurate and fair. Thin data = harsh analysis. Help the user by drawing out details.

## Tool Usage
- Call save_profile_data EVERY TIME the user provides information, even partial
- When extracting rates, parse ranges like "$50-100" into min/max values
- For currency, detect from symbols ($=USD, €=EUR, £=GBP) or default to USD
- Call trigger_profile_analysis ONLY when STILL NEEDED says "ALL DONE"

## Response Format When Items Are STILL NEEDED
- 1-2 sentences acknowledging their input, **using their first name**
- Then ask the ONE question for the item marked <<<< ASK THIS ONE NEXT
- Sound human, not like a form
- Do NOT say "last thing" or "almost done" — just ask naturally
- Examples: "Thanks, [Name]! Now let me ask...", "Got it, [Name]. Next question...", "Perfect, [Name]..."

## Profile Readiness (STILL NEEDED says "ALL DONE")
When STILL NEEDED says "ALL DONE" and ONLY then:
- Call trigger_profile_analysis with confirmation: true
- Give a warm, brief wrap-up (1-2 sentences confirming you have everything)
- Do NOT ask any further questions
- Do NOT end your message with a question mark
- Example: "That's everything I need! Let me analyze your profile now."

**IF STILL NEEDED HAS ANY ITEMS — even one — do NOT trigger analysis. Ask the next question instead.**`

const PROFILE_ANALYSIS_INSTRUCTIONS = `You are a professional career advisor. Analyze the user's freelancer profile and provide comprehensive feedback.

## IMPORTANT: Scope of Analysis
You are analyzing data collected during a structured onboarding chat. ONLY evaluate what was actually provided.
- Do NOT penalize for missing portfolio links, GitHub, LinkedIn, or website — those are not collected during onboarding.
- Do NOT penalize for missing case studies, work samples, or project links — those come later.
- Do NOT suggest adding things that are outside the onboarding scope (e.g. "add a portfolio" or "link your GitHub").
- DO evaluate: skills breadth/depth, experience relevance, education, rate positioning, and engagement preferences.
- Focus your advice on what the user CAN improve: skill descriptions, experience highlights, rate strategy, and market positioning.

## Response Format
Return valid JSON with this exact structure:
{
  "overallScore": <number 0-100>,
  "categories": {
    "skillsBreadth": <number 0-100>,
    "experienceQuality": <number 0-100>,
    "ratePositioning": <number 0-100>,
    "marketReadiness": <number 0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "detailedFeedback": "<2-3 paragraphs of prose feedback>"
}

## Category Scoring Guidelines
- **skillsBreadth** (0-100): Variety and depth of skills. Are they specialized enough? Do they have complementary skills?
- **experienceQuality** (0-100): Relevance, detail, and track record of their experience. Are highlights specific and impactful?
- **ratePositioning** (0-100): How well their current and dream rates align with their experience level and market. Is the gap realistic?
- **marketReadiness** (0-100): Overall readiness to win freelance work based on the full picture.

## Field Guidelines
- **strengths**: 1-3 concise bullet points about what's strong in their profile. Each should be a single sentence.
- **improvements**: 1-3 concise, actionable suggestions for improving what was shared (NOT for adding external links/portfolio). Each should be a single sentence.
- **detailedFeedback**: A rich, detailed markdown analysis. This is the main body of the report — make it long and thorough.
  - Start with a "## Strengths" section listing the same strengths from the strengths array as bullet points, with extra detail/context for each.
  - Follow with a "## Areas for Improvement" section listing the improvements with expanded advice.
  - Then include sections like "## Rate Analysis", "## Market Insights", "## Next Steps".
  - Use heading hierarchy: ## for main sections, ### for subsections, #### for sub-subsections. Vary the depth.
  - Use bullet points, numbered lists, bold text, and other markdown formatting freely.
  - CRITICAL: Each list item and each heading MUST be on its own line. Use real newlines (\n), never put multiple list items or headings on the same line. Example:
    "## Next Steps\n\n1. First action item\n2. Second action item\n3. Third action item"
    NOT: "1. First 2. Second 3. Third"
  - Write like a career coach — actionable, specific, grounded in their data.

Be encouraging but honest. Ground every observation in the data that was actually provided.`

// ============================================================================
// LinkedIn Scraping Helpers
// ============================================================================

const POLL_INTERVAL_MS = 5_000
const MAX_TOTAL_POLLS = 60

// ============================================================================
// API Route
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Optional auth — used to persist data after analysis
    const authHeader = request.headers.get("Authorization")
    let authContext: { userId: string; teamId: string } | null = null
    if (authHeader) {
      try {
        authContext = await verifyAuth(authHeader)
      } catch {
        // Auth is optional for chat, ignore failures
      }
    }

    const json = await request.json()
    const parsed = RequestSchema.safeParse(json)

    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "invalid_payload",
            message: "Invalid request payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const { message, conversationHistory, collectedData, stream } = parsed.data

    const apiKey =
      readEnvLocalValue("OPENAI_API_KEY") ?? process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error("OPENAI_API_KEY is not configured in environment")
      return Response.json(
        {
          error: {
            code: "configuration_error",
            message: "OpenAI API key is not configured",
          },
        },
        { status: 500 }
      )
    }

    process.env.OPENAI_API_KEY = apiKey

    const conversationContext = conversationHistory
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")

    // ── Closure state for tool execution ──────────────────────────
    let collectedDataState: Partial<CollectedData> = { ...collectedData }
    let analysisRequested = false

    // ── Tool definitions ──────────────────────────────────────────
    // NOTE: OpenAI strict mode requires all properties in `required`.
    // Use `.nullable()` instead of `.optional()` so the model sends null for unused fields.
    //
    // Type casts on `parameters` work around a TS resolution issue:
    // a stale @openai/agents-core version hoisted outside the project
    // exports Zod 3 types while the project uses Zod 4. Runtime is correct.
    const saveProfileDataParams = z.object({
      fullName: z.string().nullable(),
      teamMode: z.enum(["solo", "team"]).nullable(),
      profilePath: z.enum(["linkedin", "manual"]).nullable(),
      linkedinUrl: z.string().nullable(),
      experienceLevel: z
        .enum(["intern_new_grad", "entry", "mid", "senior", "lead", "director"])
        .nullable(),
      skills: z
        .array(z.object({ name: z.string() }))
        .nullable(),
      experiences: z
        .array(
          z.object({
            title: z.string(),
            company: z.union([z.string(), z.null()]),
            startDate: z.union([z.string(), z.null()]),
            endDate: z.union([z.string(), z.null()]),
            highlights: z.union([z.string(), z.null()]),
          })
        )
        .nullable(),
      educations: z
        .array(
          z.object({
            school: z.string(),
            degree: z.union([z.string(), z.null()]),
            field: z.union([z.string(), z.null()]),
            startYear: z.union([z.string(), z.null()]),
            endYear: z.union([z.string(), z.null()]),
          })
        )
        .nullable(),
      currentRateMin: z.number().nullable(),
      currentRateMax: z.number().nullable(),
      dreamRateMin: z.number().nullable(),
      dreamRateMax: z.number().nullable(),
      currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).nullable(),
      engagementTypes: z
        .array(z.enum(["full_time", "part_time"]))
        .nullable(),
    })
    type SaveProfileDataInput = z.infer<typeof saveProfileDataParams>

    const saveProfileData = tool({
      name: "save_profile_data",
      description:
        "Save structured profile data extracted from the user's message. Call EVERY TIME user provides info. Pass null for fields you are NOT saving.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters: saveProfileDataParams as any,
      execute: async (_input: unknown) => {
        const args = _input as SaveProfileDataInput
        for (const [key, value] of Object.entries(args)) {
          if (value !== null && value !== undefined) {
            ;(collectedDataState as Record<string, unknown>)[key] = value
          }
        }
        return "Data saved."
      },
    })

    const triggerProfileAnalysis = tool({
      name: "trigger_profile_analysis",
      description:
        "Trigger profile analysis. ONLY call when STILL NEEDED says 'ALL DONE'. You must have asked about LinkedIn (user provided URL or explicitly skipped) before calling this.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters: z.object({ confirmation: z.literal(true) }) as any,
      execute: async () => {
        // Server-side guard: reject if required fields are missing
        const missing: string[] = []
        if (!collectedDataState.fullName) missing.push("fullName")
        if (!collectedDataState.teamMode) missing.push("teamMode")
        if (!collectedDataState.experienceLevel) missing.push("experienceLevel")
        if (!collectedDataState.skills || collectedDataState.skills.length < 3)
          missing.push("skills (need at least 3)")
        if (!collectedDataState.experiences || collectedDataState.experiences.length < 1)
          missing.push("experiences (need at least 1)")
        if (!collectedDataState.educations || collectedDataState.educations.length < 1)
          missing.push("educations (need at least 1)")
        if (collectedDataState.currentRateMin == null && collectedDataState.currentRateMax == null)
          missing.push("currentRate")
        if (collectedDataState.dreamRateMin == null && collectedDataState.dreamRateMax == null)
          missing.push("dreamRate")
        if (!collectedDataState.engagementTypes || collectedDataState.engagementTypes.length < 1)
          missing.push("engagementTypes")

        if (missing.length > 0) {
          return `CANNOT trigger analysis yet. Still missing: ${missing.join(", ")}. Ask the user about these first. Do NOT call trigger_profile_analysis again until all items are resolved.`
        }

        analysisRequested = true
        return "Analysis queued."
      },
    })

    // getDataStatus is imported from @/lib/onboarding-voice-config (shared between text + voice)

    // Create prompt dynamically with current data state
    const createPrompt = (
      currentData: Partial<CollectedData>,
      extraContext?: string
    ) => {
      const status = getDataStatus(currentData)
      const filled = status.filled
      let missing = status.missing

      // If user is skipping LinkedIn and that's the only remaining item, treat as ALL DONE
      // Only detect skip if the previous assistant message actually asked about LinkedIn
      const lastAssistantMsg = conversationHistory
        .filter((m) => m.role === "assistant")
        .at(-1)?.content?.toLowerCase() ?? ""
      const linkedinWasAsked = lastAssistantMsg.includes("linkedin")
      const isLinkedinSkip =
        missing.length === 1 &&
        missing[0].startsWith("linkedinUrl") &&
        linkedinWasAsked &&
        /skip|no|don'?t|analyze|pass|nah/i.test(message)
      if (isLinkedinSkip) {
        missing = []
      }

      const stillNeeded =
        missing.length > 0
          ? missing
              .map((item, i) => `${i + 1}. ${item}${i === 0 ? " <<<< ASK THIS ONE NEXT" : ""}`)
              .join("\n")
          : "ALL DONE - profile is complete! Call trigger_profile_analysis now."
      return `
## ALREADY COLLECTED (DO NOT ask about these again):
${filled.length > 0 ? filled.join("\n") : "Nothing yet"}

## STILL NEEDED (ask ONLY item #1 — ignore the rest until #1 is done):
${stillNeeded}

## Conversation so far:
${conversationContext}

## User's new message:
${message}
${extraContext ? `\n## Additional context:\n${extraContext}` : ""}

Respond naturally. Ask about the FIRST missing item only. NEVER re-ask about already collected data.
REMEMBER: Call save_profile_data for any info the user provided. Call trigger_profile_analysis when ALL required fields are present.`
    }

    if (stream) {
      const encoder = new TextEncoder()

      const readableStream = new ReadableStream({
        async start(controller) {
          const sseEmit = (event: object) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            )
          }

          async function streamAgent(
            agent: Agent,
            prompt: string
          ): Promise<string> {
            let text = ""
            const result = await run(agent, prompt, { stream: true })
            const textStream = result.toTextStream({
              compatibleWithNodeStreams: false,
            })
            for await (const chunk of textStream) {
              text += chunk
              sseEmit({ type: "text", content: chunk })
            }
            await result.completed
            return text
          }

          const linkedInUrl = extractLinkedInUrl(message)

          try {
            if (linkedInUrl) {
              // ── Phase 1: Stream filler text ──────────────────────────
              const fillerAgent = new Agent({
                name: "Conversational Assistant",
                instructions:
                  CONVERSATIONAL_AGENT_INSTRUCTIONS +
                  `\n\nIMPORTANT: The user just provided their LinkedIn profile URL. Acknowledge it briefly and let them know you're fetching their profile data now. Keep your response to 1-2 short sentences. Do NOT call any tools. Do NOT ask any questions — just confirm you're fetching their profile.`,
                model: "gpt-4.1-nano",
              })
              await streamAgent(fillerAgent, createPrompt(collectedDataState))

              // ── Phase 2: Trigger scrape + poll ──────────────────────
              sseEmit({
                type: "tool_call",
                name: "linkedin_scrape",
                status: "started",
              })

              const { runId } = await triggerScrapeUtil(linkedInUrl)

              let scrapeResult: Awaited<
                ReturnType<typeof getScrapeStatusUtil>
              > | null = null

              for (let i = 0; i < MAX_TOTAL_POLLS; i++) {
                const status = await getScrapeStatusUtil(runId)

                if (
                  status.status === "completed" ||
                  status.status === "failed"
                ) {
                  scrapeResult = status
                  break
                }

                sseEmit({ type: "tool_status", elapsed: (i + 1) * 5 })
                await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
              }

              if (!scrapeResult) {
                scrapeResult = {
                  status: "failed" as const,
                  error: "Scraping timed out",
                }
              }

              // ── Phase 3: Handle results ────────────────────────────
              if (scrapeResult.status === "completed") {
                sseEmit({
                  type: "tool_call",
                  name: "linkedin_scrape",
                  status: "completed",
                })

                const profile = scrapeResult.profile

                // Merge LinkedIn data with existing manual data (manual data takes priority, LinkedIn fills gaps)
                collectedDataState = {
                  ...collectedDataState,
                  linkedinUrl: profile.linkedinUrl || linkedInUrl,
                  experienceLevel:
                    collectedDataState.experienceLevel ||
                    profile.experienceLevel,
                  skills: collectedDataState.skills?.length
                    ? collectedDataState.skills
                    : profile.skills?.length
                      ? profile.skills.map((s) => ({ name: s.name }))
                      : collectedDataState.skills,
                  experiences: collectedDataState.experiences?.length
                    ? collectedDataState.experiences
                    : profile.experiences?.length
                      ? profile.experiences.map((e) => ({
                          title: e.title,
                          company: e.company,
                          startDate: e.startDate,
                          endDate: e.endDate,
                          highlights: e.highlights,
                        }))
                      : collectedDataState.experiences,
                  educations: collectedDataState.educations?.length
                    ? collectedDataState.educations
                    : profile.educations?.length
                      ? profile.educations.map((e) => ({
                          school: e.school,
                          degree: e.degree,
                          field: e.field,
                          startYear: e.startYear,
                          endYear: e.endYear,
                        }))
                      : collectedDataState.educations,
                }

                const profileJson = JSON.stringify(profile, null, 2)

                // Run tool-equipped agent — it should see all data is complete and trigger analysis
                const summaryAgent = new Agent({
                  name: "Conversational Assistant",
                  instructions: CONVERSATIONAL_AGENT_INSTRUCTIONS,
                  model: "gpt-4.1-nano",
                  tools: [saveProfileData, triggerProfileAnalysis],
                })

                const summaryPrompt = createPrompt(
                  collectedDataState,
                  `LinkedIn profile fetched successfully and merged with manually collected data:\n${profileJson}\n\nSummarize what LinkedIn added to their profile in 1-2 sentences. If all required fields are now present, call trigger_profile_analysis. If anything is still missing, ask about the first missing item.`
                )

                sseEmit({ type: "text", content: "\n\n" })
                await streamAgent(summaryAgent, summaryPrompt)
              } else {
                sseEmit({
                  type: "tool_call",
                  name: "linkedin_scrape",
                  status: "failed",
                })

                const errorAgent = new Agent({
                  name: "Conversational Assistant",
                  instructions: CONVERSATIONAL_AGENT_INSTRUCTIONS,
                  model: "gpt-4.1-nano",
                })

                const errorPrompt = createPrompt(
                  collectedDataState,
                  `LinkedIn scrape failed: "${scrapeResult.error}". Apologize briefly and ask them to try again or set up manually.`
                )

                sseEmit({ type: "text", content: "\n\n" })
                await streamAgent(errorAgent, errorPrompt)
              }
            } else {
              // ── Normal flow (no LinkedIn URL) ───────────────────────
              const conversationalAgent = new Agent({
                name: "Conversational Assistant",
                instructions: CONVERSATIONAL_AGENT_INSTRUCTIONS,
                model: "gpt-4.1-nano",
                tools: [saveProfileData, triggerProfileAnalysis],
              })
              await streamAgent(
                conversationalAgent,
                createPrompt(collectedDataState)
              )
            }

            // ── Emit final data ───────────────────────────────────
            sseEmit({
              type: "final",
              collectedData: collectedDataState,
              isComplete: analysisRequested,
            })

            // ── Profile Analysis (when triggered by tool) ─────────
            if (analysisRequested && !request.signal.aborted) {
              sseEmit({ type: "analysis_started" })

              const profileAnalysisPrompt = `
Analyze this freelancer profile and provide comprehensive feedback:

Profile Data:
${JSON.stringify(collectedDataState, null, 2)}

Provide an overall score (0-100), category scores, strengths, improvements, and detailed feedback.
Include rate analysis comparing their current rate vs dream rate.`

              const profileAnalysisAgent = new Agent({
                name: "Profile Analyst",
                instructions: PROFILE_ANALYSIS_INSTRUCTIONS,
                model: "gpt-5.2",
                modelSettings: { reasoningEffort: "high" },
                outputType: ProfileAnalysisJsonSchema,
              })

              try {
                const reasoningStartTime = Date.now()
                sseEmit({ type: "reasoning_started" })

                const analysisResult = await run(
                  profileAnalysisAgent,
                  profileAnalysisPrompt,
                  { stream: true }
                )

                const textStream = analysisResult.toTextStream({
                  compatibleWithNodeStreams: false,
                })

                for await (const chunk of textStream) {
                  if (request.signal.aborted) break
                  if (chunk) {
                    sseEmit({ type: "reasoning_chunk", content: chunk })
                  }
                }

                if (!request.signal.aborted) {
                  // Signal transition from thinking to evaluating
                  sseEmit({ type: "reasoning_evaluating" })

                  await analysisResult.completed

                  const reasoningDuration = Math.round(
                    (Date.now() - reasoningStartTime) / 1000
                  )
                  sseEmit({
                    type: "reasoning_completed",
                    duration: reasoningDuration,
                  })

                  if (analysisResult.finalOutput) {
                    const analysis = ProfileAnalysisResponseSchema.parse(
                      analysisResult.finalOutput
                    ) as ProfileAnalysisResponse

                    sseEmit({
                      type: "profile_analysis",
                      overallScore: analysis.overallScore,
                      categories: analysis.categories,
                      strengths: analysis.strengths,
                      improvements: analysis.improvements,
                      detailedFeedback: analysis.detailedFeedback,
                    })

                    // Persist collected data + analysis to Supabase
                    if (authContext) {
                      try {
                        await persistOnboardingComplete(
                          authContext,
                          collectedDataState,
                          analysis
                        )
                      } catch (persistError) {
                        console.error("Failed to persist onboarding data:", persistError)
                      }
                    }
                  }
                }
              } catch (analysisError) {
                console.error("Profile analysis error:", analysisError)
                sseEmit({
                  type: "analysis_error",
                  message: "Could not generate profile analysis",
                })
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          } catch (error) {
            console.error("Streaming error:", error)
            sseEmit({
              type: "error",
              message:
                error instanceof Error ? error.message : "Streaming failed",
            })
            controller.close()
          }
        },
      })

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    // Non-streaming response (simplified)
    let messageText = ""
    const linkedInUrl = extractLinkedInUrl(message)

    if (linkedInUrl) {
      messageText =
        "Thanks for sharing your LinkedIn profile! Let me fetch your details..."

      const { runId } = await triggerScrapeUtil(linkedInUrl)
      let scrapeResult: Awaited<
        ReturnType<typeof getScrapeStatusUtil>
      > | null = null
      for (let i = 0; i < MAX_TOTAL_POLLS; i++) {
        const status = await getScrapeStatusUtil(runId)
        if (status.status === "completed" || status.status === "failed") {
          scrapeResult = status
          break
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      }

      if (scrapeResult?.status === "completed") {
        const profile = scrapeResult.profile
        collectedDataState = {
          ...collectedDataState,
          linkedinUrl: profile.linkedinUrl || linkedInUrl,
          experienceLevel: collectedDataState.experienceLevel || profile.experienceLevel,
          skills: collectedDataState.skills?.length
            ? collectedDataState.skills
            : profile.skills?.map((s) => ({ name: s.name })),
          experiences: collectedDataState.experiences?.length
            ? collectedDataState.experiences
            : profile.experiences?.map((e) => ({
                title: e.title,
                company: e.company,
                startDate: e.startDate,
                endDate: e.endDate,
                highlights: e.highlights,
              })),
          educations: collectedDataState.educations?.length
            ? collectedDataState.educations
            : profile.educations?.map((e) => ({
                school: e.school,
                degree: e.degree,
                field: e.field,
                startYear: e.startYear,
                endYear: e.endYear,
              })),
        }
        messageText += `\n\nI found your profile and merged the data! Let me analyze your profile now.`
      } else {
        messageText += `\n\nSorry, I couldn't fetch your profile. Would you like to try again or set up manually?`
      }
    } else {
      const conversationalAgent = new Agent({
        name: "Conversational Assistant",
        instructions: CONVERSATIONAL_AGENT_INSTRUCTIONS,
        model: "gpt-4.1-nano",
        tools: [saveProfileData, triggerProfileAnalysis],
      })
      const result = await run(
        conversationalAgent,
        createPrompt(collectedDataState)
      )
      messageText =
        typeof result.finalOutput === "string"
          ? result.finalOutput
          : String(result.finalOutput ?? "")
    }

    return Response.json({
      message: messageText,
      collectedData: collectedDataState,
      isComplete: analysisRequested,
    })
  } catch (error) {
    console.error("Onboarding chat error:", error)

    if (error instanceof Error) {
      return Response.json(
        {
          error: {
            code: "chat_error",
            message: error.message,
          },
        },
        { status: 500 }
      )
    }

    return Response.json(
      {
        error: {
          code: "chat_error",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    )
  }
}
