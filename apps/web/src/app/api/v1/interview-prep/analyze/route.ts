import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin, verifyAuth } from "@/lib/auth.server"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit.server"
import { analyzeInterview } from "@/lib/agents/analysis-agent"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId, teamId } = await verifyAuth(authHeader)

    const rl = checkRateLimit(userId, RATE_LIMITS.interviewPrepAnalyze)
    if (!rl.allowed) return rateLimitResponse(rl)

    const supabaseAdmin = getSupabaseAdmin()

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: { code: "missing_session", message: "Session ID required" } },
        { status: 400 }
      )
    }

    // Fetch session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: { code: "session_not_found", message: "Session not found" } },
        { status: 404 }
      )
    }

    // Fetch freelancer profile for context
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, headline, about, location")
      .eq("user_id", userId)
      .single()

    const { data: skills } = await supabaseAdmin
      .from("user_skills")
      .select("name")
      .eq("user_id", userId)

    const { data: experiences } = await supabaseAdmin
      .from("user_experiences")
      .select("title, company, highlights")
      .eq("user_id", userId)
      .limit(5)

    const freelancerContext = {
      name: profile?.display_name ?? "Freelancer",
      headline: profile?.headline ?? "",
      about: profile?.about ?? "",
      location: profile?.location ?? "",
      skills: skills?.map((s: { name: string }) => s.name) ?? [],
      experiences: experiences ?? [],
    }

    // Run analysis
    const analysis = await analyzeInterview({
      interviewType: session.interview_type,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transcript: (session.transcript ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metrics: (session.metrics ?? {}) as any,
      freelancerProfile: freelancerContext,
      context: session.context ?? null,
    })

    // Save analysis to session
    await supabaseAdmin
      .from("interview_sessions")
      .update({
        analysis,
        overall_score: analysis.overallScore,
        status: "completed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    return NextResponse.json({ analysis })
  } catch (err) {
    console.error("Analysis error:", err)
    const message = err instanceof Error ? err.message : "Internal error"
    return NextResponse.json(
      { error: { code: "analysis_failed", message } },
      { status: 500 }
    )
  }
}
