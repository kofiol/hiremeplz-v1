import { NextRequest } from "next/server"
import { Agent, run } from "@openai/agents"
import {
  triggerLinkedInScrape as triggerScrapeUtil,
  getLinkedInScrapeStatus as getScrapeStatusUtil,
} from "@/lib/linkedin-scraper.server"
import { getDataStatus } from "@/lib/onboarding/data-status"
import { ChatRequestSchema } from "@/lib/onboarding/schema"
import type { CollectedData } from "@/lib/onboarding/schema"
import { verifyAuth } from "@/lib/auth.server"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit.server"
import { createSSEResponse, streamAgentText } from "./streaming"
import type { SSEEmitter } from "./streaming"
import { createSaveProfileDataTool, createTriggerAnalysisTool } from "./tools"
import type { OnboardingToolContext } from "./tools"
import { createConversationalAgent, createFillerAgent, CONVERSATIONAL_AGENT_INSTRUCTIONS } from "./agent"
import { runProfileAnalysis } from "./analysis"

// ============================================================================
// LinkedIn URL Detection
// ============================================================================

const LINKEDIN_URL_RE = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i

function extractLinkedInUrl(message: string): string | null {
  const match = message.match(LINKEDIN_URL_RE)
  return match ? match[0] : null
}

// ============================================================================
// LinkedIn Scraping Constants
// ============================================================================

const POLL_INTERVAL_MS = 5_000
const MAX_TOTAL_POLLS = 60

// ============================================================================
// Prompt Builder
// ============================================================================

function createPrompt(
  currentData: Partial<CollectedData>,
  conversationContext: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  extraContext?: string
) {
  const status = getDataStatus(currentData)
  const filled = status.filled
  let missing = status.missing

  // Detect LinkedIn skip — remove it from missing so agent moves on
  const lastAssistantMsg = conversationHistory
    .filter((m) => m.role === "assistant")
    .at(-1)?.content?.toLowerCase() ?? ""
  const linkedinWasAsked = lastAssistantMsg.includes("linkedin")
  const isLinkedinSkip =
    linkedinWasAsked &&
    missing.some((m) => m.startsWith("linkedinUrl")) &&
    /skip|no|don'?t|manual|enter.*manual|pass|nah/i.test(message)
  if (isLinkedinSkip) {
    missing = missing.filter((m) => !m.startsWith("linkedinUrl"))
    // Mark as skipped so it persists — getDataStatus sees truthy value next turn
    currentData.linkedinUrl = "skipped"
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

// ============================================================================
// LinkedIn Data Merge
// ============================================================================

function mergeLinkedInData(
  existing: Partial<CollectedData>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any,
  linkedInUrl: string
): Partial<CollectedData> {
  return {
    ...existing,
    linkedinUrl: profile.linkedinUrl || linkedInUrl,
    experienceLevel: existing.experienceLevel || profile.experienceLevel,
    skills: existing.skills?.length
      ? existing.skills
      : profile.skills?.length
        ? profile.skills.map((s: { name: string }) => ({ name: s.name }))
        : existing.skills,
    experiences: existing.experiences?.length
      ? existing.experiences
      : profile.experiences?.length
        ? profile.experiences.map((e: { title: string; company: string; startDate: string; endDate: string; highlights: string }) => ({
            title: e.title,
            company: e.company,
            startDate: e.startDate,
            endDate: e.endDate,
            highlights: e.highlights,
          }))
        : existing.experiences,
    educations: existing.educations?.length
      ? existing.educations
      : profile.educations?.length
        ? profile.educations.map((e: { school: string; degree: string; field: string; startYear: string; endYear: string }) => ({
            school: e.school,
            degree: e.degree,
            field: e.field,
            startYear: e.startYear,
            endYear: e.endYear,
          }))
        : existing.educations,
  }
}

// ============================================================================
// LinkedIn Scrape Flow
// ============================================================================

async function handleLinkedInFlow(
  emit: SSEEmitter,
  linkedInUrl: string,
  ctx: OnboardingToolContext,
  conversationHistory: Array<{ role: string; content: string }>,
  conversationContext: string,
  message: string
) {
  // Phase 1: Filler text
  const fillerAgent = createFillerAgent(
    "IMPORTANT: The user just provided their LinkedIn profile URL. Acknowledge it briefly and let them know you're fetching their profile data now. Keep your response to 1-2 short sentences. Do NOT call any tools. Do NOT ask any questions — just confirm you're fetching their profile."
  )
  await streamAgentText(
    fillerAgent,
    createPrompt(ctx.collectedData, conversationContext, message, conversationHistory),
    emit
  )

  // Phase 2: Trigger scrape + poll
  emit({ type: "tool_call", name: "linkedin_scrape", status: "started" })

  const { runId } = await triggerScrapeUtil(linkedInUrl)
  let scrapeResult: Awaited<ReturnType<typeof getScrapeStatusUtil>> | null = null

  for (let i = 0; i < MAX_TOTAL_POLLS; i++) {
    const status = await getScrapeStatusUtil(runId)
    if (status.status === "completed" || status.status === "failed") {
      scrapeResult = status
      break
    }
    emit({ type: "tool_status", elapsed: (i + 1) * 5 })
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }

  if (!scrapeResult) {
    scrapeResult = { status: "failed" as const, error: "Scraping timed out" }
  }

  // Phase 3: Handle results
  if (scrapeResult.status === "completed") {
    emit({ type: "tool_call", name: "linkedin_scrape", status: "completed" })

    ctx.collectedData = mergeLinkedInData(ctx.collectedData, scrapeResult.profile, linkedInUrl)
    const profileJson = JSON.stringify(scrapeResult.profile, null, 2)

    const saveProfileData = createSaveProfileDataTool(ctx)
    const triggerAnalysis = createTriggerAnalysisTool(ctx)
    const summaryAgent = new Agent({
      name: "Conversational Assistant",
      instructions: CONVERSATIONAL_AGENT_INSTRUCTIONS,
      model: "gpt-4.1-nano",
      tools: [saveProfileData, triggerAnalysis],
    })

    emit({ type: "text", content: "\n\n" })
    await streamAgentText(
      summaryAgent,
      createPrompt(
        ctx.collectedData,
        conversationContext,
        message,
        conversationHistory,
        `LinkedIn profile fetched successfully and merged with manually collected data:\n${profileJson}\n\nSummarize what LinkedIn added to their profile in 1-2 sentences. If all required fields are now present, call trigger_profile_analysis. If anything is still missing, ask about the first missing item.`
      ),
      emit
    )
  } else {
    emit({ type: "tool_call", name: "linkedin_scrape", status: "failed" })

    const errorAgent = createFillerAgent("")
    emit({ type: "text", content: "\n\n" })
    await streamAgentText(
      errorAgent,
      createPrompt(
        ctx.collectedData,
        conversationContext,
        message,
        conversationHistory,
        `LinkedIn scrape failed: "${scrapeResult.error}". Apologize briefly and ask them to try again or set up manually.`
      ),
      emit
    )
  }
}

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

    const rateLimitId = authContext?.userId
      ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? "anonymous"
    const rl = checkRateLimit(rateLimitId, RATE_LIMITS.onboardingChat)
    if (!rl.allowed) return rateLimitResponse(rl)

    const json = await request.json()
    const parsed = ChatRequestSchema.safeParse(json)

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

    if (!process.env.OPENAI_API_KEY) {
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

    const conversationContext = conversationHistory
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")

    // Closure state for tool execution
    const ctx: OnboardingToolContext = {
      collectedData: { ...collectedData },
      analysisRequested: false,
    }

    const linkedInUrl = extractLinkedInUrl(message)

    if (stream) {
      return createSSEResponse(async (emit) => {
        if (linkedInUrl) {
          await handleLinkedInFlow(emit, linkedInUrl, ctx, conversationHistory, conversationContext, message)
        } else {
          const saveProfileData = createSaveProfileDataTool(ctx)
          const triggerAnalysis = createTriggerAnalysisTool(ctx)
          const agent = createConversationalAgent([saveProfileData, triggerAnalysis])
          await streamAgentText(
            agent,
            createPrompt(ctx.collectedData, conversationContext, message, conversationHistory),
            emit
          )
        }

        // Emit final data
        emit({
          type: "final",
          collectedData: ctx.collectedData,
          isComplete: ctx.analysisRequested,
        })

        // Profile Analysis (when triggered by tool)
        if (ctx.analysisRequested && !request.signal.aborted) {
          try {
            await runProfileAnalysis(emit, ctx.collectedData, authContext, request.signal)
          } catch (analysisError) {
            console.error("Profile analysis error:", analysisError)
            emit({
              type: "analysis_error",
              message: "Could not generate profile analysis",
            })
          }
        }
      })
    }

    // Non-streaming response (simplified fallback)
    let messageText = ""

    if (linkedInUrl) {
      messageText = "Thanks for sharing your LinkedIn profile! Let me fetch your details..."

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

      if (scrapeResult?.status === "completed") {
        ctx.collectedData = mergeLinkedInData(ctx.collectedData, scrapeResult.profile, linkedInUrl)
        messageText += "\n\nI found your profile and merged the data! Let me analyze your profile now."
      } else {
        messageText += "\n\nSorry, I couldn't fetch your profile. Would you like to try again or set up manually?"
      }
    } else {
      const saveProfileData = createSaveProfileDataTool(ctx)
      const triggerAnalysis = createTriggerAnalysisTool(ctx)
      const agent = createConversationalAgent([saveProfileData, triggerAnalysis])
      const result = await run(
        agent,
        createPrompt(ctx.collectedData, conversationContext, message, conversationHistory)
      )
      messageText =
        typeof result.finalOutput === "string"
          ? result.finalOutput
          : String(result.finalOutput ?? "")
    }

    return Response.json({
      message: messageText,
      collectedData: ctx.collectedData,
      isComplete: ctx.analysisRequested,
    })
  } catch (error) {
    console.error("Onboarding chat error:", error)

    if (error instanceof Error) {
      return Response.json(
        { error: { code: "chat_error", message: error.message } },
        { status: 500 }
      )
    }

    return Response.json(
      { error: { code: "chat_error", message: "An unexpected error occurred" } },
      { status: 500 }
    )
  }
}
