import { Agent, run, OutputGuardrailTripwireTriggered, type OutputGuardrail } from "@openai/agents"
import type { CollectedData, ProfileAnalysis } from "@/lib/onboarding/schema"
import { ProfileAnalysisSchema, ProfileAnalysisJsonSchema, isSkipped } from "@/lib/onboarding/schema"
import { EXPERIENCE_LEVEL_LABELS } from "@/lib/onboarding/constants"
import { PROFILE_ANALYSIS_INSTRUCTIONS } from "./agent"
import { getSupabaseAdmin } from "@/lib/auth.server"
import type { SSEEmitter } from "./streaming"
import { analysisScopeGuardrail } from "./guardrails"
import { getActivePromptVersion } from "./conversation.server"

// ============================================================================
// Profile Analysis
// ============================================================================

export async function runProfileAnalysis(
  emit: SSEEmitter,
  collectedData: Partial<CollectedData>,
  authContext: { userId: string; teamId: string } | null,
  signal?: AbortSignal,
  conversationId?: string | null
): Promise<void> {
  emit({ type: "analysis_started" })

  // Check for active prompt version
  const promptVersion = await getActivePromptVersion("onboarding", "Profile Analysis")
  const analysisInstructions = promptVersion?.instructions ?? PROFILE_ANALYSIS_INSTRUCTIONS
  const analysisModel = promptVersion?.model ?? "gpt-5.1"
  const analysisModelSettings = promptVersion?.modelSettings ?? { reasoning_effort: "high" }

  const { summary, skippedFields, providedFields } = prepareAnalysisContext(collectedData)
  const rateDataExists = hasRateData(collectedData)
  const name = collectedData.fullName ?? "this freelancer"

  const prompt = `You just finished onboarding ${name} through a conversational chat. Now analyze what you collected and provide a comprehensive profile assessment.

## What Was Collected

${summary}

## Context Notes
- Skills were collected via a dropdown selector — names only, no proficiency levels or years of experience were captured. Assess the skill *combination and coherence*, not individual skill depth.
- "Skipped" means the user made a deliberate choice to skip that section. Acknowledge lightly and suggest they revisit later, but do NOT penalize them.
- Experience highlights came from conversational probing — quality depends on how much detail the user shared.
${rateDataExists ? "- Rate data is available — include rate analysis comparing current vs dream rate." : "- No rate data was provided. Score ratePositioning at 40-50 (neutral) and note they can add rates later. Do NOT fabricate rate analysis."}
${providedFields.length > 0 ? `\nFields provided: ${providedFields.join(", ")}` : ""}
${skippedFields.length > 0 ? `\nFields deliberately skipped: ${skippedFields.join(", ")}` : ""}

Provide an overall score (0-100), category scores, strengths, improvements, and detailed feedback.`

  const analysisAgent = new Agent({
    name: "Profile Analyst",
    instructions: analysisInstructions,
    model: analysisModel,
    modelSettings: analysisModelSettings as Record<string, unknown>,
    outputType: ProfileAnalysisJsonSchema,
    outputGuardrails: [analysisScopeGuardrail as unknown as OutputGuardrail<typeof ProfileAnalysisJsonSchema>],
  })

  const reasoningStartTime = Date.now()
  emit({ type: "reasoning_started" })

  let analysisResult
  try {
    analysisResult = await run(analysisAgent, prompt, { stream: true })
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
  } catch (err) {
    if (err instanceof OutputGuardrailTripwireTriggered) {
      console.warn("[analysis] Scope guardrail tripped, retrying without guardrail")
      // Retry without the scope guardrail — the improved prompt is the primary control
      const retryAgent = new Agent({
        name: "Profile Analyst",
        instructions: analysisInstructions,
        model: analysisModel,
        modelSettings: analysisModelSettings as Record<string, unknown>,
        outputType: ProfileAnalysisJsonSchema,
      })
      analysisResult = await run(retryAgent, prompt, { stream: true })
      const retryStream = analysisResult.toTextStream({
        compatibleWithNodeStreams: false,
      })
      for await (const chunk of retryStream) {
        if (signal?.aborted) break
        if (chunk) {
          emit({ type: "reasoning_chunk", content: chunk })
        }
      }
      if (signal?.aborted) return
      emit({ type: "reasoning_evaluating" })
      await analysisResult.completed
    } else {
      throw err
    }
  }

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
        await persistOnboardingComplete(authContext, collectedData, analysis, conversationId, promptVersion?.id)
      } catch (persistError) {
        console.error("Failed to persist onboarding data:", persistError)
      }
    }
  }
}

// ============================================================================
// Persist onboarding data + analysis to Supabase
// ============================================================================

function hasRateData(data: Partial<CollectedData>): boolean {
  return (
    typeof data.currentRateMin === "number" ||
    typeof data.currentRateMax === "number" ||
    typeof data.dreamRateMin === "number" ||
    typeof data.dreamRateMax === "number"
  )
}

function prepareAnalysisContext(data: Partial<CollectedData>): {
  summary: string
  skippedFields: string[]
  providedFields: string[]
} {
  const lines: string[] = []
  const skippedFields: string[] = []
  const providedFields: string[] = []

  // Name
  if (data.fullName) {
    lines.push(`**Name:** ${data.fullName}`)
    providedFields.push("name")
  }

  // Experience Level
  if (isSkipped(data.experienceLevel)) {
    lines.push("**Experience Level:** Skipped")
    skippedFields.push("experience level")
  } else if (data.experienceLevel) {
    const label = EXPERIENCE_LEVEL_LABELS[data.experienceLevel] ?? data.experienceLevel
    lines.push(`**Experience Level:** ${label}`)
    providedFields.push("experience level")
  } else {
    lines.push("**Experience Level:** Not collected")
  }

  // Skills
  if (isSkipped(data.skills)) {
    lines.push("**Skills:** Skipped")
    skippedFields.push("skills")
  } else if (data.skills?.length) {
    const skillNames = data.skills.map((s) => s.name).join(", ")
    lines.push(`**Skills:** ${skillNames}`)
    lines.push("  *(Collected via dropdown selector — names only, no proficiency data)*")
    providedFields.push("skills")
  } else {
    lines.push("**Skills:** Not collected")
  }

  // Experiences
  if (isSkipped(data.experiences)) {
    lines.push("**Work Experience:** Skipped")
    skippedFields.push("work experience")
  } else if (data.experiences?.length) {
    lines.push("**Work Experience:**")
    for (const exp of data.experiences) {
      const company = exp.company ? ` at ${exp.company}` : ""
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ")
      const datePart = dates ? ` (${dates})` : ""
      lines.push(`  - ${exp.title}${company}${datePart}`)
      if (exp.highlights) {
        lines.push(`    Highlights: ${exp.highlights}`)
      }
    }
    providedFields.push("work experience")
  } else {
    lines.push("**Work Experience:** Not collected")
  }

  // Education
  if (isSkipped(data.educations)) {
    lines.push("**Education:** Skipped")
    skippedFields.push("education")
  } else if (data.educations?.length) {
    lines.push("**Education:**")
    for (const edu of data.educations) {
      const degree = edu.degree ? `${edu.degree}` : ""
      const field = edu.field ? ` in ${edu.field}` : ""
      const years = [edu.startYear, edu.endYear].filter(Boolean).join("–")
      const yearPart = years ? ` (${years})` : ""
      lines.push(`  - ${degree}${field} from ${edu.school}${yearPart}`)
    }
    providedFields.push("education")
  } else {
    lines.push("**Education:** Not collected")
  }

  // Engagement Types
  if (isSkipped(data.engagementTypes)) {
    lines.push("**Engagement Types:** Skipped")
    skippedFields.push("engagement types")
  } else if (data.engagementTypes?.length) {
    const labels = data.engagementTypes.map((t) =>
      t === "full_time" ? "Full-time" : "Part-time"
    )
    lines.push(`**Engagement Types:** ${labels.join(" and ")}`)
    providedFields.push("engagement types")
  } else {
    lines.push("**Engagement Types:** Not collected")
  }

  // Current Rate
  const currency = data.currency ?? "USD"
  if (isSkipped(data.currentRateMin)) {
    lines.push("**Current Rate:** Skipped")
    skippedFields.push("current rate")
  } else if (typeof data.currentRateMin === "number") {
    const max = typeof data.currentRateMax === "number" ? data.currentRateMax : null
    const rateStr = max ? `$${data.currentRateMin}–${max}/hr ${currency}` : `$${data.currentRateMin}+/hr ${currency}`
    lines.push(`**Current Rate:** ${rateStr}`)
    providedFields.push("current rate")
  } else {
    lines.push("**Current Rate:** Not collected")
  }

  // Dream Rate
  if (isSkipped(data.dreamRateMin)) {
    lines.push("**Dream Rate:** Skipped")
    skippedFields.push("dream rate")
  } else if (typeof data.dreamRateMin === "number") {
    const max = typeof data.dreamRateMax === "number" ? data.dreamRateMax : null
    const rateStr = max ? `$${data.dreamRateMin}–${max}/hr ${currency}` : `$${data.dreamRateMin}+/hr ${currency}`
    lines.push(`**Dream Rate:** ${rateStr}`)
    providedFields.push("dream rate")
  } else {
    lines.push("**Dream Rate:** Not collected")
  }

  // LinkedIn
  if (isSkipped(data.linkedinUrl)) {
    lines.push("**LinkedIn:** Skipped")
    skippedFields.push("LinkedIn")
  } else if (data.linkedinUrl) {
    lines.push(`**LinkedIn:** ${data.linkedinUrl}`)
    providedFields.push("LinkedIn")
  }

  return { summary: lines.join("\n"), skippedFields, providedFields }
}

function generateHeadline(data: Partial<CollectedData>): string {
  const level = data.experienceLevel && !isSkipped(data.experienceLevel)
    ? EXPERIENCE_LEVEL_LABELS[data.experienceLevel] ?? ""
    : ""
  const topSkills = isSkipped(data.skills) ? [] : (data.skills ?? []).slice(0, 4).map((s) => s.name)
  const primaryTitle = (!isSkipped(data.experiences) && data.experiences?.[0]?.title) ?? "Freelancer"

  if (topSkills.length > 0) {
    return `${level} ${primaryTitle} — ${topSkills.join(" | ")}`.trim()
  }
  return `${level} ${primaryTitle}`.trim()
}

function generateAbout(data: Partial<CollectedData>): string {
  const name = data.fullName ?? "Freelancer"
  const level = data.experienceLevel && !isSkipped(data.experienceLevel)
    ? EXPERIENCE_LEVEL_LABELS[data.experienceLevel]?.toLowerCase() ?? ""
    : ""
  const skills = isSkipped(data.skills) ? [] : (data.skills ?? []).map((s) => s.name)
  const latestExp = isSkipped(data.experiences) ? undefined : data.experiences?.[0]
  const engagementTypes = isSkipped(data.engagementTypes) ? undefined : data.engagementTypes
  const engagementLabel =
    engagementTypes?.includes("full_time") &&
    engagementTypes?.includes("part_time")
      ? "full-time and part-time"
      : engagementTypes?.includes("full_time")
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
  analysis: ProfileAnalysis,
  conversationId?: string | null,
  promptVersionId?: string | null
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
      linkedin_url: collectedData.linkedinUrl && collectedData.linkedinUrl !== "skipped" ? collectedData.linkedinUrl : undefined,
      profile_completeness_score: 1,
      onboarding_completed_at: now,
      updated_at: now,
    } as never)
    .eq("user_id", userId)
    .eq("team_id", teamId)

  if (collectedData.skills && !isSkipped(collectedData.skills) && collectedData.skills.length > 0) {
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

  if (collectedData.experiences && !isSkipped(collectedData.experiences) && collectedData.experiences.length > 0) {
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

  if (collectedData.educations && !isSkipped(collectedData.educations) && collectedData.educations.length > 0) {
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
    !isSkipped(collectedData.dreamRateMin) && collectedData.dreamRateMin != null ||
    !isSkipped(collectedData.dreamRateMax) && collectedData.dreamRateMax != null
  const hasCurrentRate =
    !isSkipped(collectedData.currentRateMin) && collectedData.currentRateMin != null ||
    !isSkipped(collectedData.currentRateMax) && collectedData.currentRateMax != null

  if (hasDreamRate || hasCurrentRate || collectedData.currency) {
    await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        team_id: teamId,
        platforms: ["upwork", "linkedin"],
        currency: collectedData.currency ?? "USD",
        hourly_min: isSkipped(collectedData.dreamRateMin) ? null : (collectedData.dreamRateMin ?? null),
        hourly_max: isSkipped(collectedData.dreamRateMax) ? null : (collectedData.dreamRateMax ?? null),
        current_hourly_min: isSkipped(collectedData.currentRateMin) ? null : (collectedData.currentRateMin ?? null),
        current_hourly_max: isSkipped(collectedData.currentRateMax) ? null : (collectedData.currentRateMax ?? null),
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
    conversation_id: conversationId ?? null,
    prompt_version_id: promptVersionId ?? null,
  })
}
