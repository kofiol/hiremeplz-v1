import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseAdmin, verifyAuth } from "@/lib/auth.server"

const postSchema = z.object({
  type: z.enum(["bug", "feature", "review"]),
  content: z.string().trim().min(1).max(5000),
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId } = await verifyAuth(authHeader)
    const supabaseAdmin = getSupabaseAdmin()

    const body = await request.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { type, content } = parsed.data

    const { error } = await supabaseAdmin
      .from("user_feedback")
      .insert({ user_id: userId, type, content })

    if (error) {
      return NextResponse.json(
        { error: "Failed to save feedback", details: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { role } = await verifyAuth(authHeader)

    if (role !== "leader") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from("user_feedback")
      .select("id, user_id, type, content, created_at")
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json(
        { error: "Failed to load feedback", details: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ items: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
