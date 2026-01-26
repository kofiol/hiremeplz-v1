import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { verifyAuth, supabaseAdmin } from "@/lib/auth.server"
import { computeAndUpdateProfileCompleteness } from "@/lib/profile-completeness.server"

const patchSchema = z.object({
  profile: z
    .object({
      displayName: z.string().trim().min(1).nullable().optional(),
    })
    .optional(),
  preferences: z
    .object({
      currency: z.string().trim().min(1).optional(),
      platforms: z.array(z.enum(["upwork", "linkedin"])).optional(),
      tightness: z.number().int().min(1).max(5).optional(),
      projectTypes: z.array(z.string().min(1)).optional(),
      hourlyMin: z.number().min(0).nullable().optional(),
      hourlyMax: z.number().min(0).nullable().optional(),
      fixedBudgetMin: z.number().min(0).nullable().optional(),
    })
    .optional(),
  agent: z
    .object({
      timeZones: z.array(z.string().min(1)).optional(),
      remoteOnly: z.boolean().optional(),
    })
    .optional(),
})

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const authContext = await verifyAuth(authHeader)

    const [profileResult, preferencesResult, agentResult] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("display_name, timezone")
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId)
        .maybeSingle<{ display_name: string | null; timezone: string | null }>(),
      supabaseAdmin
        .from("user_preferences")
        .select(
          "currency, hourly_min, hourly_max, fixed_budget_min, project_types, tightness, platforms",
        )
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId)
        .maybeSingle<{
          currency: string | null
          hourly_min: number | null
          hourly_max: number | null
          fixed_budget_min: number | null
          project_types: string[] | null
          tightness: number | null
          platforms: ("upwork" | "linkedin")[] | null
        }>(),
      supabaseAdmin
        .from("user_agent_settings")
        .select("settings_json")
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId)
        .eq("agent_type", "job_search")
        .maybeSingle<{ settings_json: { time_zones?: string[]; remote_only?: boolean } | null }>(),
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

    if (agentResult.error) {
      return NextResponse.json(
        { error: "Failed to load agent settings", details: agentResult.error.message },
        { status: 500 },
      )
    }

    const settingsJson = agentResult.data?.settings_json ?? null
    const timeZones = Array.isArray(settingsJson?.time_zones)
      ? settingsJson.time_zones.filter((item): item is string => typeof item === "string" && item.length > 0)
      : []
    const remoteOnly = settingsJson?.remote_only === true

    return NextResponse.json(
      {
        profile: {
          display_name: profileResult.data?.display_name ?? null,
          timezone: profileResult.data?.timezone ?? null,
        },
        preferences: {
          currency: preferencesResult.data?.currency ?? null,
          hourly_min: preferencesResult.data?.hourly_min ?? null,
          hourly_max: preferencesResult.data?.hourly_max ?? null,
          fixed_budget_min: preferencesResult.data?.fixed_budget_min ?? null,
          project_types: preferencesResult.data?.project_types ?? null,
          tightness: preferencesResult.data?.tightness ?? null,
          platforms: preferencesResult.data?.platforms ?? null,
        },
        agent: {
          time_zones: timeZones,
          remote_only: remoteOnly,
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

    const { profile, preferences, agent } = parsed.data

    if (profile && typeof profile.displayName !== "undefined") {
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          display_name: profile.displayName,
          updated_at: new Date().toISOString(),
        })
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

    if (preferences) {
      const { data: existingPreferences, error: existingPreferencesError } =
        await supabaseAdmin
          .from("user_preferences")
          .select(
            "currency, hourly_min, hourly_max, fixed_budget_min, project_types, tightness, platforms",
          )
          .eq("user_id", authContext.userId)
          .eq("team_id", authContext.teamId)
          .maybeSingle<{
            currency: string | null
            hourly_min: number | null
            hourly_max: number | null
            fixed_budget_min: number | null
            project_types: string[] | null
            tightness: number | null
            platforms: ("upwork" | "linkedin")[] | null
          }>()

      if (existingPreferencesError) {
        return NextResponse.json(
          {
            error: {
              code: "preferences_load_failed",
              message: "Failed to load preferences",
              details: existingPreferencesError.message,
            },
          },
          { status: 500 },
        )
      }

      const next = {
        currency:
          typeof preferences.currency !== "undefined"
            ? preferences.currency
            : existingPreferences?.currency ?? null,
        hourly_min:
          typeof preferences.hourlyMin !== "undefined"
            ? preferences.hourlyMin
            : existingPreferences?.hourly_min ?? null,
        hourly_max:
          typeof preferences.hourlyMax !== "undefined"
            ? preferences.hourlyMax
            : existingPreferences?.hourly_max ?? null,
        fixed_budget_min:
          typeof preferences.fixedBudgetMin !== "undefined"
            ? preferences.fixedBudgetMin
            : existingPreferences?.fixed_budget_min ?? null,
        project_types:
          typeof preferences.projectTypes !== "undefined"
            ? preferences.projectTypes
            : existingPreferences?.project_types ?? null,
        tightness:
          typeof preferences.tightness !== "undefined"
            ? preferences.tightness
            : existingPreferences?.tightness ?? null,
        platforms:
          typeof preferences.platforms !== "undefined"
            ? preferences.platforms
            : existingPreferences?.platforms ?? null,
      }

      const { error: preferencesError } = await supabaseAdmin
        .from("user_preferences")
        .upsert(
          {
            user_id: authContext.userId,
            team_id: authContext.teamId,
            currency: next.currency,
            hourly_min: next.hourly_min,
            hourly_max: next.hourly_max,
            fixed_budget_min: next.fixed_budget_min,
            project_types:
              next.project_types && next.project_types.length > 0
                ? next.project_types
                : ["short_gig", "medium_project"],
            tightness: next.tightness ?? 3,
            platforms: next.platforms ?? ["upwork", "linkedin"],
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        )

      if (preferencesError) {
        return NextResponse.json(
          {
            error: {
              code: "preferences_persist_failed",
              message: "Failed to persist preferences",
              details: preferencesError.message,
            },
          },
          { status: 500 },
        )
      }
    }

    if (agent) {
      const { data: existingAgent, error: existingAgentError } = await supabaseAdmin
        .from("user_agent_settings")
        .select("settings_json")
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId)
        .eq("agent_type", "job_search")
        .maybeSingle<{ settings_json: { time_zones?: string[]; remote_only?: boolean } | null }>()

      if (existingAgentError) {
        return NextResponse.json(
          {
            error: {
              code: "agent_settings_load_failed",
              message: "Failed to load agent settings",
              details: existingAgentError.message,
            },
          },
          { status: 500 },
        )
      }

      const existingJson = existingAgent?.settings_json ?? {}
      const timeZones =
        typeof agent.timeZones !== "undefined" ? agent.timeZones : existingJson.time_zones ?? []
      const remoteOnly =
        typeof agent.remoteOnly !== "undefined"
          ? agent.remoteOnly
          : existingJson.remote_only ?? false

      const { error: agentSettingsError } = await supabaseAdmin
        .from("user_agent_settings")
        .upsert(
          {
            team_id: authContext.teamId,
            user_id: authContext.userId,
            agent_type: "job_search",
            settings_json: {
              time_zones: timeZones,
              remote_only: remoteOnly,
            },
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "team_id,user_id,agent_type",
          },
        )

      if (agentSettingsError) {
        return NextResponse.json(
          {
            error: {
              code: "agent_settings_persist_failed",
              message: "Failed to persist agent settings",
              details: agentSettingsError.message,
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

