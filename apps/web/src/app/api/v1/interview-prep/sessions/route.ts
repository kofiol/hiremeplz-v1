import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin, verifyAuth } from "@/lib/auth.server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId } = await verifyAuth(authHeader)
    const supabaseAdmin = getSupabaseAdmin()

    const { data: sessions, error } = await supabaseAdmin
      .from("interview_sessions")
      .select(
        "id, interview_type, status, overall_score, started_at, finished_at, created_at, context"
      )
      .eq("user_id", userId)
      .in("status", ["completed", "active"])
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: { code: "fetch_failed", message: "Failed to fetch sessions" } },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions: sessions ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
