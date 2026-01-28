import { NextRequest } from "next/server"
import { Agent, run } from "@openai/agents"
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
  profilePath: z.union([
    z.enum(["linkedin", "upwork", "cv", "portfolio", "manual"]),
    z.null(),
  ]),
  linkedinUrl: z.union([z.string(), z.null()]),
  upworkUrl: z.union([z.string(), z.null()]),
  portfolioUrl: z.union([z.string(), z.null()]),
  experienceLevel: z.union([
    z.enum(["intern_new_grad", "entry", "mid", "senior", "lead", "director"]),
    z.null(),
  ]),
  skills: z.union([z.array(SkillSchema), z.null()]),
  experiences: z.union([z.array(ExperienceSchema), z.null()]),
  educations: z.union([z.array(EducationSchema), z.null()]),
  hourlyMin: z.union([z.number(), z.null()]),
  hourlyMax: z.union([z.number(), z.null()]),
  fixedBudgetMin: z.union([z.number(), z.null()]),
  currency: z.union([z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]), z.null()]),
  preferredProjectLengthMin: z.union([z.number(), z.null()]),
  preferredProjectLengthMax: z.union([z.number(), z.null()]),
  timeZones: z.union([z.array(z.string()), z.null()]),
  engagementTypes: z.union([
    z.array(z.enum(["full_time", "part_time", "internship"])),
    z.null(),
  ]),
  remoteOnly: z.union([z.boolean(), z.null()]),
})

// Data extraction response schema
const DataExtractionResponseSchema = z.object({
  collectedData: CollectedDataSchema.describe(
    "All data collected so far, merged with any new data from the confirmed conversation. Keep all previously collected data."
  ),
  isComplete: z
    .boolean()
    .describe(
      "True only when ALL required fields have been collected: teamMode, profilePath (and corresponding URL if applicable), and at least some preferences (hourlyMin or fixedBudgetMin, currency)"
    ),
})

type DataExtractionResponse = z.infer<typeof DataExtractionResponseSchema>

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

const nullableString = { type: ["string", "null"] } as const
const nullableNumber = { type: ["number", "null"] } as const
const nullableBoolean = { type: ["boolean", "null"] } as const
const nullableEnum = (values: string[]) => ({
  anyOf: [{ type: "string", enum: values }, { type: "null" }],
})

const DataExtractionJsonSchema = {
  type: "json_schema" as const,
  name: "DataExtractionResponse",
  strict: true,
  schema: {
    type: "object" as const,
    additionalProperties: false,
    required: ["collectedData", "isComplete"],
    properties: {
      collectedData: {
        type: "object" as const,
        additionalProperties: false,
        required: [
          "teamMode",
          "profilePath",
          "linkedinUrl",
          "upworkUrl",
          "portfolioUrl",
          "experienceLevel",
          "skills",
          "experiences",
          "educations",
          "hourlyMin",
          "hourlyMax",
          "fixedBudgetMin",
          "currency",
          "preferredProjectLengthMin",
          "preferredProjectLengthMax",
          "timeZones",
          "engagementTypes",
          "remoteOnly",
        ],
        properties: {
          teamMode: nullableEnum(["solo", "team"]),
          profilePath: nullableEnum(["linkedin", "upwork", "cv", "portfolio", "manual"]),
          linkedinUrl: nullableString,
          upworkUrl: nullableString,
          portfolioUrl: nullableString,
          experienceLevel: nullableEnum([
            "intern_new_grad",
            "entry",
            "mid",
            "senior",
            "lead",
            "director",
          ]),
          skills: {
            anyOf: [
              {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                  },
                },
              },
              { type: "null" },
            ],
          },
          experiences: {
            anyOf: [
              {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title", "company", "startDate", "endDate", "highlights"],
                  properties: {
                    title: { type: "string" },
                    company: nullableString,
                    startDate: nullableString,
                    endDate: nullableString,
                    highlights: nullableString,
                  },
                },
              },
              { type: "null" },
            ],
          },
          educations: {
            anyOf: [
              {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["school", "degree", "field", "startYear", "endYear"],
                  properties: {
                    school: { type: "string" },
                    degree: nullableString,
                    field: nullableString,
                    startYear: nullableString,
                    endYear: nullableString,
                  },
                },
              },
              { type: "null" },
            ],
          },
          hourlyMin: nullableNumber,
          hourlyMax: nullableNumber,
          fixedBudgetMin: nullableNumber,
          currency: nullableEnum(["USD", "EUR", "GBP", "CAD", "AUD"]),
          preferredProjectLengthMin: nullableNumber,
          preferredProjectLengthMax: nullableNumber,
          timeZones: {
            anyOf: [
              { type: "array", items: { type: "string" } },
              { type: "null" },
            ],
          },
          engagementTypes: {
            anyOf: [
              {
                type: "array",
                items: {
                  type: "string",
                  enum: ["full_time", "part_time", "internship"],
                },
              },
              { type: "null" },
            ],
          },
          remoteOnly: nullableBoolean,
        },
      },
      isComplete: { type: "boolean" },
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
// Agent Instructions
// ============================================================================

const CONVERSATIONAL_AGENT_INSTRUCTIONS = `You are a friendly, casual onboarding assistant for HireMePlz, a platform that helps freelancers find work.

## Your Personality
- Warm, approachable, and conversational - like chatting with a helpful friend
- Concise but not robotic - use natural language
- No emojis, but vary your word choices (don't always say "Got it" or "Perfect")
- If someone makes a joke or sarcastic comment, play along briefly before continuing
- Never be annoying or repetitive

## STRICT Conversation Flow
Follow this EXACT order. Do NOT skip steps or combine questions:

### Step 1: GREETING (First message only)
If this is the very first message (no conversation history), greet the user warmly as if meeting them for the first time. Something like: "Hey there! Welcome to HireMePlz. I'm here to help you set up your freelancer profile. Let's get started - are you working solo, or do you have a team?"

### Step 2: SOLO OR TEAM
First real question: Are they working solo or with a team?
- Wait for their answer before moving on
- Valid answers: solo, team, just me, with others, etc.

### Step 3: PROFILE SETUP METHOD
After they answer solo/team, ask: "How would you like to set up your profile?"
- Import from LinkedIn
- Share a portfolio link
- Tell me about yourself manually
- Do NOT list Upwork as an option

### Step 4A: If LinkedIn - After scraping completes
Review the scraped data. If ANY of these are missing or unclear, ASK about them:
- Experience level (if not clear from job titles)
- Primary skills (if skill list is empty or too vague)
- Hourly rate range
- Full-time vs part-time preference
- Remote preference

### Step 4B: If Portfolio/Manual
Ask about: experience level → skills → past work highlights → rate range → engagement type → remote preference

## BE SMART - Infer Information
- "$45-100" → USD (dollar sign!)
- "€50-80" → EUR
- "£40-60" → GBP
- Don't re-ask if info is already given

## Important Rules
- ONE question at a time
- Keep responses short (1-3 sentences max)
- If they give gibberish twice, skip and move on
- Sound human, not like a form`

const DATA_EXTRACTION_INSTRUCTIONS = `You are a data extraction agent. Extract structured data from the conversation.

## Smart Extraction Rules
- ALWAYS preserve all previously collected data - never lose existing info
- BE SMART about inferring data:
  - "$45-100" or "$45-$100" → hourlyMin: 45, hourlyMax: 100, currency: "USD"
  - "€50-80" → hourlyMin: 50, hourlyMax: 80, currency: "EUR"
  - "£40-60" → hourlyMin: 40, hourlyMax: 60, currency: "GBP"
  - "45-100/hr" with no symbol → extract numbers, leave currency null unless context helps
- Extract data when the assistant acknowledges/moves forward with the information
- Don't extract from gibberish/random characters the user typed

## What to Extract
- teamMode: "solo" or "team" when user indicates working alone or with a team
- profilePath: when user chooses linkedin/portfolio/manual (NOT upwork)
- URLs: when user provides linkedin/portfolio links
- hourlyMin/hourlyMax: numbers from rate ranges
- currency: INFER from symbols ($=USD, €=EUR, £=GBP) or explicit mention
- experienceLevel: entry, mid, senior, lead, director, intern_new_grad
- skills, experiences, educations: when user mentions them
- engagementTypes: full_time, part_time, internship
- remoteOnly: true/false based on remote preference

## LinkedIn Import Data
When LinkedIn profile data is available from the scraping tool results in the conversation:
- Extract skills, experiences, educations directly from the scraped profile data
- Set profilePath to "linkedin"
- Set linkedinUrl to the provided URL
- Set experienceLevel from the profile's inferred experience level
- Map the profile's skills array to the skills field
- Map the profile's experiences array to the experiences field (title, company, startDate, endDate, highlights)
- Map the profile's educations array to the educations field (school, degree, field, startYear, endYear)

## Completion Criteria
Set isComplete to true ONLY when ALL of these are collected:
1. teamMode (solo/team) - REQUIRED
2. profilePath chosen (linkedin/portfolio/manual) - REQUIRED
3. experienceLevel - REQUIRED
4. skills array with at least 1 skill - REQUIRED
5. hourlyMin OR hourlyMax set - REQUIRED
6. engagementTypes set - REQUIRED
7. remoteOnly set (true or false) - REQUIRED

If ANY of these are missing, isComplete MUST be false.`

const PROFILE_ANALYSIS_INSTRUCTIONS = `You are a professional career advisor and profile analyst. Analyze the user's freelancer profile and provide comprehensive feedback.

## Your Task
Analyze the collected profile data and provide:
1. A profile score (0-100) based on completeness and quality
2. A brief 3-5 word summary of the profile
3. A detailed analysis with actionable insights

## Scoring Criteria (100 points total)
- Profile completeness (30 points): All fields filled, detailed information
- Experience quality (25 points): Relevant experience, clear progression, notable companies
- Skills relevance (20 points): In-demand skills, variety, depth
- Rate competitiveness (15 points): Market-aligned rates for their level
- Professional presentation (10 points): Clear, well-organized information

## Response Format
Your response MUST be valid JSON with this exact structure:
{
  "score": <number 0-100>,
  "title": "Profile Analysis",
  "summary": "<3-5 word summary like 'Strong Senior Developer Profile' or 'Promising Entry-Level Designer'>",
  "analysis": "<Full markdown analysis - see format below>"
}

## Analysis Markdown Format
The "analysis" field should contain markdown with these sections:

### Overview
Brief 2-3 sentence overview of the profile.

### Strengths
- Bullet points of what's strong about this profile
- Be specific and encouraging

### Areas for Improvement
- Bullet points of what could be better
- Actionable suggestions

### Market Insights
- How this profile compares to market standards
- Rate recommendations based on experience level
- In-demand skills they have or should consider

### Next Steps
Numbered list of 3-5 specific actions to improve their profile.

Be encouraging but honest. Provide real value.`

// ============================================================================
// LinkedIn Scraping Helpers
// ============================================================================

const POLL_INTERVAL_MS = 5_000
const MAX_TOTAL_POLLS = 60 // 5 minutes max

const LINKEDIN_URL_RE = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i

/**
 * Extract a LinkedIn profile URL from the user message, or return null.
 */
function extractLinkedInUrl(message: string): string | null {
  const match = message.match(LINKEDIN_URL_RE)
  return match ? match[0] : null
}

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

    // Verify API key is configured
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

    // Build conversation context
    const conversationContext = conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n")

    const conversationalPrompt = `
Conversation so far:
${conversationContext}

User's new message: ${message}

Respond naturally to continue the onboarding conversation. Remember to validate the user's response - if it's incomplete or unclear, ask for clarification.`

    // Handle streaming response
    if (stream) {
      const encoder = new TextEncoder()

      const readableStream = new ReadableStream({
        async start(controller) {
          const sseEmit = (event: object) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            )
          }

          /** Helper to stream an agent run and accumulate text */
          async function streamAgent(
            agent: Agent,
            prompt: string,
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
          let fullConversationalResponse = ""

          try {
            if (linkedInUrl) {
              // ── Phase 1: Stream filler text ──────────────────────────
              const fillerAgent = new Agent({
                name: "Conversational Assistant",
                instructions:
                  CONVERSATIONAL_AGENT_INSTRUCTIONS +
                  `\n\nIMPORTANT: The user just provided their LinkedIn profile URL. Acknowledge it briefly and let them know you're fetching their profile data now. Keep your response to 1-2 short sentences. Do NOT list any profile details yet — you don't have them.`,
                model: "gpt-4.1-nano",
              })
              fullConversationalResponse += await streamAgent(
                fillerAgent,
                conversationalPrompt,
              )

              // ── Phase 2: Trigger scrape + poll with heartbeats ──────
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

                if (status.status === "completed" || status.status === "failed") {
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

              // ── Phase 3: Stream results or error ────────────────────
              if (scrapeResult.status === "completed") {
                sseEmit({
                  type: "tool_call",
                  name: "linkedin_scrape",
                  status: "completed",
                })

                const profileJson = JSON.stringify(
                  scrapeResult.profile,
                  null,
                  2,
                )

                const summaryAgent = new Agent({
                  name: "Conversational Assistant",
                  instructions: CONVERSATIONAL_AGENT_INSTRUCTIONS,
                  model: "gpt-4.1-nano",
                })

                const summaryPrompt = `${conversationalPrompt}

You already acknowledged the LinkedIn URL and told the user you're fetching their profile. The scrape is now complete. Here is their scraped LinkedIn profile data:

${profileJson}

Summarize the key highlights (name, headline, number of experiences, top skills) and continue the onboarding — since you have their profile data, skip questions about experience level, skills, and past work, and move directly to preferences (rates, engagement type, remote preference).`

                fullConversationalResponse += "\n\n"
                sseEmit({ type: "text", content: "\n\n" })
                fullConversationalResponse += await streamAgent(
                  summaryAgent,
                  summaryPrompt,
                )
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

                const errorPrompt = `${conversationalPrompt}

You already told the user you'd fetch their LinkedIn profile, but the scrape failed with error: "${scrapeResult.error}". Apologize briefly and ask them to try again or set up their profile manually instead.`

                fullConversationalResponse += "\n\n"
                sseEmit({ type: "text", content: "\n\n" })
                fullConversationalResponse += await streamAgent(
                  errorAgent,
                  errorPrompt,
                )
              }
            } else {
              // ── Normal flow (no LinkedIn URL) ───────────────────────
              const conversationalAgent = new Agent({
                name: "Conversational Assistant",
                instructions: CONVERSATIONAL_AGENT_INSTRUCTIONS,
                model: "gpt-4.1-nano",
              })
              fullConversationalResponse += await streamAgent(
                conversationalAgent,
                conversationalPrompt,
              )
            }

            // ── Data extraction (runs for all paths) ────────────────
            const fullConversation = `${conversationContext}
user: ${message}
assistant: ${fullConversationalResponse}`

            const dataExtractionPrompt = `
Current collected data (preserve all of this):
${JSON.stringify(collectedData, null, 2)}

Full conversation with the assistant's response:
${fullConversation}

Extract ONLY data that the assistant has clearly confirmed/acknowledged. If the assistant asked for clarification, do NOT extract from the user's unclear response.`

            const dataExtractionAgent = new Agent({
              name: "Data Extraction Agent",
              instructions: DATA_EXTRACTION_INSTRUCTIONS,
              model: "gpt-4.1-nano",
              outputType: DataExtractionJsonSchema,
            })

            const dataResult = await run(
              dataExtractionAgent,
              dataExtractionPrompt,
            )

            if (dataResult.finalOutput) {
              const extracted = DataExtractionResponseSchema.parse(
                dataResult.finalOutput,
              ) as DataExtractionResponse

              sseEmit({
                type: "final",
                collectedData: extracted.collectedData,
                isComplete: extracted.isComplete,
              })

              // ── Profile Analysis (when onboarding is complete) ────────
              if (extracted.isComplete) {
                sseEmit({ type: "analysis_started" })

                const profileAnalysisPrompt = `
Analyze this freelancer profile and provide comprehensive feedback:

Profile Data:
${JSON.stringify(extracted.collectedData, null, 2)}

Provide a score (0-100), brief summary, and detailed markdown analysis following the format in your instructions.`

                const profileAnalysisAgent = new Agent({
                  name: "Profile Analyst",
                  instructions: PROFILE_ANALYSIS_INSTRUCTIONS,
                  model: "gpt-5-mini-2025-08-07",
                  outputType: ProfileAnalysisJsonSchema,
                })

                try {
                  const analysisResult = await run(
                    profileAnalysisAgent,
                    profileAnalysisPrompt,
                    { reasoningEffort: "high" }
                  )

                  if (analysisResult.finalOutput) {
                    const analysis = ProfileAnalysisResponseSchema.parse(
                      analysisResult.finalOutput,
                    ) as ProfileAnalysisResponse

                    sseEmit({
                      type: "profile_analysis",
                      score: analysis.score,
                      title: analysis.title,
                      summary: analysis.summary,
                      analysis: analysis.analysis,
                    })
                  }
                } catch (analysisError) {
                  console.error("Profile analysis error:", analysisError)
                  // Don't fail the whole request if analysis fails
                  sseEmit({
                    type: "analysis_error",
                    message: "Could not generate profile analysis",
                  })
                }
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          } catch (error) {
            console.error("Streaming error:", error)
            sseEmit({
              type: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Streaming failed",
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

    // Non-streaming response: run conversational agent first, then extraction
    let messageText = ""
    const linkedInUrl = extractLinkedInUrl(message)

    if (linkedInUrl) {
      // Phase 1: filler
      const fillerAgent = new Agent({
        name: "Conversational Assistant",
        instructions:
          CONVERSATIONAL_AGENT_INSTRUCTIONS +
          `\n\nIMPORTANT: The user just provided their LinkedIn profile URL. Acknowledge it briefly and let them know you're fetching their profile data now. Keep your response to 1-2 short sentences.`,
        model: "gpt-4.1-nano",
      })
      const fillerResult = await run(fillerAgent, conversationalPrompt)
      messageText += typeof fillerResult.finalOutput === "string"
        ? fillerResult.finalOutput
        : String(fillerResult.finalOutput ?? "")

      // Phase 2: scrape
      const { runId } = await triggerScrapeUtil(linkedInUrl)
      let scrapeResult: Awaited<ReturnType<typeof getScrapeStatusUtil>> | null = null
      for (let i = 0; i < MAX_TOTAL_POLLS; i++) {
        const status = await getScrapeStatusUtil(runId)
        if (status.status === "completed" || status.status === "failed") {
          scrapeResult = status
          break
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      }
      if (!scrapeResult) {
        scrapeResult = { status: "failed" as const, error: "Scraping timed out" }
      }

      // Phase 3: summary or error
      if (scrapeResult.status === "completed") {
        const profileJson = JSON.stringify(scrapeResult.profile, null, 2)
        const summaryAgent = new Agent({
          name: "Conversational Assistant",
          instructions: CONVERSATIONAL_AGENT_INSTRUCTIONS,
          model: "gpt-4.1-nano",
        })
        const summaryResult = await run(
          summaryAgent,
          `${conversationalPrompt}\n\nLinkedIn profile data:\n${profileJson}\n\nSummarize key highlights and move to preferences.`,
        )
        messageText += "\n\n" + (typeof summaryResult.finalOutput === "string"
          ? summaryResult.finalOutput
          : String(summaryResult.finalOutput ?? ""))
      } else {
        messageText += `\n\nSorry, I couldn't fetch your LinkedIn profile (${scrapeResult.error}). Would you like to try again or set up your profile manually?`
      }
    } else {
      const conversationalAgent = new Agent({
        name: "Conversational Assistant",
        instructions: CONVERSATIONAL_AGENT_INSTRUCTIONS,
        model: "gpt-4.1-nano",
      })
      const conversationalResult = await run(conversationalAgent, conversationalPrompt)
      messageText = typeof conversationalResult.finalOutput === "string"
        ? conversationalResult.finalOutput
        : String(conversationalResult.finalOutput ?? "")
    }

    // Build full conversation with the assistant's response
    const fullConversation = `${conversationContext}
user: ${message}
assistant: ${messageText}`

    const dataExtractionPrompt = `
Current collected data (preserve all of this):
${JSON.stringify(collectedData, null, 2)}

Full conversation with the assistant's response:
${fullConversation}

Extract ONLY data that the assistant has clearly confirmed/acknowledged. If the assistant asked for clarification, do NOT extract from the user's unclear response.`

    const dataExtractionAgent = new Agent({
      name: "Data Extraction Agent",
      instructions: DATA_EXTRACTION_INSTRUCTIONS,
      model: "gpt-4.1-nano",
      outputType: DataExtractionJsonSchema,
    })

    const dataResult = await run(dataExtractionAgent, dataExtractionPrompt)

    let extractedData = collectedData
    let isComplete = false

    if (dataResult.finalOutput) {
      const extracted = DataExtractionResponseSchema.parse(dataResult.finalOutput) as DataExtractionResponse
      extractedData = extracted.collectedData
      isComplete = extracted.isComplete
    }

    return Response.json({
      message: messageText,
      collectedData: extractedData,
      isComplete,
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
