"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
  useCallback,
  type HTMLAttributes,
  type PropsWithChildren,
} from "react";

// ============================================================================
// Context
// ============================================================================

type ConversationContextValue = {
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  scrollToBottom: () => void;
};

const ConversationContext = createContext<ConversationContextValue | null>(null);

const useConversation = () => {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error("useConversation must be used within a Conversation");
  }
  return ctx;
};

// ============================================================================
// Components
// ============================================================================

export type ConversationProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement>
>;

export function Conversation({
  children,
  className,
  ...props
}: ConversationProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const checkIfAtBottom = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const threshold = 100;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkIfAtBottom);
    checkIfAtBottom();

    return () => {
      el.removeEventListener("scroll", checkIfAtBottom);
    };
  }, [checkIfAtBottom]);

  // Auto-scroll when new content is added and user is at bottom
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  });

  return (
    <ConversationContext.Provider
      value={{ scrollAreaRef, isAtBottom, scrollToBottom }}
    >
      <div
        ref={scrollAreaRef}
        className={cn(
          "relative flex-1 overflow-y-auto scroll-smooth scrollbar-thin",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ConversationContext.Provider>
  );
}

export type ConversationContentProps = HTMLAttributes<HTMLDivElement>;

export function ConversationContent({
  children,
  className,
  ...props
}: ConversationContentProps) {
  return (
    <div
      className={cn("flex flex-col gap-4 p-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export type ConversationScrollButtonProps = HTMLAttributes<HTMLButtonElement>;

export function ConversationScrollButton({
  className,
  ...props
}: ConversationScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useConversation();

  if (isAtBottom) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={scrollToBottom}
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 z-10",
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
        "bg-background/95 border shadow-md backdrop-blur-sm",
        "text-xs font-medium text-muted-foreground",
        "hover:bg-accent hover:text-accent-foreground",
        "transition-all duration-200",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-3.5" />
      <span>Scroll to bottom</span>
    </button>
  );
}

export type ConversationEmptyProps = HTMLAttributes<HTMLDivElement>;

export function ConversationEmpty({
  children,
  className,
  ...props
}: ConversationEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-center p-8 text-center",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
