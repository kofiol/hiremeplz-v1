import { NextRequest } from "next/server"
import { Agent, run } from "@openai/agents"
import { z } from "zod"
import { verifyAuth, getSupabaseAdmin } from "@/lib/auth.server"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit.server"

// ============================================================================
// Analysis Response Schema
// ============================================================================

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

const PROFILE_ANALYSIS_INSTRUCTIONS = `You are a blunt, experienced freelance career advisor. Analyze the user's profile and give them an honest assessment — the kind of feedback a trusted mentor would give behind closed doors, not a polished HR report.

## CRITICAL: What You Are Analyzing
This is an INTERNAL DOSSIER collected during a structured onboarding chat. It is NOT a public-facing profile, LinkedIn page, or Upwork listing. The user answered questions about their skills, experience, education, and rates in a conversational format. Judge ONLY what was collectible through that conversation.

### IN SCOPE (evaluate these)
- Skills depth: Are they a specialist or generalist? Do skills form a coherent offering? Are there complementary gaps?
- Experience quality: Did they provide accomplishments, impact metrics, tech stacks used? Is there clear career progression?
- Rate positioning: Is the current-to-dream rate jump realistic? Are they undercharging or overreaching for their level?
- Strategic gaps: What skills, experience, or positioning would make them more competitive?
- Education relevance: Does their education support their career direction?

### OUT OF SCOPE (NEVER mention these)
Portfolio, GitHub, open source contributions, personal website, case studies, testimonials, certifications, social proof, LinkedIn profile quality, Upwork profile quality, headshots, blog posts, published articles, speaking engagements, professional associations.

If you catch yourself writing about ANY out-of-scope item, DELETE IT. These are not collected during onboarding and suggesting them is unhelpful noise.

## Tone & Honesty
- Be direct. If something is weak, say it plainly. Don't hide problems behind qualifiers like "could potentially be enhanced" — say "this is thin" or "this won't cut it."
- Strengths should be genuine, not inflated. If a strength is modest, frame it as modest.
- Improvements should sting a little — specific enough that the user knows exactly what's wrong and feels motivated to fix it.
- Scores should be calibrated honestly. A junior dev with 1 year of experience and generic skills is not a 70 — they're a 35-45. Reserve 80+ for genuinely strong profiles. Most profiles land between 40-65.

## Response Format
Return valid JSON matching the schema exactly.

## Category Scoring Guidelines
- **skillsBreadth** (0-100): Variety and depth of skills. Generic lists with no depth indicators score low (30-50). Specialized stacks with complementary skills score higher.
- **experienceQuality** (0-100): Relevance, detail, and track record. "Developer at Company X" with no highlights is a 20-30. Rich descriptions with impact metrics score 70+.
- **ratePositioning** (0-100): How well their current and dream rates align with their experience level and market.
- **marketReadiness** (0-100): Overall readiness to win freelance work. Harshest category — reflects whether a client would hire based on what they see.

## Field Guidelines
- **strengths**: 1-3 concise, honest bullet points. Don't stretch.
- **improvements**: 1-3 specific, actionable items (NOT about external links/portfolio).
- **detailedFeedback**: Rich markdown analysis using this FIXED FRAMEWORK:

  ## The Bottom Line
  2-3 sentence verdict.

  ## Skills Assessment
  Specialist vs generalist. Coherent offering? Complementary gaps?

  ## Experience Quality
  Accomplishment depth, evidence of impact, trajectory.

  ## Rate Analysis
  Current vs dream vs market reality.

  ## Strategic Gaps
  Skill/experience/positioning gaps (NOT external profiles).

  ## Action Items
  3-5 numbered actions doable within HireMePlz or their career.

  CRITICAL: Each heading and list item MUST be on its own line using real newlines.

Ground every observation in the data provided. No generic filler.`

// ============================================================================
// Fetch user profile data for analysis
// ============================================================================

async function fetchProfileForAnalysis(userId: string, teamId: string) {
  const supabase = getSupabaseAdmin()

  const [profileRes, skillsRes, experiencesRes, educationsRes, preferencesRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, headline, about")
        .eq("user_id", userId)
        .eq("team_id", teamId)
        .maybeSingle<{
          display_name: string | null
          headline: string | null
          about: string | null
        }>(),
      supabase
        .from("user_skills")
        .select("name, level, years")
        .eq("user_id", userId)
        .eq("team_id", teamId)
        .returns<{ name: string; level: number; years: number | null }[]>(),
      supabase
        .from("user_experiences")
        .select("title, company, start_date, end_date, highlights")
        .eq("user_id", userId)
        .eq("team_id", teamId)
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
        .select("school, degree, field, start_year, end_year")
        .eq("user_id", userId)
        .eq("team_id", teamId)
        .returns<
          {
            school: string | null
            degree: string | null
            field: string | null
            start_year: number | null
            end_year: number | null
          }[]
        >(),
      supabase
        .from("user_preferences")
        .select(
          "currency, hourly_min, hourly_max, current_hourly_min, current_hourly_max"
        )
        .eq("user_id", userId)
        .eq("team_id", teamId)
        .maybeSingle<{
          currency: string
          hourly_min: number | null
          hourly_max: number | null
          current_hourly_min: number | null
          current_hourly_max: number | null
        }>(),
    ])

  return {
    profile: profileRes.data,
    skills: skillsRes.data ?? [],
    experiences: experiencesRes.data ?? [],
    educations: educationsRes.data ?? [],
    preferences: preferencesRes.data,
  }
}

// ============================================================================
// GET — fetch latest analysis
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId, teamId } = await verifyAuth(authHeader)

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("profile_analyses")
      .select("*")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string
        overall_score: number
        categories: {
          skillsBreadth: number
          experienceQuality: number
          ratePositioning: number
          marketReadiness: number
        }
        strengths: string[]
        improvements: string[]
        detailed_feedback: string
        created_at: string
      }>()

    if (error) {
      return Response.json(
        { error: { code: "fetch_error", message: error.message } },
        { status: 500 }
      )
    }

    if (!data) {
      return Response.json({ analysis: null })
    }

    return Response.json({
      analysis: {
        id: data.id,
        overallScore: data.overall_score,
        categories: data.categories,
        strengths: data.strengths,
        improvements: data.improvements,
        detailedFeedback: data.detailed_feedback,
        createdAt: data.created_at,
      },
    })
  } catch (error) {
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
          code: "fetch_error",
          message:
            error instanceof Error ? error.message : "An unexpected error occurred",
        },
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST — refresh analysis (re-run with current profile data)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId, teamId } = await verifyAuth(authHeader)

    const rl = checkRateLimit(userId, RATE_LIMITS.profileAnalysis)
    if (!rl.allowed) return rateLimitResponse(rl)

    // Fetch current profile data
    const profileData = await fetchProfileForAnalysis(userId, teamId)

    const hasData =
      profileData.skills.length > 0 ||
      profileData.experiences.length > 0 ||
      profileData.educations.length > 0

    if (!hasData) {
      return Response.json(
        {
          error: {
            code: "insufficient_data",
            message: "Not enough profile data to run analysis",
          },
        },
        { status: 400 }
      )
    }

    // Build analysis prompt
    const profileJson = JSON.stringify(profileData, null, 2)

    const analysisPrompt = `
Analyze this freelancer profile and provide comprehensive feedback:

Profile Data:
${profileJson}

Provide an overall score (0-100), category scores, strengths, improvements, and detailed feedback.
Include rate analysis comparing their current rate vs dream rate.`

    const agent = new Agent({
      name: "Profile Analyst",
      instructions: PROFILE_ANALYSIS_INSTRUCTIONS,
      model: "gpt-4.1-mini",
      outputType: ProfileAnalysisJsonSchema,
    })

    const result = await run(agent, analysisPrompt)

    if (!result.finalOutput) {
      return Response.json(
        {
          error: {
            code: "analysis_failed",
            message: "Analysis did not produce a result",
          },
        },
        { status: 500 }
      )
    }

    const analysis = ProfileAnalysisResponseSchema.parse(result.finalOutput)

    // Save to database
    const supabase = getSupabaseAdmin()

    const { data: inserted, error: insertError } = await supabase
      .from("profile_analyses")
      .insert({
        team_id: teamId,
        user_id: userId,
        overall_score: analysis.overallScore,
        categories: analysis.categories,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        detailed_feedback: analysis.detailedFeedback,
      })
      .select("id, created_at")
      .single<{ id: string; created_at: string }>()

    if (insertError) {
      return Response.json(
        {
          error: {
            code: "save_error",
            message: "Failed to save analysis",
          },
        },
        { status: 500 }
      )
    }

    return Response.json({
      analysis: {
        id: inserted.id,
        overallScore: analysis.overallScore,
        categories: analysis.categories,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        detailedFeedback: analysis.detailedFeedback,
        createdAt: inserted.created_at,
      },
    })
  } catch (error) {
    console.error("Profile analysis refresh error:", error)

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
          code: "analysis_error",
          message:
            error instanceof Error ? error.message : "An unexpected error occurred",
        },
      },
      { status: 500 }
    )
  }
}
