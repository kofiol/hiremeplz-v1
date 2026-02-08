"use client"

import {
  Message,
  MessageContent,
  MessageBubble,
} from "@/components/ai-elements/message"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Reasoning } from "@/components/ui/reasoning"
import { ProfileAnalysisResults, ProfileScoreCard } from "@/components/ui/score-indicator"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  CheckCircle,
  OctagonX,
  Undo2,
  XCircle,
} from "lucide-react"
import type { ChatMessage as ChatMessageType } from "@/lib/onboarding/schema"
import { SavedFieldsCard } from "./saved-fields-card"

type ChatMessageProps = {
  message: ChatMessageType
  isEditable: boolean
  onRevert: (messageId: string) => void
}

export function ChatMessageItem({
  message,
  isEditable,
  onRevert,
}: ChatMessageProps) {
  return (
    <Message from={message.role} hideAvatar>
      <MessageContent>
        {message.role === "user" ? (
          <div className="relative max-w-full">
            <div className="group relative flex items-center gap-2">
              {isEditable && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Revert conversation to this point"
                      className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Undo2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revert conversation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all messages and saved profile data after this point. You can&apos;t undo this action.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onRevert(message.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Revert
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <MessageBubble variant="user" className="text-base">
                {message.content}
              </MessageBubble>
            </div>
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
            {message.progress && (
              <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-accent px-3 py-1.5 text-sm text-accent-foreground w-fit">
                <span>{message.progress.step}/{message.progress.total}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: message.progress.total }, (_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-3 rounded-full transition-colors ${
                        i < message.progress!.step ? "bg-primary" : "bg-muted-foreground/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
            {message.thinkingDuration != null && message.thinkingDuration > 0 && (
              <Reasoning
                isStreaming={false}
                content=""
                duration={message.thinkingDuration}
                phase="thinking"
              />
            )}
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
