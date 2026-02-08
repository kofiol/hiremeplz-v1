"use client"

import * as React from "react"
import { PanelRight, Plus, MessageSquare, Trash2 } from "lucide-react"
import { useChatHistory } from "@/lib/chat-history-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ============================================================================
// Constants
// ============================================================================

const SIDEBAR_WIDTH = "14rem"
const SIDEBAR_WIDTH_ICON = "2.75rem"

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// ============================================================================
// Component
// ============================================================================

export function ChatHistorySidebar() {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    deleteSession,
    rightSidebarOpen,
    toggleRightSidebar,
  } = useChatHistory()

  const isCollapsed = !rightSidebarOpen

  const handleNewChat = () => {
    setActiveSessionId(null)
  }

  const handleSelectChat = (id: string) => {
    setActiveSessionId(id)
  }

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteSession(id)
  }

  const visibleSessions = React.useMemo(
    () =>
      sessions
        .filter((s) => s.messages.length > 0)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
    [sessions]
  )

  return (
    <div
      className="hidden md:block text-sidebar-foreground shrink-0"
      data-state={rightSidebarOpen ? "expanded" : "collapsed"}
      data-side="right"
    >
      {/* Gap element — reserves space in the flex layout */}
      <div
        className="transition-[width] duration-200 ease-linear"
        style={{
          width: isCollapsed ? SIDEBAR_WIDTH_ICON : SIDEBAR_WIDTH,
        }}
      />

      {/* Fixed sidebar panel */}
      <div
        className="fixed inset-y-0 right-0 z-10 hidden h-svh md:flex flex-col border-l bg-sidebar transition-[width] duration-200 ease-linear overflow-hidden"
        style={{
          width: isCollapsed ? SIDEBAR_WIDTH_ICON : SIDEBAR_WIDTH,
        }}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-1 p-2 shrink-0",
            isCollapsed && "flex-col"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRightSidebar}
                className="size-7 shrink-0"
              >
                <PanelRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isCollapsed ? "Expand history" : "Collapse history"}
            </TooltipContent>
          </Tooltip>

          {!isCollapsed && (
            <span className="text-sm font-medium truncate flex-1">
              History
            </span>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                className="size-7 shrink-0"
              >
                <Plus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">New chat</TooltipContent>
          </Tooltip>
        </div>

        {/* Chat list — scrollable, only visible when expanded */}
        {!isCollapsed && (
          <ScrollArea className="flex-1 min-h-0 w-full overflow-hidden px-2 pb-2">
            {visibleSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs text-center px-2">
                <MessageSquare className="size-8 mb-2 opacity-40" />
                <p>No chats yet</p>
                <p className="mt-1 opacity-60">
                  Start a conversation to see it here
                </p>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-0.5 overflow-hidden">
                {visibleSessions.map((session) => (
                  <Tooltip key={session.id}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => handleSelectChat(session.id)}
                        className={cn(
                          "group/item flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent cursor-pointer overflow-hidden",
                          activeSessionId === session.id &&
                            "bg-sidebar-accent font-medium"
                        )}
                      >
                        <div className="w-0 flex-1">
                          <p className="truncate text-sm leading-tight">
                            {session.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground mt-0.5">
                            {formatRelativeTime(session.updatedAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteChat(e, session.id)}
                          className="shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-64">
                      {session.title}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
