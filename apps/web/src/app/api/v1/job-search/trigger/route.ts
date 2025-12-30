import { NextRequest, NextResponse } from "next/server"

import { tasks } from "@trigger.dev/sdk"

import { verifyAuth, createUserSupabaseClient } from "@/lib/auth.server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const authContext = await verifyAuth(authHeader)

    if (!authHeader) {
      throw new Error("Missing or invalid Authorization header")
    }

    const accessToken = authHeader.slice("Bearer ".length).trim()
    const supabase = createUserSupabaseClient(accessToken)

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_completeness_score")
      .eq("user_id", authContext.userId)
      .eq("team_id", authContext.teamId)
      .maybeSingle<{ profile_completeness_score: number | null }>()

    if (profileError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load profile completeness score",
          details: {
            code: "profile_load_failed",
            message: profileError.message,
          },
        },
        { status: 500 },
      )
    }

    const profileCompletenessScore = profile?.profile_completeness_score ?? 0

    if (profileCompletenessScore < 0.8) {
      return NextResponse.json(
        {
          success: false,
          error: "Profile completeness must be at least 0.8 to trigger job search",
          details: {
            code: "profile_incomplete",
            profile_completeness_score: profileCompletenessScore,
            required_min: 0.8,
          },
        },
        { status: 403 },
      )
    }

    const handle = await tasks.trigger(
      "hello-world",
      {
        user_id: authContext.userId,
        team_id: authContext.teamId,
      },
      {
        tags: [`team:${authContext.teamId}`, `user:${authContext.userId}`],
      },
    )

    return NextResponse.json(
      { success: true, data: handle.id, run: handle },
      { status: 200 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    if (message === "Missing or invalid Authorization header" || message === "Unauthorized") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: {
            code: "unauthorized",
            message,
          },
        },
        { status: 401 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
        details: {
          code: "job_search_trigger_failed",
        },
      },
      { status: 500 },
    )
  }
}
