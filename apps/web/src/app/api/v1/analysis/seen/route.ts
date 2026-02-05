import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin, verifyAuth } from "@/lib/auth.server"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId } = await verifyAuth(authHeader)
    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from("profiles")
      .update({ analysis_seen_at: new Date().toISOString() })
      .eq("user_id", userId)

    if (error) {
      return NextResponse.json(
        { error: "Failed to update analysis_seen_at", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
