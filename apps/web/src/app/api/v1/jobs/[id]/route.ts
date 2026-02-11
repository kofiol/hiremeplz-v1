import { NextRequest } from "next/server"
import { verifyAuth, getSupabaseAdmin } from "@/lib/auth.server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { teamId } = await verifyAuth(authHeader)
    const { id } = await params

    const supabase = getSupabaseAdmin()

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(
        "id, platform, platform_job_id, title, description, apply_url, posted_at, budget_type, hourly_min, hourly_max, fixed_budget_min, fixed_budget_max, currency, client_country, client_rating, client_hires, client_payment_verified, skills, seniority, category, company_name, company_logo_url, ai_summary, ai_seniority, description_md, enriched_at",
      )
      .eq("id", id)
      .eq("team_id", teamId)
      .maybeSingle()

    if (jobError) {
      console.error("Failed to fetch job:", jobError)
      return Response.json(
        { error: { code: "db_error", message: "Failed to fetch job" } },
        { status: 500 },
      )
    }

    if (!job) {
      return Response.json(
        { error: { code: "not_found", message: "Job not found" } },
        { status: 404 },
      )
    }

    // Fetch ranking for this job
    const { data: ranking } = await supabase
      .from("job_rankings")
      .select("score, tightness, breakdown, created_at")
      .eq("team_id", teamId)
      .eq("job_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    return Response.json({
      ...job,
      ranking: ranking
        ? {
            score: Number(ranking.score),
            tightness: ranking.tightness,
            breakdown: ranking.breakdown,
            reasoning:
              (ranking.breakdown as Record<string, unknown>)?.reasoning ?? "",
            created_at: ranking.created_at,
          }
        : null,
    })
  } catch (error) {
    console.error("Job detail error:", error)

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
          code: "job_error",
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
