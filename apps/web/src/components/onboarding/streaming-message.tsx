"use client"

import {
  Message,
  MessageContent,
} from "@/components/ai-elements/message"

type StreamingMessageProps = {
  content: string
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  if (!content) return null

  return (
    <Message from="assistant" hideAvatar>
      <MessageContent>
        <div className="max-w-none whitespace-pre-wrap text-base text-foreground">
          {content}
          <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-foreground/50" />
        </div>
      </MessageContent>
    </Message>
  )
}
