import { NextRequest } from "next/server"
import { tasks } from "@trigger.dev/sdk/v3"
import { verifyAuth, getSupabaseAdmin } from "@/lib/auth.server"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit.server"
import { fetchUserContext } from "@/lib/user-context.server"
import { generateJobQueries } from "@/lib/agents/job-query-agent"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId, teamId } = await verifyAuth(authHeader)

    const rl = checkRateLimit(userId, RATE_LIMITS.jobFetch)
    if (!rl.allowed) return rateLimitResponse(rl)

    // Fetch user context and generate queries
    const userContext = await fetchUserContext(userId)
    const queryResult = await generateJobQueries(userContext)

    const supabase = getSupabaseAdmin()

    // Create agent_runs record
    const { data: agentRun, error: insertError } = await supabase
      .from("agent_runs")
      .insert({
        team_id: teamId,
        user_id: userId,
        agent_type: "job_search" as const,
        trigger: "manual",
        status: "queued" as const,
        inputs: {
          queries: queryResult.queries,
          reasoning: queryResult.reasoning,
        },
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single<{ id: string }>()

    if (insertError || !agentRun) {
      console.error("Failed to create agent_runs record:", insertError)
      return Response.json(
        { error: { code: "db_error", message: "Failed to create run record" } },
        { status: 500 },
      )
    }

    // Trigger the background job
    const handle = await tasks.trigger("linkedin-job-search", {
      teamId,
      userId,
      agentRunId: agentRun.id,
      queries: queryResult.queries,
    })

    // Update agent_runs with trigger run ID and set status to running
    await supabase
      .from("agent_runs")
      .update({
        status: "running" as const,
        inputs: {
          queries: queryResult.queries,
          reasoning: queryResult.reasoning,
          triggerRunId: handle.id,
        },
      })
      .eq("id", agentRun.id)

    return Response.json({
      runId: agentRun.id,
      triggerRunId: handle.id,
      queries: queryResult.queries,
      reasoning: queryResult.reasoning,
    })
  } catch (error) {
    console.error("Job fetch error:", error)

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
          code: "job_fetch_error",
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
