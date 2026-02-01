import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSupabaseAdmin, verifyAuth } from "@/lib/auth.server"
import { computeAndUpdateProfileCompleteness } from "@/lib/profile-completeness.server"
import type { Json } from "@/lib/database.types"

const patchSchema = z.object({
  profile: z
    .object({
      displayName: z.string().trim().min(1).nullable().optional(),
      headline: z.string().trim().nullable().optional(),
      about: z.string().trim().nullable().optional(),
      location: z.string().trim().nullable().optional(),
      linkedinUrl: z.string().trim().url().nullable().optional(),
    })
    .optional(),
  aiPreferences: z
    .object({
      proposalStyle: z.enum(["professional", "conversational", "technical"]).optional(),
      proposalTemperature: z.number().min(0.3).max(1.0).optional(),
      vocabularyLevel: z.number().int().min(1).max(5).optional(),
      feedbackDetail: z.enum(["concise", "balanced", "detailed"]).optional(),
    })
    .optional(),
  interviewPrep: z
    .object({
      autoSave: z.boolean().optional(),
      difficultyLevel: z.enum(["easy", "medium", "hard"]).optional(),
      sessionLength: z.number().int().min(5).max(15).optional(),
    })
    .optional(),
})

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const authContext = await verifyAuth(authHeader)
    const supabaseAdmin = getSupabaseAdmin()

    const [profileResult, preferencesResult, coverLetterSettingsResult, interviewPrepSettingsResult] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("display_name, timezone, headline, about, location, linkedin_url")
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId)
        .maybeSingle<{
          display_name: string | null
          timezone: string | null
          headline: string | null
          about: string | null
          location: string | null
          linkedin_url: string | null
        }>(),
      supabaseAdmin
        .from("user_preferences")
        .select("currency")
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId)
        .maybeSingle<{
          currency: string | null
        }>(),
      supabaseAdmin
        .from("user_agent_settings")
        .select("settings_json")
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId)
        .eq("agent_type", "cover_letter")
        .maybeSingle<{
          settings_json: {
            proposal_style?: string
            proposal_temperature?: number
            vocabulary_level?: number
            feedback_detail?: string
          } | null
        }>(),
      supabaseAdmin
        .from("user_agent_settings")
        .select("settings_json")
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId)
        .eq("agent_type", "interview_prep")
        .maybeSingle<{
          settings_json: {
            auto_save?: boolean
            difficulty_level?: string
            session_length?: number
          } | null
        }>(),
    ])

    if (profileResult.error) {
      return NextResponse.json(
        { error: "Failed to load profile settings", details: profileResult.error.message },
        { status: 500 },
      )
    }

    if (preferencesResult.error) {
      return NextResponse.json(
        {
          error: "Failed to load preferences settings",
          details: preferencesResult.error.message,
        },
        { status: 500 },
      )
    }

    if (coverLetterSettingsResult.error) {
      return NextResponse.json(
        { error: "Failed to load AI preferences", details: coverLetterSettingsResult.error.message },
        { status: 500 },
      )
    }

    if (interviewPrepSettingsResult.error) {
      return NextResponse.json(
        { error: "Failed to load interview prep settings", details: interviewPrepSettingsResult.error.message },
        { status: 500 },
      )
    }

    const aiPrefsJson = coverLetterSettingsResult.data?.settings_json ?? null
    const interviewPrepJson = interviewPrepSettingsResult.data?.settings_json ?? null

    return NextResponse.json(
      {
        profile: {
          display_name: profileResult.data?.display_name ?? null,
          timezone: profileResult.data?.timezone ?? null,
          headline: profileResult.data?.headline ?? null,
          about: profileResult.data?.about ?? null,
          location: profileResult.data?.location ?? null,
          linkedin_url: profileResult.data?.linkedin_url ?? null,
        },
        preferences: {
          currency: preferencesResult.data?.currency ?? null,
        },
        ai_preferences: {
          proposal_style: aiPrefsJson?.proposal_style ?? null,
          proposal_temperature: aiPrefsJson?.proposal_temperature ?? null,
          vocabulary_level: aiPrefsJson?.vocabulary_level ?? null,
          feedback_detail: aiPrefsJson?.feedback_detail ?? null,
        },
        interview_prep: {
          auto_save: interviewPrepJson?.auto_save ?? true,
          difficulty_level: interviewPrepJson?.difficulty_level ?? null,
          session_length: interviewPrepJson?.session_length ?? null,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const authContext = await verifyAuth(authHeader)
    const supabaseAdmin = getSupabaseAdmin()

    const json = await request.json()
    const parsed = patchSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_payload",
            message: "Invalid settings payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }

    const { profile, aiPreferences, interviewPrep } = parsed.data

    if (profile) {
      const profileUpdate: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (typeof profile.displayName !== "undefined") {
        profileUpdate.display_name = profile.displayName
      }
      if (typeof profile.headline !== "undefined") {
        profileUpdate.headline = profile.headline
      }
      if (typeof profile.about !== "undefined") {
        profileUpdate.about = profile.about
      }
      if (typeof profile.location !== "undefined") {
        profileUpdate.location = profile.location
      }
      if (typeof profile.linkedinUrl !== "undefined") {
        profileUpdate.linkedin_url = profile.linkedinUrl
      }

      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId)

      if (profileUpdateError) {
        return NextResponse.json(
          {
            error: {
              code: "profile_update_failed",
              message: "Failed to update profile",
              details: profileUpdateError.message,
            },
          },
          { status: 500 },
        )
      }
    }

    if (aiPreferences) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("user_agent_settings")
        .select("settings_json")
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId)
        .eq("agent_type", "cover_letter")
        .maybeSingle<{ settings_json: Record<string, unknown> | null }>()

      if (existingError) {
        return NextResponse.json(
          {
            error: {
              code: "ai_prefs_load_failed",
              message: "Failed to load AI preferences",
              details: existingError.message,
            },
          },
          { status: 500 },
        )
      }

      const existingJson = (existing?.settings_json ?? {}) as Record<string, unknown>

      const settingsJson = {
        proposal_style:
          typeof aiPreferences.proposalStyle !== "undefined"
            ? aiPreferences.proposalStyle
            : existingJson.proposal_style ?? "professional",
        proposal_temperature:
          typeof aiPreferences.proposalTemperature !== "undefined"
            ? aiPreferences.proposalTemperature
            : existingJson.proposal_temperature ?? 0.7,
        vocabulary_level:
          typeof aiPreferences.vocabularyLevel !== "undefined"
            ? aiPreferences.vocabularyLevel
            : existingJson.vocabulary_level ?? 3,
        feedback_detail:
          typeof aiPreferences.feedbackDetail !== "undefined"
            ? aiPreferences.feedbackDetail
            : existingJson.feedback_detail ?? "balanced",
      }

      const { error: upsertError } = await supabaseAdmin
        .from("user_agent_settings")
        .upsert(
          {
            team_id: authContext.teamId,
            user_id: authContext.userId,
            agent_type: "cover_letter",
            settings_json: settingsJson as unknown as Json,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "team_id,user_id,agent_type",
          },
        )

      if (upsertError) {
        return NextResponse.json(
          {
            error: {
              code: "ai_prefs_persist_failed",
              message: "Failed to persist AI preferences",
              details: upsertError.message,
            },
          },
          { status: 500 },
        )
      }
    }

    if (interviewPrep) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("user_agent_settings")
        .select("settings_json")
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId)
        .eq("agent_type", "interview_prep")
        .maybeSingle<{ settings_json: Record<string, unknown> | null }>()

      if (existingError) {
        return NextResponse.json(
          {
            error: {
              code: "interview_prefs_load_failed",
              message: "Failed to load interview prep settings",
              details: existingError.message,
            },
          },
          { status: 500 },
        )
      }

      const existingJson = (existing?.settings_json ?? {}) as Record<string, unknown>

      const settingsJson = {
        auto_save:
          typeof interviewPrep.autoSave !== "undefined"
            ? interviewPrep.autoSave
            : existingJson.auto_save ?? true,
        difficulty_level:
          typeof interviewPrep.difficultyLevel !== "undefined"
            ? interviewPrep.difficultyLevel
            : existingJson.difficulty_level ?? "medium",
        session_length:
          typeof interviewPrep.sessionLength !== "undefined"
            ? interviewPrep.sessionLength
            : existingJson.session_length ?? 10,
      }

      const { error: upsertError } = await supabaseAdmin
        .from("user_agent_settings")
        .upsert(
          {
            team_id: authContext.teamId,
            user_id: authContext.userId,
            agent_type: "interview_prep",
            settings_json: settingsJson as unknown as Json,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "team_id,user_id,agent_type",
          },
        )

      if (upsertError) {
        return NextResponse.json(
          {
            error: {
              code: "interview_prefs_persist_failed",
              message: "Failed to persist interview prep settings",
              details: upsertError.message,
            },
          },
          { status: 500 },
        )
      }
    }

    const completeness = await computeAndUpdateProfileCompleteness(authContext)

    return NextResponse.json(
      {
        ok: true,
        profile_completeness_score: completeness.score,
        missing_fields: completeness.missingFields,
      },
      { status: 200 },
    )
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: "settings_save_failed",
            message: error.message,
          },
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: {
          code: "settings_save_failed",
          message: "Unknown error",
        },
      },
      { status: 500 },
    )
  }
}
