import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin, verifyAuth } from "@/lib/auth.server"

// GET session data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId } = await verifyAuth(authHeader)
    const { sessionId } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { data: session, error } = await supabaseAdmin
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Session not found" } },
        { status: 404 }
      )
    }

    return NextResponse.json(session)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

// PATCH to update session (transcript, metrics, status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId } = await verifyAuth(authHeader)
    const { sessionId } = await params
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    const allowedFields: Record<string, unknown> = {}
    if (body.transcript !== undefined) allowedFields.transcript = body.transcript
    if (body.metrics !== undefined) allowedFields.metrics = body.metrics
    if (body.status !== undefined) allowedFields.status = body.status
    if (body.started_at !== undefined) allowedFields.started_at = body.started_at
    if (body.finished_at !== undefined) allowedFields.finished_at = body.finished_at

    const { error } = await supabaseAdmin
      .from("interview_sessions")
      .update(allowedFields)
      .eq("id", sessionId)
      .eq("user_id", userId)

    if (error) {
      return NextResponse.json(
        { error: { code: "update_failed", message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
