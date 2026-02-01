"use client"

import * as React from "react"

// ============================================================================
// Types
// ============================================================================

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

export type ChatSession = {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

type ChatHistoryContextValue = {
  sessions: ChatSession[]
  activeSessionId: string | null
  setActiveSessionId: (id: string | null) => void
  loadSession: (id: string) => ChatMessage[]
  saveSession: (id: string, messages: ChatMessage[]) => void
  createSession: (firstMessage: string) => string
  deleteSession: (id: string) => void
  rightSidebarOpen: boolean
  toggleRightSidebar: () => void
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "hiremeplz_chat_sessions"
const SIDEBAR_COOKIE = "right_sidebar_state"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

// ============================================================================
// Helpers
// ============================================================================

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function loadFromStorage(): ChatSession[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(sessions: ChatSession[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

// ============================================================================
// Context
// ============================================================================

const ChatHistoryContext = React.createContext<ChatHistoryContextValue | null>(
  null
)

export function ChatHistoryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [sessions, setSessions] = React.useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(
    null
  )
  const [rightSidebarOpen, setRightSidebarOpen] = React.useState(true)
  const [initialized, setInitialized] = React.useState(false)

  // Load from localStorage + cookie on mount
  React.useEffect(() => {
    const loaded = loadFromStorage()
    // Clean up empty sessions on load
    const cleaned = loaded.filter((s) => s.messages.length > 0)
    setSessions(cleaned)
    if (cleaned.length !== loaded.length) {
      saveToStorage(cleaned)
    }

    const match = document.cookie.match(
      new RegExp(`${SIDEBAR_COOKIE}=([^;]+)`)
    )
    if (match) {
      setRightSidebarOpen(match[1] === "true")
    }
    setInitialized(true)
  }, [])

  // Persist sessions whenever they change
  React.useEffect(() => {
    if (initialized) {
      saveToStorage(sessions)
    }
  }, [sessions, initialized])

  const loadSession = React.useCallback(
    (id: string) => {
      const session = sessions.find((s) => s.id === id)
      return session?.messages ?? []
    },
    [sessions]
  )

  const saveSession = React.useCallback(
    (id: string, messages: ChatMessage[]) => {
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === id)
        if (!existing) return prev

        const firstUserMsg = messages.find((m) => m.role === "user")
        const title = firstUserMsg
          ? firstUserMsg.content.slice(0, 50) +
            (firstUserMsg.content.length > 50 ? "..." : "")
          : existing.title

        return prev.map((s) =>
          s.id === id
            ? { ...s, messages, title, updatedAt: new Date().toISOString() }
            : s
        )
      })
    },
    []
  )

  const createSession = React.useCallback((firstMessage: string) => {
    const id = generateId()
    const title =
      firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "")
    const session: ChatSession = {
      id,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(id)
    return id
  }, [])

  const deleteSession = React.useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setActiveSessionId((prev) => (prev === id ? null : prev))
  }, [])

  const toggleRightSidebar = React.useCallback(() => {
    setRightSidebarOpen((prev) => {
      const next = !prev
      document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}`
      return next
    })
  }, [])

  const value = React.useMemo<ChatHistoryContextValue>(
    () => ({
      sessions,
      activeSessionId,
      setActiveSessionId,
      loadSession,
      saveSession,
      createSession,
      deleteSession,
      rightSidebarOpen,
      toggleRightSidebar,
    }),
    [
      sessions,
      activeSessionId,
      loadSession,
      saveSession,
      createSession,
      deleteSession,
      rightSidebarOpen,
      toggleRightSidebar,
    ]
  )

  return (
    <ChatHistoryContext.Provider value={value}>
      {children}
    </ChatHistoryContext.Provider>
  )
}

export function useChatHistory() {
  const context = React.useContext(ChatHistoryContext)
  if (!context) {
    throw new Error("useChatHistory must be used within a ChatHistoryProvider")
  }
  return context
}
