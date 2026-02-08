"use client";

import { cn } from "@/lib/utils";
import { BotIcon, UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { HTMLAttributes, PropsWithChildren } from "react";

// ============================================================================
// Types
// ============================================================================

export type MessageRole = "user" | "assistant";

// ============================================================================
// Components
// ============================================================================

export type MessageProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    from: MessageRole;
    avatarUrl?: string | null;
    avatarAlt?: string | null;
    avatarFallback?: string | null;
    hideAvatar?: boolean;
  }
>;

export function Message({
  from,
  avatarUrl,
  avatarAlt,
  avatarFallback,
  hideAvatar = false,
  children,
  className,
  ...props
}: MessageProps) {
  const isUser = from === "user";
  const shouldShowUserAvatar = isUser && !!avatarUrl && !hideAvatar;

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
      {...props}
    >
      {!hideAvatar && (
        shouldShowUserAvatar ? (
          <Avatar className="size-8">
            <AvatarImage src={avatarUrl ?? undefined} alt={avatarAlt ?? ""} />
            <AvatarFallback>{avatarFallback ?? "?"}</AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isUser ? (
              <UserIcon className="size-4" />
            ) : (
              <BotIcon className="size-4" />
            )}
          </div>
        )
      )}
      <div
        className={cn(
          "flex flex-col gap-1 min-w-0",
          hideAvatar ? "max-w-full" : "max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export function MessageContent({
  children,
  className,
  ...props
}: MessageContentProps) {
  return (
    <div className={cn("flex flex-col gap-2 min-w-0 w-full", className)} {...props}>
      {children}
    </div>
  );
}

export type MessageBubbleProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    variant?: "user" | "assistant";
  }
>;

export function MessageBubble({
  variant = "assistant",
  children,
  className,
  ...props
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
        variant === "user"
          ? "bg-accent text-accent-foreground"
          : "bg-muted text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type MessageResponseProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement>
>;

export function MessageResponse({
  children,
  className,
  ...props
}: MessageResponseProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "rounded-[calc(var(--radius)+0.35rem)] rounded-bl-[calc(var(--radius)-0.25rem)] bg-muted px-4 py-2.5",
        "[&>p]:my-0 [&>p:not(:last-child)]:mb-2",
        "[&>ul]:my-1 [&>ol]:my-1",
        "[&>ul>li]:my-0.5 [&>ol>li]:my-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type MessageTimestampProps = HTMLAttributes<HTMLSpanElement> & {
  time: Date;
};

export function MessageTimestamp({
  time,
  className,
  ...props
}: MessageTimestampProps) {
  const formatted = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <span
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    >
      {formatted}
    </span>
  );
}

export type MessageLoadingProps = HTMLAttributes<HTMLDivElement>;

export function MessageLoading({ className, ...props }: MessageLoadingProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-[calc(var(--radius)+0.35rem)] rounded-bl-[calc(var(--radius)-0.25rem)] bg-muted px-4 py-3",
        className
      )}
      {...props}
    >
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50" />
    </div>
  );
}

export type MessageErrorProps = HTMLAttributes<HTMLDivElement> & {
  error?: string;
  onRetry?: () => void;
};

export function MessageError({
  error = "Something went wrong. Please try again.",
  onRetry,
  className,
  ...props
}: MessageErrorProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius)] border border-destructive/50 bg-destructive/10 p-3 text-sm",
        className
      )}
      {...props}
    >
      <p className="text-destructive">{error}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start text-xs font-medium text-destructive underline underline-offset-2 hover:no-underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
