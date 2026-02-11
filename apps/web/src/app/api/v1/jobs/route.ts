import { NextRequest } from "next/server"
import { verifyAuth, getSupabaseAdmin } from "@/lib/auth.server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId, teamId } = await verifyAuth(authHeader)

    const supabase = getSupabaseAdmin()

    // Fetch jobs for this team, newest first
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select(
        "id, platform, platform_job_id, title, description, apply_url, posted_at, budget_type, hourly_min, hourly_max, fixed_budget_min, fixed_budget_max, currency, client_country, client_rating, client_hires, client_payment_verified, skills, seniority, category, company_name, company_logo_url"
      )
      .eq("team_id", teamId)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(500)

    if (jobsError) {
      console.error("Failed to fetch jobs:", jobsError)
      return Response.json(
        { error: { code: "db_error", message: "Failed to fetch jobs" } },
        { status: 500 },
      )
    }

    if (!jobs || jobs.length === 0) {
      return Response.json({ jobs: [] })
    }

    const jobIds = jobs.map((j) => j.id)

    // Fetch rankings and bookmarks in parallel
    const [rankingsResult, bookmarksResult] = await Promise.all([
      supabase
        .from("job_rankings")
        .select("job_id, score, tightness, breakdown, created_at")
        .eq("team_id", teamId)
        .in("job_id", jobIds),
      supabase
        .from("job_bookmarks")
        .select("job_id")
        .eq("team_id", teamId)
        .eq("user_id", userId),
    ])

    // Build lookup maps
    type RankingRow = { job_id: string; score: number; tightness: number; breakdown: Record<string, unknown>; created_at: string }
    const rankingsByJobId = new Map<string, RankingRow>()
    if (rankingsResult.data) {
      for (const r of rankingsResult.data as RankingRow[]) {
        rankingsByJobId.set(r.job_id, r)
      }
    }

    const bookmarkedJobIds = new Set<string>()
    if (bookmarksResult.data) {
      for (const b of bookmarksResult.data) {
        bookmarkedJobIds.add(b.job_id)
      }
    }

    // Map to frontend Job type
    const result = jobs.map((job) => {
      const ranking = rankingsByJobId.get(job.id)
      return {
        ...job,
        ai_summary: null,
        ai_seniority: null,
        description_md: null,
        enriched_at: null,
        is_bookmarked: bookmarkedJobIds.has(job.id),
        ranking: ranking
          ? {
              score: Number(ranking.score),
              tightness: ranking.tightness,
              breakdown: ranking.breakdown,
              reasoning: (ranking.breakdown as Record<string, unknown>)?.reasoning ?? "",
              created_at: ranking.created_at,
            }
          : null,
      }
    })

    return Response.json({ jobs: result })
  } catch (error) {
    console.error("Jobs list error:", error)

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
          code: "jobs_error",
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
