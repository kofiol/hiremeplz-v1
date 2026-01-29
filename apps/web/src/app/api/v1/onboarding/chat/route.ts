import { NextRequest } from "next/server"
import { Agent, run, tool } from "@openai/agents"
import { z } from "zod"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import {
  triggerLinkedInScrape as triggerScrapeUtil,
  getLinkedInScrapeStatus as getScrapeStatusUtil,
} from "@/lib/linkedin-scraper.server"

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
  score: z.number().min(0).max(100),
  title: z.string(),
  summary: z.string(),
  analysis: z.string(),
})

type ProfileAnalysisResponse = z.infer<typeof ProfileAnalysisResponseSchema>

const ProfileAnalysisJsonSchema = {
  type: "json_schema" as const,
  name: "ProfileAnalysisResponse",
  strict: true,
  schema: {
    type: "object" as const,
    additionalProperties: false,
    required: ["score", "title", "summary", "analysis"],
    properties: {
      score: { type: "number" },
      title: { type: "string" },
      summary: { type: "string" },
      analysis: { type: "string" },
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

## CRITICAL RULES
1. **ONE question per message** - never ask multiple questions
2. **Check the "ALREADY COLLECTED" section** - NEVER ask about those items
3. **Ask about the FIRST item in "STILL NEEDED"** - follow the priority order below
4. **ALWAYS call save_profile_data** whenever the user provides ANY profile information
5. **Call trigger_profile_analysis** ONLY when ALL required fields are present

## Required Fields for Analysis
ALL of these must be present before calling trigger_profile_analysis:
- teamMode
- experienceLevel
- skills (at least 3)
- experiences (at least 1)
- educations (at least 1)
- currentRate (min or max)
- dreamRate (min or max)

## LinkedIn Flow (profilePath: linkedin)
When LinkedIn data is fetched:
- Skills, experience, and education come FROM LinkedIn - DO NOT ask about them
- ONLY ask about: currentRate → dreamRate
- Engagement types are OPTIONAL - do not block analysis for them
- Summarize their profile briefly, then immediately ask about their current hourly rate

## Manual Flow (profilePath: manual)
Ask in this EXACT order (one at a time):
1. experienceLevel - "What's your experience level?" (entry/mid/senior/lead/director)
2. skills - "What are your main skills?" (list specific technologies, frameworks, languages — need at least 3). If user gives fewer than 3, ask for more.
3. experiences - "Tell me about your most recent role — title, company, rough dates, and what you worked on." Push for detail: dates (even approximate like "2022-2024"), key accomplishments, technologies used. If the answer is vague, ask ONE follow-up for highlights/achievements before moving on.
4. education - "What's your highest education? School, degree, and field?"
5. currentRate - "What's your current hourly rate or range?"
6. dreamRate - "What would your dream hourly rate be — what you'd love to earn?"
7. engagementTypes - "Are you looking for full-time, part-time, or both?"

## Probing for Detail
- When the user gives a bare-bones answer for experiences (e.g. "dev at Google"), ask a SINGLE follow-up: "Nice! Roughly when was that, and what did you work on?"
- When the user gives fewer than 3 skills, say something like: "Got it — any other tools or frameworks you use regularly?"
- Do NOT ask more than ONE follow-up per topic. If they give a vague second answer, accept it and move on.

## Tool Usage
- Call save_profile_data EVERY TIME the user provides information, even partial
- When extracting rates, parse ranges like "$50-100" into min/max values
- For currency, detect from symbols ($=USD, €=EUR, £=GBP) or default to USD
- Call trigger_profile_analysis ONLY when all required fields are confirmed present

## Response Format When Items Are STILL NEEDED
- 1-2 sentences acknowledging their input
- Then ask the ONE question for the first missing item
- Sound human, not like a form

## Profile Readiness (STILL NEEDED says "ALL DONE")
When all required data has been collected:
- Call trigger_profile_analysis with confirmation: true
- Give a warm, brief wrap-up (1-2 sentences confirming you have everything)
- Do NOT ask any further questions
- Do NOT end your message with a question mark
- Example: "That's everything I need! Let me analyze your profile now."`

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
  "score": <number 0-100>,
  "title": "Profile Analysis",
  "summary": "<3-5 word summary like 'Strong Senior Developer Profile'>",
  "analysis": "<Full markdown analysis with proper ### headings>"
}

## Analysis Markdown Format - USE EXACT SYNTAX
The "analysis" field MUST use proper markdown heading syntax with ### prefix:

\`\`\`markdown
### Overview
Brief 2-3 sentence overview of the profile.

### Strengths
- First strength point
- Second strength point
- Third strength point

### Areas for Improvement
- Focus on gaps in the PROVIDED data: vague experience descriptions, missing dates, limited skill variety, etc.
- Suggest concrete ways to strengthen what was shared.

### Rate Analysis
- Current rate assessment relative to experience level and skill set
- Dream rate feasibility and market comparison for their specialization
- Concrete steps to bridge the gap between current and dream rate

### Market Insights
- How their skills and experience position them in the current market
- Complementary skills that would increase their rate

### Next Steps
1. First actionable item based on their profile data
2. Second actionable item
3. Third actionable item
\`\`\`

IMPORTANT: You MUST include the "### " prefix (hash-hash-hash-space) before each heading. Without it, headings won't render correctly.

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
      teamMode: z.enum(["solo", "team"]).nullable(),
      profilePath: z.enum(["linkedin", "manual"]).nullable(),
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
        "Trigger profile analysis. ONLY call when ALL required fields are present: teamMode, experienceLevel, skills (3+), experiences (1+), educations (1+), currentRate, dreamRate.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters: z.object({ confirmation: z.literal(true) }) as any,
      execute: async () => {
        // Server-side guard: reject if required fields are missing
        const missing: string[] = []
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

        if (missing.length > 0) {
          return `CANNOT trigger analysis yet. Still missing: ${missing.join(", ")}. Ask the user about these first.`
        }

        analysisRequested = true
        return "Analysis queued."
      },
    })

    // Helper to show what's collected vs missing
    const getDataStatus = (data: Partial<CollectedData>) => {
      const filled: string[] = []
      const missing: string[] = []
      const isLinkedIn = data.profilePath === "linkedin"
      const isManual = data.profilePath === "manual"

      if (data.teamMode) filled.push(`teamMode: ${data.teamMode}`)
      else missing.push("teamMode")

      if (data.profilePath) filled.push(`profilePath: ${data.profilePath}`)
      else missing.push("profilePath")

      // For LinkedIn: these come from profile, don't ask
      if (isLinkedIn) {
        if (data.experienceLevel)
          filled.push(`experienceLevel: ${data.experienceLevel} (from LinkedIn)`)
        else filled.push("experienceLevel: inferred from LinkedIn")

        if (data.skills?.length)
          filled.push(
            `skills: ${data.skills.map((s) => s.name).join(", ")} (from LinkedIn)`
          )
        else filled.push("skills: from LinkedIn profile")

        if (data.experiences?.length)
          filled.push(
            `experiences: ${data.experiences.length} positions (from LinkedIn)`
          )
        else filled.push("experiences: from LinkedIn profile")

        if (data.educations?.length)
          filled.push(
            `educations: ${data.educations.length} entries (from LinkedIn)`
          )
        else filled.push("educations: from LinkedIn profile")
      } else if (isManual) {
        // Manual path: need to ask all of these
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
            "experiences (ask for recent job: title, company name, duration - need at least 1)"
          )

        if (data.educations?.length)
          filled.push(
            `educations: ${data.educations.map((e) => `${e.degree} from ${e.school}`).join("; ")}`
          )
        else missing.push("education (need at least 1 - school and degree/field)")
      }

      // These ALWAYS need to be asked (LinkedIn doesn't have them)
      if (
        data.currentRateMin !== null &&
        data.currentRateMin !== undefined
      )
        filled.push(
          `currentRate: $${data.currentRateMin}${data.currentRateMax ? `-${data.currentRateMax}` : "+"}${data.currency ? ` ${data.currency}` : ""}`
        )
      else missing.push("currentRate (current hourly rate or range)")

      if (
        data.dreamRateMin !== null &&
        data.dreamRateMin !== undefined
      )
        filled.push(
          `dreamRate: $${data.dreamRateMin}${data.dreamRateMax ? `-${data.dreamRateMax}` : "+"}`
        )
      else missing.push("dreamRate (dream/aspirational hourly rate)")

      // Engagement types are optional
      if (data.engagementTypes?.length)
        filled.push(`engagementTypes: ${data.engagementTypes.join(", ")} (optional)`)

      return { filled, missing }
    }

    // Create prompt dynamically with current data state
    const createPrompt = (
      currentData: Partial<CollectedData>,
      extraContext?: string
    ) => {
      const { filled, missing } = getDataStatus(currentData)
      return `
## ALREADY COLLECTED (DO NOT ask about these again):
${filled.length > 0 ? filled.join("\n") : "Nothing yet"}

## STILL NEEDED (ask about the FIRST one only):
${missing.length > 0 ? missing.join(", ") : "ALL DONE - profile is complete! Call trigger_profile_analysis now."}

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
                  `\n\nIMPORTANT: The user just provided their LinkedIn profile URL. Acknowledge it briefly and let them know you're fetching their profile data now. Keep your response to 1-2 short sentences. Do NOT call any tools right now.`,
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

                // Populate data from LinkedIn directly
                collectedDataState = {
                  ...collectedDataState,
                  profilePath: "linkedin",
                  linkedinUrl: profile.linkedinUrl || linkedInUrl,
                  experienceLevel:
                    profile.experienceLevel ||
                    collectedDataState.experienceLevel,
                  skills: profile.skills?.length
                    ? profile.skills.map((s) => ({ name: s.name }))
                    : collectedDataState.skills,
                  experiences: profile.experiences?.length
                    ? profile.experiences.map((e) => ({
                        title: e.title,
                        company: e.company,
                        startDate: e.startDate,
                        endDate: e.endDate,
                        highlights: e.highlights,
                      }))
                    : collectedDataState.experiences,
                  educations: profile.educations?.length
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

                // Run tool-equipped agent so it can ask about rates
                const summaryAgent = new Agent({
                  name: "Conversational Assistant",
                  instructions: CONVERSATIONAL_AGENT_INSTRUCTIONS,
                  model: "gpt-4.1-nano",
                  tools: [saveProfileData, triggerProfileAnalysis],
                })

                const summaryPrompt = createPrompt(
                  collectedDataState,
                  `LinkedIn profile fetched successfully:\n${profileJson}\n\nIMPORTANT: LinkedIn provides skills and experience - DO NOT ask about those. Summarize their profile in 1-2 sentences (name, headline, notable skills/experience), then ask: "What's your current hourly rate or range?"`
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

Provide a score (0-100), brief summary, and detailed markdown analysis.
Include a "Rate Analysis" section comparing their current rate vs dream rate.`

              const profileAnalysisAgent = new Agent({
                name: "Profile Analyst",
                instructions: PROFILE_ANALYSIS_INSTRUCTIONS,
                model: "gpt-5-mini",
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
                      score: analysis.score,
                      title: analysis.title,
                      summary: analysis.summary,
                      analysis: analysis.analysis,
                    })
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
          profilePath: "linkedin",
          linkedinUrl: profile.linkedinUrl || linkedInUrl,
          experienceLevel: profile.experienceLevel,
          skills: profile.skills?.map((s) => ({ name: s.name })),
          experiences: profile.experiences?.map((e) => ({
            title: e.title,
            company: e.company,
            startDate: e.startDate,
            endDate: e.endDate,
            highlights: e.highlights,
          })),
          educations: profile.educations?.map((e) => ({
            school: e.school,
            degree: e.degree,
            field: e.field,
            startYear: e.startYear,
            endYear: e.endYear,
          })),
        }
        messageText += `\n\nI found your profile! What's your current hourly rate or range?`
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
