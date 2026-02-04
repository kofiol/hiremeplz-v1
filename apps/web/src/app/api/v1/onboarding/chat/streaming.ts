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
  const textStream = result.toTextStream({
    compatibleWithNodeStreams: false,
  })
  for await (const chunk of textStream) {
    text += chunk
    emit({ type: "text", content: chunk })
  }
  await result.completed
  return text
}
