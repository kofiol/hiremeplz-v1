"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import {
  Message,
  MessageContent,
  MessageBubble,
} from "@/components/ai-elements/message"
import { Reasoning } from "@/components/ui/reasoning"
import { ProfileAnalysisResults, ProfileScoreCard } from "@/components/ui/score-indicator"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Check,
  CheckCircle,
  OctagonX,
  Pencil,
  X,
  XCircle,
} from "lucide-react"
import type { ChatMessage as ChatMessageType } from "@/lib/onboarding/schema"
import { SavedFieldsCard } from "./saved-fields-card"

type ChatMessageProps = {
  message: ChatMessageType
  isEditable: boolean
  onEdit: (messageId: string, newText: string) => void
  isEditDisabled: boolean
}

export function ChatMessageItem({
  message,
  isEditable,
  onEdit,
  isEditDisabled,
}: ChatMessageProps) {
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")

  useEffect(() => {
    if (!isEditing) return
    editTextareaRef.current?.focus()
    editTextareaRef.current?.setSelectionRange(
      editTextareaRef.current.value.length,
      editTextareaRef.current.value.length
    )
  }, [isEditing])

  const beginEdit = useCallback(() => {
    setIsEditing(true)
    setEditText(message.content)
  }, [message.content])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditText("")
  }, [])

  const saveEdit = useCallback(() => {
    if (!editText.trim()) return
    onEdit(message.id, editText.trim())
    setIsEditing(false)
    setEditText("")
  }, [editText, message.id, onEdit])

  return (
    <Message from={message.role} hideAvatar>
      <MessageContent>
        {message.role === "user" ? (
          <div className="relative max-w-full">
            {isEditing ? (
              <div className="w-full max-w-[80%]">
                <textarea
                  ref={editTextareaRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-base leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  rows={Math.min(6, Math.max(2, editText.split("\n").length))}
                  disabled={isEditDisabled}
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={isEditDisabled}
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveEdit}
                    disabled={isEditDisabled || !editText.trim()}
                  >
                    <Check className="size-4" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="group relative flex items-center gap-2">
                {isEditable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={beginEdit}
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
                <MessageBubble variant="user" className="text-base">
                  {message.content}
                </MessageBubble>
              </div>
            )}
          </div>
        ) : message.toolCall ? (
          <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
            {message.toolCall.status === "completed" ? (
              <CheckCircle className="size-3.5 text-success" />
            ) : message.toolCall.status === "aborted" ? (
              <OctagonX className="size-3.5 text-orange-500" />
            ) : (
              <XCircle className="size-3.5 text-destructive" />
            )}
            <span>
              {message.toolCall.status === "aborted" ? "Stopped" : "Fetched"} LinkedIn profile
              {message.toolCall.elapsed ? ` (${message.toolCall.elapsed}s)` : ""}
            </span>
          </div>
        ) : message.profileAnalysis ? (
          <div className="space-y-4">
            {message.reasoning && (
              <Reasoning
                isStreaming={false}
                content={message.reasoning.content}
                duration={message.reasoning.duration}
              />
            )}
            {message.profileAnalysis.categories ? (
              <>
                <ProfileAnalysisResults analysis={message.profileAnalysis} />
                <div className="prose prose-base prose-invert max-w-none text-foreground prose-headings:text-white prose-strong:text-white">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.profileAnalysis.detailedFeedback}
                  </ReactMarkdown>
                </div>
              </>
            ) : (
              <>
                {message.profileAnalysis.score != null && (
                  <ProfileScoreCard
                    score={message.profileAnalysis.score}
                    title={message.profileAnalysis.title ?? "Profile Analysis"}
                    summary={message.profileAnalysis.summary ?? ""}
                  />
                )}
                <div className="prose prose-base prose-invert max-w-none text-foreground prose-headings:text-white prose-strong:text-white">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content || message.profileAnalysis.analysis || ""}
                  </ReactMarkdown>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {message.content && (
              <div className="prose prose-base max-w-none text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
            {message.savedFields && message.savedFields.length > 0 && (
              <SavedFieldsCard fields={message.savedFields} />
            )}
          </div>
        )}
      </MessageContent>
    </Message>
  )
}
