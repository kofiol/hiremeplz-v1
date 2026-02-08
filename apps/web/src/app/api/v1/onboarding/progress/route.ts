import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, verifyAuth } from "@/lib/auth.server";
import { ONBOARDING_AGENT_TYPE } from "@/lib/onboarding/constants";
import type { Json } from "@/lib/database.types";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const authContext = await verifyAuth(authHeader);
    const supabaseAdmin = getSupabaseAdmin()

    const { data: existingAgentSettings, error: existingAgentSettingsError } =
      await supabaseAdmin
        .from("user_agent_settings")
        .select("settings_json")
        .eq("team_id", authContext.teamId)
        .eq("user_id", authContext.userId)
        .eq("agent_type", ONBOARDING_AGENT_TYPE)
        .maybeSingle<{ settings_json: Record<string, unknown> | null }>();

    if (existingAgentSettingsError) {
      // Try legacy "job_search" agent_type as fallback
      const { data: legacySettings } = await supabaseAdmin
        .from("user_agent_settings")
        .select("settings_json")
        .eq("team_id", authContext.teamId)
        .eq("user_id", authContext.userId)
        .eq("agent_type", "job_search")
        .maybeSingle<{ settings_json: Record<string, unknown> | null }>();

      const legacyProgress = legacySettings?.settings_json?.onboarding_progress ?? null;
      return NextResponse.json({ onboardingProgress: legacyProgress });
    }

    const currentSettings = existingAgentSettings?.settings_json ?? {};
    let onboardingProgress = (currentSettings.onboarding_progress as Record<string, unknown>) ?? null;

    // Fallback: check legacy "job_search" agent_type if no progress found
    if (!onboardingProgress) {
      const { data: legacySettings } = await supabaseAdmin
        .from("user_agent_settings")
        .select("settings_json")
        .eq("team_id", authContext.teamId)
        .eq("user_id", authContext.userId)
        .eq("agent_type", "job_search")
        .maybeSingle<{ settings_json: Record<string, unknown> | null }>();

      onboardingProgress = (legacySettings?.settings_json?.onboarding_progress as Record<string, unknown>) ?? null;
    }

    return NextResponse.json({
      onboardingProgress,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: "fetch_progress_failed",
            message: error.message,
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "fetch_progress_failed",
          message: "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const authContext = await verifyAuth(authHeader);
    const supabaseAdmin = getSupabaseAdmin()

    const json = await request.json();
    const { messages, collectedData, hasStarted } = json;

    const { data: existingAgentSettings, error: existingAgentSettingsError } =
      await supabaseAdmin
        .from("user_agent_settings")
        .select("settings_json")
        .eq("team_id", authContext.teamId)
        .eq("user_id", authContext.userId)
        .eq("agent_type", ONBOARDING_AGENT_TYPE)
        .maybeSingle<{ settings_json: Record<string, unknown> | null }>();

    if (existingAgentSettingsError) {
      return NextResponse.json(
        {
          error: {
            code: "agent_settings_load_failed",
            message: "Failed to load agent settings",
            details: existingAgentSettingsError.message,
          },
        },
        { status: 500 }
      );
    }

    const currentSettings = existingAgentSettings?.settings_json ?? {};
    const nextSettings: Record<string, unknown> = {
      ...currentSettings,
      onboarding_progress: {
        messages,
        collectedData,
        hasStarted,
        updatedAt: new Date().toISOString(),
      },
    };

    const { error: agentSettingsError } = await supabaseAdmin
      .from("user_agent_settings")
      .upsert(
        {
          team_id: authContext.teamId,
          user_id: authContext.userId,
          agent_type: ONBOARDING_AGENT_TYPE,
          settings_json: nextSettings as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "team_id,user_id,agent_type",
        }
      );

    if (agentSettingsError) {
      return NextResponse.json(
        {
          error: {
            code: "agent_settings_persist_failed",
            message: "Failed to persist agent settings",
            details: agentSettingsError.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: "save_progress_failed",
            message: error.message,
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "save_progress_failed",
          message: "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
