import { NextRequest } from "next/server"
import { verifyAuth, getSupabaseAdmin } from "@/lib/auth.server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { teamId } = await verifyAuth(authHeader)

    const runId = request.nextUrl.searchParams.get("runId")
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from("agent_runs")
      .select("id, status, outputs, error_text, started_at, finished_at")
      .eq("team_id", teamId)
      .eq("agent_type", "job_search")

    if (runId) {
      query = query.eq("id", runId)
    } else {
      query = query.order("created_at", { ascending: false }).limit(1)
    }

    const { data, error } = await query.maybeSingle<{
      id: string
      status: string
      outputs: Record<string, unknown> | null
      error_text: string | null
      started_at: string | null
      finished_at: string | null
    }>()

    if (error) {
      console.error("Failed to fetch agent run status:", error)
      return Response.json(
        { error: { code: "db_error", message: "Failed to fetch run status" } },
        { status: 500 },
      )
    }

    if (!data) {
      return Response.json(
        { error: { code: "not_found", message: "No job fetch runs found" } },
        { status: 404 },
      )
    }

    // Also fetch the latest enrichment run for this team
    const { data: enrichmentRun } = await supabase
      .from("agent_runs")
      .select("id, status, outputs, error_text, started_at, finished_at")
      .eq("team_id", teamId)
      .eq("agent_type", "job_enrichment")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string
        status: string
        outputs: Record<string, unknown> | null
        error_text: string | null
        started_at: string | null
        finished_at: string | null
      }>()

    return Response.json({
      runId: data.id,
      status: data.status,
      outputs: data.outputs,
      error: data.error_text,
      startedAt: data.started_at,
      finishedAt: data.finished_at,
      enrichment: enrichmentRun
        ? {
            runId: enrichmentRun.id,
            status: enrichmentRun.status,
            outputs: enrichmentRun.outputs,
            error: enrichmentRun.error_text,
            startedAt: enrichmentRun.started_at,
            finishedAt: enrichmentRun.finished_at,
          }
        : null,
    })
  } catch (error) {
    console.error("Job fetch status error:", error)

    if (
      error instanceof Error &&
      (error.message === "Missing or invalid Authorization header" ||
        error.message === "Unauthorized")
    ) {
      return Response.json(
        { error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 },
      )
    }

    return Response.json(
      {
        error: {
          code: "status_error",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        },
      },
      { status: 500 },
    )
  }
}
