import { getSupabaseAdmin } from "@/lib/auth.server"
import type { Database } from "@/lib/database.types"

type AgentType = Database["public"]["Enums"]["agent_type"]
type Json = Database["public"]["Tables"]["conversations"]["Row"]["metadata"]

// ============================================================================
// Conversation Lifecycle Helpers
// ============================================================================

export async function createConversation(params: {
  teamId: string
  userId: string
  agentType: AgentType
  promptVersionId?: string | null
  model?: string
  metadata?: Record<string, unknown>
}): Promise<string | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      team_id: params.teamId,
      user_id: params.userId,
      agent_type: params.agentType,
      prompt_version_id: params.promptVersionId ?? null,
      model: params.model ?? null,
      metadata: (params.metadata ?? {}) as Json,
    })
    .select("id")
    .single<{ id: string }>()

  if (error) {
    console.error("[conversation] Failed to create conversation:", error.message)
    return null
  }

  return data.id
}

export async function saveMessage(params: {
  conversationId: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  toolCalls?: unknown
  savedFields?: unknown
  tokensUsed?: number
  model?: string
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()

    await supabase.from("conversation_messages").insert({
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      tool_calls: params.toolCalls ? JSON.parse(JSON.stringify(params.toolCalls)) : null,
      saved_fields: params.savedFields ? JSON.parse(JSON.stringify(params.savedFields)) : null,
      tokens_used: params.tokensUsed ?? null,
      model: params.model ?? null,
    })
  } catch (err) {
    console.error("[conversation] Failed to save message:", err)
  }
}

export async function completeConversation(
  conversationId: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()

    await supabase
      .from("conversations")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
  } catch (err) {
    console.error("[conversation] Failed to complete conversation:", err)
  }
}

export async function getActivePromptVersion(
  agentType: AgentType,
  namePattern: string
): Promise<{
  id: string
  instructions: string
  model: string
  modelSettings: Record<string, unknown>
} | null> {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("prompt_versions")
      .select("id, instructions, model, model_settings")
      .eq("agent_type", agentType)
      .eq("is_active", true)
      .ilike("name", `%${namePattern}%`)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string
        instructions: string
        model: string
        model_settings: Record<string, unknown> | null
      }>()

    if (error || !data) return null

    return {
      id: data.id,
      instructions: data.instructions,
      model: data.model,
      modelSettings: data.model_settings ?? {},
    }
  } catch (err) {
    console.error("[conversation] Failed to get active prompt version:", err)
    return null
  }
}
