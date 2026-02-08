import { Agent, run } from "@openai/agents"

// ============================================================================
// SSE Streaming Helpers
// ============================================================================

export type SSEEmitter = (event: object) => void

export function createSSEResponse(
  handler: (emit: SSEEmitter) => Promise<void>
): Response {
  const encoder = new TextEncoder()

  const readableStream = new ReadableStream({
    async start(controller) {
      const emit: SSEEmitter = (event) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        )
      }

      try {
        await handler(emit)
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      } catch (error) {
        console.error("Streaming error:", error)
        emit({
          type: "error",
          message:
            error instanceof Error ? error.message : "Streaming failed",
        })
        controller.close()
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

export async function streamAgentText(
  agent: Agent,
  prompt: string,
  emit: SSEEmitter
): Promise<string> {
  let text = ""
  const result = await run(agent, prompt, { stream: true })

  // Use full SDK event iterator for richer events
  for await (const event of result) {
    if (event.type === "raw_model_stream_event") {
      const delta = event.data
      // Extract text deltas from the raw model stream
      if (delta.type === "output_text_delta") {
        const chunk = delta.delta
        text += chunk
        emit({ type: "text", content: chunk })
      }
    } else if (event.type === "run_item_stream_event") {
      // Tool call output events (tool execution completed)
      if (event.item?.type === "tool_call_output_item" && event.name === "tool_output") {
        const rawItem = event.item.rawItem
        const toolName = rawItem && "name" in rawItem ? (rawItem as { name: string }).name : "unknown"
        emit({
          type: "tool_event",
          toolName,
          status: "completed",
        })
      }
    } else if (event.type === "agent_updated_stream_event") {
      // Agent handoff events (future use)
      emit({
        type: "agent_updated",
        agentName: event.agent?.name ?? "unknown",
      })
    }
  }

  await result.completed
  return text
}
