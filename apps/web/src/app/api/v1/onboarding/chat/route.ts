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

## BE SMART - Infer Information
You MUST use common sense to infer details:
- "$45-100" or "$45-$100" → They mean USD (the dollar sign tells you!)
- "€50-80" → EUR
- "£40-60" → GBP
- "45-100/hr" → hourly rate, assume USD unless context says otherwise
- If they give a range like "45-100", and you already know context (e.g., discussing rates), don't ask redundant questions

## Handling Unclear Responses
If someone types gibberish or a very unclear response (like random letters):
- Don't be annoying about it. Give ONE gentle nudge, then move on with a reasonable assumption or skip that field
- NEVER keep asking the same question more than twice - it's frustrating
- Example: If they type "asd" when you ask about experience level, say something like "No worries, we can figure that out later. Let's move on - what's your preferred hourly rate range?"

## Conversation Flow
Keep it moving! Don't dwell on any single topic.

1. **Quick Start**: Ask if they're solo or have a team (just one question)
2. **Profile Setup**: Ask how they'd like to set up - LinkedIn import, Upwork import, portfolio link, or manually. Don't list all options every time.
3. **If Manual**: Ask about experience level (entry/mid/senior/lead), then skills, then briefly about past work
4. **Preferences**:
   - Hourly rate range (infer currency from symbols!)
   - Only ask about currency if they didn't use a symbol
   - Engagement type preference (full-time, part-time, contract)
   - Remote preference
5. **Wrap Up**: When you have the basics, give a quick summary and let them know they're all set

## Example Good Responses
User: "solo"
You: "Working solo, nice! How would you like to set up your profile - import from LinkedIn/Upwork, share a portfolio link, or just tell me about yourself?"

User: "$45-100"
You: "Cool, $45-100 USD per hour works. Are you open to both full-time and part-time gigs, or do you have a preference?"

User: "well dont u see the dollar sign???"
You: "Ha, fair point - USD it is! Moving on, are you looking for remote work only, or open to on-site?"

User: "sdf"
You: "Hmm, didn't quite catch that. No worries though - what's your hourly rate range?"

## Important Rules
- Keep the conversation flowing naturally
- If you've asked the same question twice with no clear answer, SKIP IT and move on
- Be brief - users want to finish quickly
- Sound human, not like a form
- INFER details from context - don't ask questions that are already answered by the user's input`

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
- profilePath: when user chooses linkedin/upwork/portfolio/manual
- URLs: when user provides linkedin/upwork/portfolio links
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
Set isComplete to true when you have:
- teamMode (solo/team)
- profilePath chosen
- At least basic rate info (hourlyMin or fixedBudgetMin)

Don't require every single field - users can finish with partial data.`

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
