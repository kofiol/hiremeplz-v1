import { NextRequest } from "next/server"
import { verifyAuth, getSupabaseAdmin } from "@/lib/auth.server"

// ============================================================================
// GET — list user's onboarding conversations
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId, teamId } = await verifyAuth(authHeader)

    const supabase = getSupabaseAdmin()

    const conversationId = request.nextUrl.searchParams.get("conversationId")

    if (conversationId) {
      // Fetch full conversation with messages
      const [convRes, messagesRes] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, agent_type, status, model, metadata, started_at, finished_at")
          .eq("id", conversationId)
          .eq("user_id", userId)
          .eq("team_id", teamId)
          .single<{
            id: string
            agent_type: string
            status: string
            model: string | null
            metadata: Record<string, unknown>
            started_at: string
            finished_at: string | null
          }>(),
        supabase
          .from("conversation_messages")
          .select("id, role, content, tool_calls, saved_fields, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .returns<{
            id: string
            role: string
            content: string
            tool_calls: unknown
            saved_fields: unknown
            created_at: string
          }[]>(),
      ])

      if (convRes.error || !convRes.data) {
        return Response.json(
          { error: { code: "not_found", message: "Conversation not found" } },
          { status: 404 }
        )
      }

      return Response.json({
        conversation: convRes.data,
        messages: messagesRes.data ?? [],
      })
    }

    // List all conversations
    const { data, error } = await supabase
      .from("conversations")
      .select("id, agent_type, status, model, started_at, finished_at, created_at")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .eq("agent_type", "onboarding")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<{
        id: string
        agent_type: string
        status: string
        model: string | null
        started_at: string
        finished_at: string | null
        created_at: string
      }[]>()

    if (error) {
      return Response.json(
        { error: { code: "fetch_error", message: error.message } },
        { status: 500 }
      )
    }

    return Response.json({ conversations: data ?? [] })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Missing or invalid Authorization header" ||
        error.message === "Unauthorized")
    ) {
      return Response.json(
        { error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      )
    }

    return Response.json(
      {
        error: {
          code: "fetch_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      },
      { status: 500 }
    )
  }
}
