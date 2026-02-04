import { Agent, run } from "@openai/agents"
import type { CollectedData, ProfileAnalysis } from "@/lib/onboarding/schema"
import { ProfileAnalysisSchema, ProfileAnalysisJsonSchema } from "@/lib/onboarding/schema"
import { EXPERIENCE_LEVEL_LABELS } from "@/lib/onboarding/constants"
import { PROFILE_ANALYSIS_INSTRUCTIONS } from "./agent"
import { getSupabaseAdmin } from "@/lib/auth.server"
import type { SSEEmitter } from "./streaming"

// ============================================================================
// Profile Analysis
// ============================================================================

export async function runProfileAnalysis(
  emit: SSEEmitter,
  collectedData: Partial<CollectedData>,
  authContext: { userId: string; teamId: string } | null,
  signal?: AbortSignal
): Promise<void> {
  emit({ type: "analysis_started" })

  const prompt = `
Analyze this freelancer profile and provide comprehensive feedback:

Profile Data:
${JSON.stringify(collectedData, null, 2)}

Provide an overall score (0-100), category scores, strengths, improvements, and detailed feedback.
Include rate analysis comparing their current rate vs dream rate.`

  const analysisAgent = new Agent({
    name: "Profile Analyst",
    instructions: PROFILE_ANALYSIS_INSTRUCTIONS,
    model: "gpt-5.1",
    modelSettings: { reasoning_effort: "high" } as Record<string, unknown>,
    outputType: ProfileAnalysisJsonSchema,
  })

  const reasoningStartTime = Date.now()
  emit({ type: "reasoning_started" })

  const analysisResult = await run(analysisAgent, prompt, { stream: true })
  const textStream = analysisResult.toTextStream({
    compatibleWithNodeStreams: false,
  })

  for await (const chunk of textStream) {
    if (signal?.aborted) break
    if (chunk) {
      emit({ type: "reasoning_chunk", content: chunk })
    }
  }

  if (signal?.aborted) return

  emit({ type: "reasoning_evaluating" })
  await analysisResult.completed

  const reasoningDuration = Math.round(
    (Date.now() - reasoningStartTime) / 1000
  )
  emit({ type: "reasoning_completed", duration: reasoningDuration })

  if (analysisResult.finalOutput) {
    const analysis = ProfileAnalysisSchema.parse(
      analysisResult.finalOutput
    ) as ProfileAnalysis

    emit({
      type: "profile_analysis",
      overallScore: analysis.overallScore,
      categories: analysis.categories,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      detailedFeedback: analysis.detailedFeedback,
    })

    if (authContext) {
      try {
        await persistOnboardingComplete(authContext, collectedData, analysis)
      } catch (persistError) {
        console.error("Failed to persist onboarding data:", persistError)
      }
    }
  }
}

// ============================================================================
// Persist onboarding data + analysis to Supabase
// ============================================================================

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

export async function persistOnboardingComplete(
  authContext: { userId: string; teamId: string },
  collectedData: Partial<CollectedData>,
  analysis: ProfileAnalysis
) {
  const supabase = getSupabaseAdmin()
  const { userId, teamId } = authContext
  const now = new Date().toISOString()

  const headline = generateHeadline(collectedData)
  const about = generateAbout(collectedData)

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
