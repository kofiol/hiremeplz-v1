import { NextRequest } from "next/server"
import { Agent, InputGuardrailTripwireTriggered } from "@openai/agents"
import {
  triggerLinkedInScrape as triggerScrapeUtil,
  getLinkedInScrapeStatus as getScrapeStatusUtil,
} from "@/lib/linkedin-scraper.server"
import { getDataStatus } from "@/lib/onboarding/data-status"
import { ChatRequestSchema, DEFAULT_INPUT_HINT } from "@/lib/onboarding/schema"
import type { CollectedData } from "@/lib/onboarding/schema"
import { verifyAuth } from "@/lib/auth.server"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit.server"
import { createSSEResponse, streamAgentText } from "./streaming"
import type { SSEEmitter } from "./streaming"
import { createSaveProfileDataTool, createTriggerAnalysisTool, createSetInputHintTool } from "./tools"
import type { OnboardingToolContext } from "./tools"
import { createConversationalAgent, createFillerAgent, CONVERSATIONAL_AGENT_INSTRUCTIONS } from "./agent"
import { runProfileAnalysis } from "./analysis"
import { contentModerationGuardrail } from "./guardrails"
import { createConversation, saveMessage, completeConversation, getActivePromptVersion } from "./conversation.server"

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

const MAX_TOTAL_POLLS = 60

/**
 * Progressive polling for trigger.dev run status.
 * Checks more frequently early (when scrapes are likely to complete),
 * then backs off to reduce unnecessary API calls.
 */
function getPollIntervalMs(attemptNumber: number): number {
  if (attemptNumber <= 5) return 2_000 // First 10s: check every 2s
  if (attemptNumber <= 15) return 5_000 // Next 50s: check every 5s
  return 10_000 // After 60s: check every 10s
}

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
  const progress = status.progress

  // Detect LinkedIn skip — remove it from missing so agent moves on
  const lastAssistantMsg = conversationHistory
    .filter((m) => m.role === "assistant")
    .at(-1)?.content?.toLowerCase() ?? ""
  const linkedinWasAsked = lastAssistantMsg.includes("linkedin")
  const isLinkedinSkip =
    linkedinWasAsked &&
    missing.some((m) => m.startsWith("linkedinUrl")) &&
    /\b(skip|pass|nah)\b|don'?t\s+have|enter\s+manual|no\b\s*[,.]?\s*$/i.test(message)
  if (isLinkedinSkip) {
    missing = missing.filter((m) => !m.startsWith("linkedinUrl"))
    // Mark as skipped so it persists — getDataStatus sees truthy value next turn
    currentData.linkedinUrl = "skipped"
  }

  // Detect skill follow-up needed: skills are filled but don't have context
  // markers yet (like "primary" or "occasional"), and experiences is the next step.
  const skillsAreFilled = Array.isArray(currentData.skills) && currentData.skills.length > 0
  const experiencesStillMissing = missing.some((m) => m.startsWith("experiences"))
  const skills = Array.isArray(currentData.skills) ? currentData.skills : []
  const skillsLackContext = skillsAreFilled && !skills.some(
    (s: { name: string }) => /\b(primary|occasional|main|secondary)\b/i.test(s.name)
  )
  const needsSkillFollowUp = skillsLackContext && experiencesStillMissing

  let stillNeeded: string
  if (missing.length > 0) {
    const items = missing.map((item, i) => {
      if (needsSkillFollowUp && i === 0 && item.startsWith("experiences")) {
        return `${i + 1}. <<<< SKILL FOLLOW-UP NEEDED — ask which skills are PRIMARY vs. occasional before moving to experiences`
      }
      return `${i + 1}. ${item}${i === 0 && !needsSkillFollowUp ? " <<<< ASK THIS ONE NEXT" : ""}`
    })
    stillNeeded = items.join("\n")
  } else {
    stillNeeded = "ALL DONE - profile is complete! Call trigger_profile_analysis now."
  }

  // Recalculate progress after potential LinkedIn skip
  const adjustedFilledCount = missing.length === 0 ? progress.total : progress.total - missing.length
  const adjustedPercent = Math.round((adjustedFilledCount / progress.total) * 100)
  const isLastStep = missing.length === 1

  return `
[INTERNAL CONTEXT — do NOT include any of these headers, progress numbers, or step counts in your response]

Progress: ${adjustedFilledCount} of ${progress.total} complete (${adjustedPercent}%)${isLastStep ? " — last question" : ""}

Already collected:
${filled.length > 0 ? filled.join("\n") : "Nothing yet — this is the first question"}

Still needed:
${stillNeeded}

Conversation so far:
${conversationContext}

User's new message:
${message}
${extraContext ? `\nAdditional context:\n${extraContext}` : ""}

Remember: Save any data the user provided, then ask about item #1 in still needed (or call trigger_profile_analysis if ALL DONE).`
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
  message: string,
  signal?: AbortSignal
): Promise<string> {
  // Phase 1: Filler text
  const fillerAgent = createFillerAgent(
    "OVERRIDE ALL OTHER INSTRUCTIONS. Your ONLY job right now: Acknowledge that the user provided their LinkedIn URL and say you're fetching their profile data. 1-2 sentences max. Do NOT ask any follow-up questions. Do NOT mention what's missing. Do NOT call any tools. Just say thanks and that you're fetching the profile."
  )
  await streamAgentText(
    fillerAgent,
    `The user just shared their LinkedIn profile URL: ${linkedInUrl}\n\nAcknowledge it briefly and let them know you're importing their data now. DO NOT ask any questions yet.`,
    emit
  )

  // Phase 2: Trigger scrape + poll with progressive intervals
  emit({ type: "tool_call", name: "linkedin_scrape", status: "started" })

  const { runId } = await triggerScrapeUtil(linkedInUrl)
  let scrapeResult: Awaited<ReturnType<typeof getScrapeStatusUtil>> | null = null

  const startTime = Date.now()
  for (let i = 0; i < MAX_TOTAL_POLLS; i++) {
    if (signal?.aborted) break

    const status = await getScrapeStatusUtil(runId)
    if (status.status === "completed" || status.status === "failed") {
      scrapeResult = status
      break
    }
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    emit({ type: "tool_status", elapsed })

    const interval = getPollIntervalMs(i + 1)
    await new Promise((r) => setTimeout(r, interval))
  }

  if (!scrapeResult) {
    scrapeResult = { status: "failed" as const, error: "Scraping timed out" }
  }

  // Phase 3: Handle results
  let responseText = ""
  if (scrapeResult.status === "completed") {
    emit({ type: "tool_call", name: "linkedin_scrape", status: "completed" })

    ctx.collectedData = mergeLinkedInData(ctx.collectedData, scrapeResult.profile, linkedInUrl)
    const profileJson = JSON.stringify(scrapeResult.profile, null, 2)

    const saveProfileData = createSaveProfileDataTool(ctx)
    const triggerAnalysis = createTriggerAnalysisTool(ctx)
    const setInputHint = createSetInputHintTool(ctx)
    const summaryAgent = new Agent({
      name: "Conversational Assistant",
      instructions: CONVERSATIONAL_AGENT_INSTRUCTIONS,
      model: "gpt-5-mini",
      tools: [saveProfileData, triggerAnalysis, setInputHint],
    })

    emit({ type: "text", content: "\n\n" })
    responseText = await streamAgentText(
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
    responseText = await streamAgentText(
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

  return responseText
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

    const { message, conversationHistory, collectedData, stream, conversationId: incomingConversationId } = parsed.data

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
      originalCollectedData: { ...collectedData },
      analysisRequested: false,
      lastSavedFields: [],
    }

    const linkedInUrl = extractLinkedInUrl(message)

    if (!stream) {
      return Response.json(
        { error: { code: "not_supported", message: "Non-streaming mode is not supported" } },
        { status: 400 }
      )
    }

    return createSSEResponse(async (emit) => {
        // Check for active prompt version
        const promptVersion = await getActivePromptVersion("onboarding", "Conversational Agent")
        const agentModel = promptVersion?.model ?? "gpt-5-mini"

        // Create or reuse conversation
        let conversationId = incomingConversationId ?? null
        if (!conversationId && authContext) {
          conversationId = await createConversation({
            teamId: authContext.teamId,
            userId: authContext.userId,
            agentType: "onboarding",
            promptVersionId: promptVersion?.id,
            model: agentModel,
          })
        }

        // Save user message
        if (conversationId) {
          await saveMessage({
            conversationId,
            role: "user",
            content: message,
          })
        }

        let responseText = ""

        if (linkedInUrl) {
          responseText = await handleLinkedInFlow(emit, linkedInUrl, ctx, conversationHistory, conversationContext, message, request.signal)
        } else {
          const saveProfileData = createSaveProfileDataTool(ctx)
          const triggerAnalysis = createTriggerAnalysisTool(ctx)
          const setInputHint = createSetInputHintTool(ctx)
          const agent = createConversationalAgent([saveProfileData, triggerAnalysis, setInputHint], {
            inputGuardrails: [contentModerationGuardrail],
            ...(promptVersion ? { instructions: promptVersion.instructions, model: promptVersion.model } : {}),
          })
          try {
            responseText = await streamAgentText(
              agent,
              createPrompt(ctx.collectedData, conversationContext, message, conversationHistory),
              emit
            )
          } catch (err) {
            if (err instanceof InputGuardrailTripwireTriggered) {
              responseText = "I'd love to help, but that message doesn't seem related to setting up your profile. Could you rephrase it? I'm here to learn about your skills, experience, and career goals."
              emit({
                type: "text",
                content: responseText,
              })
            } else {
              throw err
            }
          }
        }

        // Save assistant message
        if (conversationId) {
          await saveMessage({
            conversationId,
            role: "assistant",
            content: responseText,
            savedFields: ctx.lastSavedFields.length > 0 ? ctx.lastSavedFields : undefined,
          })
        }

        // Emit saved fields if any were saved
        if (ctx.lastSavedFields.length > 0) {
          emit({
            type: "saved_fields",
            fields: ctx.lastSavedFields,
          })
        }

        emit({
          type: "final",
          collectedData: ctx.collectedData,
          isComplete: ctx.analysisRequested,
          inputHint: ctx.inputHint ?? DEFAULT_INPUT_HINT,
          conversationId: conversationId ?? undefined,
        })

        // Profile Analysis (when triggered by tool)
        if (ctx.analysisRequested && !request.signal.aborted) {
          if (conversationId) {
            await completeConversation(conversationId)
          }
          try {
            await runProfileAnalysis(emit, ctx.collectedData, authContext, request.signal, conversationId)
          } catch (analysisError) {
            console.error("Profile analysis error:", analysisError)
            emit({
              type: "analysis_error",
              message: "Could not generate profile analysis",
            })
          }
        }
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
