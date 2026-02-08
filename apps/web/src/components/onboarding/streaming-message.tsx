"use client"

import {
  Message,
  MessageContent,
} from "@/components/ai-elements/message"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type StreamingMessageProps = {
  content: string
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  if (!content) return null

  return (
    <Message from="assistant" hideAvatar>
      <MessageContent>
        <div className="prose prose-base max-w-none text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
          <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-foreground/50" />
        </div>
      </MessageContent>
    </Message>
  )
}
