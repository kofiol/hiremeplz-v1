"use client"

import { useState, useCallback } from "react"
import { AnimatePresence } from "framer-motion"
import { useSession } from "@/app/auth/session-provider"
import { useOnboardingChat } from "@/hooks/use-onboarding-chat"
import { store } from "@/lib/state/store"
import { setCollectedData } from "@/lib/state/onboardingSlice"
import { WelcomeScreen, type OnboardingMode } from "./welcome-screen"
import { ChatPanel } from "./chat-panel"
import { FormPanel } from "./form-panel"
import { ProgressSidebar } from "./progress-sidebar"
import { LinkedinDialog } from "./linkedin-dialog"
import type { CollectedData } from "@/lib/onboarding/schema"

export function OnboardingShell() {
  const { session } = useSession()
  const accessToken = session?.access_token ?? null
  const userMetadata = session?.user?.user_metadata

  // Name state — initialized from auth metadata (Google OAuth fills this)
  const authFullName = userMetadata?.full_name ?? userMetadata?.name ?? null
  const [collectedName, setCollectedName] = useState<string | null>(authFullName)

  // Mode selection state
  const [mode, setMode] = useState<OnboardingMode | null>(null)

  const handleDataUpdate = useCallback((data: CollectedData) => {
    store.dispatch(setCollectedData(data))
  }, [])

  const chat = useOnboardingChat({
    accessToken,
    userMetadata: {
      fullName: collectedName ?? authFullName,
      planDisplayName: collectedName ?? authFullName,
    },
    onDataUpdate: handleDataUpdate,
  })

  // LinkedIn dialog state
  const [linkedinDialogOpen, setLinkedinDialogOpen] = useState(false)

  const handleLinkedinSubmit = useCallback(
    (url: string) => {
      setLinkedinDialogOpen(false)
      chat.sendMessage(`My LinkedIn profile: ${url}`)
    },
    [chat]
  )

  const handleNameSubmit = useCallback((name: string) => {
    setCollectedName(name)
  }, [])

  const handleModeSelect = useCallback((selectedMode: OnboardingMode) => {
    setMode(selectedMode)
    if (selectedMode === "chatbot") {
      chat.startConversation(collectedName ?? undefined)
    }
  }, [chat, collectedName])

  const handleBack = useCallback(() => {
    setMode(null)
    chat.reset()
  }, [chat])

  // Restoring progress - show nothing while loading
  if (chat.isRestoring) return null

  // Determine if we should show the welcome screen
  const showWelcome = mode === null && !chat.hasStarted

  return (
    <>
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <WelcomeScreen
            fullName={collectedName}
            isLoading={chat.isLoading}
            onNameSubmit={handleNameSubmit}
            onStart={handleModeSelect}
          />
        ) : mode === "form" ? (
          <FormPanel
            accessToken={accessToken}
            firstName={collectedName?.split(" ")[0] ?? "there"}
            fullName={collectedName}
            onBack={handleBack}
          />
        ) : (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Sidebar - hidden on mobile */}
            <div className="hidden lg:block">
              <ProgressSidebar collectedData={chat.collectedData} />
            </div>

            {/* Chat panel */}
            <ChatPanel
              messages={chat.messages}
              collectedData={chat.collectedData}
              inputHint={chat.inputHint}
              isLoading={chat.isLoading}
              isStreaming={chat.isStreaming}
              streamingContent={chat.streamingContent}
              streamThinkingDuration={chat.streamThinkingDuration}
              error={chat.error}
              activeToolCall={chat.activeToolCall}
              toolCallElapsed={chat.toolCallElapsed}
              isReasoning={chat.isReasoning}
              reasoningContent={chat.reasoningContent}
              reasoningDuration={chat.reasoningDuration}
              reasoningPhase={chat.reasoningPhase}
              accessToken={accessToken}
              onSendMessage={chat.sendMessage}
              onRevertToMessage={chat.revertToMessage}
              onStopGeneration={chat.stopGeneration}
              onStartConversation={chat.startConversation}
              setError={chat.setError}
              onLinkedinClick={() => setLinkedinDialogOpen(true)}
              linkedinPopupEnabled={true}
              onBack={handleBack}
            />
          </div>
        )}
      </AnimatePresence>

      <LinkedinDialog
        open={linkedinDialogOpen}
        onOpenChange={setLinkedinDialogOpen}
        onSubmit={handleLinkedinSubmit}
      />
    </>
  )
}
