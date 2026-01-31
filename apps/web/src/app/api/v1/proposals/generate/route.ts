import { NextRequest } from "next/server"
import { Agent, run } from "@openai/agents"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth.server"
import { getSupabaseAdmin } from "@/lib/auth.server"
import {
  PROPOSAL_SYSTEM_PROMPT,
  buildProposalPrompt,
  type UserProfile,
  type ProposalConfig,
} from "@/lib/proposal-prompt"

// ============================================================================
// Request Schema
// ============================================================================

const RequestSchema = z.object({
  jobPosting: z.string().min(10, "Job posting must be at least 10 characters"),
  platform: z
    .enum(["upwork", "fiverr", "linkedin", "toptal", "other"])
    .default("upwork"),
  customPlatform: z.string().optional(),
  skipProfile: z.boolean().default(false),
  tone: z
    .enum(["professional", "casual", "confident"])
    .default("professional"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  conversationHistory: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    )
    .default([]),
})

// ============================================================================
// Profile Fetcher
// ============================================================================

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseAdmin()

  const [profileRes, skillsRes, experiencesRes, educationsRes, preferencesRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, headline, about")
        .eq("user_id", userId)
        .maybeSingle<{
          display_name: string | null
          headline: string | null
          about: string | null
        }>(),
      supabase
        .from("user_skills")
        .select("name, level, years")
        .eq("user_id", userId)
        .returns<{ name: string; level: number; years: number | null }[]>(),
      supabase
        .from("user_experiences")
        .select("title, company, start_date, end_date, highlights")
        .eq("user_id", userId)
        .returns<
          {
            title: string
            company: string | null
            start_date: string | null
            end_date: string | null
            highlights: string | null
          }[]
        >(),
      supabase
        .from("user_educations")
        .select("school, degree, field")
        .eq("user_id", userId)
        .returns<
          {
            school: string | null
            degree: string | null
            field: string | null
          }[]
        >(),
      supabase
        .from("user_preferences")
        .select("hourly_min, hourly_max, currency")
        .eq("user_id", userId)
        .maybeSingle<{
          hourly_min: number | null
          hourly_max: number | null
          currency: string
        }>(),
    ])

  const profile = profileRes.data
  const skills = skillsRes.data ?? []
  const experiences = (experiencesRes.data ?? []).map((e) => ({
    title: e.title,
    company: e.company,
    startDate: e.start_date,
    endDate: e.end_date,
    highlights: e.highlights,
  }))
  const educations = educationsRes.data ?? []
  const preferences = preferencesRes.data
    ? {
        hourlyMin: preferencesRes.data.hourly_min,
        hourlyMax: preferencesRes.data.hourly_max,
        currency: preferencesRes.data.currency,
      }
    : null

  // Return null if profile is completely empty
  const hasData =
    profile?.display_name ||
    profile?.headline ||
    profile?.about ||
    skills.length > 0 ||
    experiences.length > 0 ||
    educations.length > 0 ||
    preferences

  if (!hasData) return null

  return {
    displayName: profile?.display_name ?? null,
    headline: profile?.headline ?? null,
    about: profile?.about ?? null,
    skills,
    experiences,
    educations,
    preferences,
  }
}

// ============================================================================
// API Route
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get("Authorization")
    const { userId } = await verifyAuth(authHeader)

    // Parse request
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

    const { jobPosting, platform, customPlatform, skipProfile, tone, length, conversationHistory } =
      parsed.data

    // Fetch profile (skip if toggled off)
    const profile = skipProfile ? null : await fetchUserProfile(userId)

    // Build prompt — append custom platform name if "other" is selected
    const effectiveJobPosting =
      platform === "other" && customPlatform
        ? `[Platform: ${customPlatform}]\n\n${jobPosting}`
        : jobPosting

    const config: ProposalConfig = { platform, tone, length }
    const userPrompt = buildProposalPrompt(
      config,
      profile,
      effectiveJobPosting,
      conversationHistory
    )

    // Create agent
    const agent = new Agent({
      name: "Proposal Writer",
      instructions: PROPOSAL_SYSTEM_PROMPT,
      model: "gpt-4.1-nano",
    })

    // Stream response
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const result = await run(agent, userPrompt, { stream: true })
          const textStream = result.toTextStream({
            compatibleWithNodeStreams: false,
          })

          for await (const chunk of textStream) {
            if (request.signal.aborted) break
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`
              )
            )
          }

          if (!request.signal.aborted) {
            await result.completed
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error) {
          console.error("Proposal streaming error:", error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message:
                  error instanceof Error
                    ? error.message
                    : "Streaming failed",
              })}\n\n`
            )
          )
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
  } catch (error) {
    console.error("Proposal generate error:", error)

    if (
      error instanceof Error &&
      (error.message === "Missing or invalid Authorization header" ||
        error.message === "Unauthorized")
    ) {
      return Response.json(
        { error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      )
    }

    return Response.json(
      {
        error: {
          code: "generate_error",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        },
      },
      { status: 500 }
    )
  }
}
