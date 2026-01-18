import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyAuth } from "@/lib/auth.server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const { teamId, userId } = await verifyAuth(authHeader);

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const platform = searchParams.get("platform");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam ?? "50") || 50, 1), 200);

    const preferencesResult = await supabaseAdmin
      .from("user_preferences")
      .select("tightness")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .maybeSingle<{ tightness: number | null }>();

    const tightness =
      !preferencesResult.error && typeof preferencesResult.data?.tightness === "number"
        ? preferencesResult.data.tightness
        : 3;

    let query = supabaseAdmin
      .from("jobs")
      .select(
        "id, platform, platform_job_id, title, description, apply_url, posted_at, fetched_at, created_at, budget_type, fixed_budget_min, fixed_budget_max, hourly_min, hourly_max, currency, client_country, client_rating, client_hires, client_payment_verified, skills, seniority, category, canonical_hash, source_raw, company_name, company_logo_url",
      )
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (platform === "linkedin" || platform === "upwork") {
      query = query.eq("platform", platform);
    }

    const { data: jobs, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to load jobs",
          details: error.message,
        },
        { status: 500 },
      );
    }

    const jobIds = (jobs ?? []).map((job) => job.id).filter((id) => typeof id === "string");

    const rankingsResult =
      jobIds.length > 0
        ? await supabaseAdmin
            .from("job_rankings_latest")
            .select("job_id, score, breakdown, created_at")
            .eq("tightness", tightness)
            .in("job_id", jobIds)
        : { data: null, error: null };

    if (rankingsResult.error) {
      return NextResponse.json(
        {
          error: "Failed to load job rankings",
          details: rankingsResult.error.message,
        },
        { status: 500 },
      );
    }

    const rankingByJobId = new Map<
      string,
      { score: number; breakdown: unknown; created_at: string | null }
    >();
    for (const ranking of rankingsResult.data ?? []) {
      if (!ranking?.job_id || rankingByJobId.has(ranking.job_id)) continue;
      rankingByJobId.set(ranking.job_id, {
        score: Number(ranking.score ?? 0),
        breakdown: ranking.breakdown ?? null,
        created_at: ranking.created_at ?? null,
      });
    }

    const hydratedJobs = (jobs ?? []).map((job) => ({
      ...job,
      ranking: job?.id ? (rankingByJobId.get(job.id) ?? null) : null,
    }));

    hydratedJobs.sort((a, b) => {
      const aScore = typeof a.ranking?.score === "number" ? a.ranking.score : -1;
      const bScore = typeof b.ranking?.score === "number" ? b.ranking.score : -1;
      if (aScore !== bScore) return bScore - aScore;

      const aCreated = a.created_at ? Date.parse(a.created_at) : 0;
      const bCreated = b.created_at ? Date.parse(b.created_at) : 0;
      return bCreated - aCreated;
    });

    return NextResponse.json({
      jobs: hydratedJobs,
      tightness,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      {
        error: message,
      },
      { status: 401 },
    );
  }
}
