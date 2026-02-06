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

  const firstName =
    userMetadata?.full_name?.split(" ")[0] ??
    userMetadata?.name?.split(" ")[0] ??
    "there"

  // Mode selection state
  const [mode, setMode] = useState<OnboardingMode | null>(null)

  const handleDataUpdate = useCallback((data: CollectedData) => {
    store.dispatch(setCollectedData(data))
  }, [])

  const chat = useOnboardingChat({
    accessToken,
    userMetadata: {
      fullName: userMetadata?.full_name ?? userMetadata?.name ?? null,
      planDisplayName: userMetadata?.full_name ?? userMetadata?.name ?? null,
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

  const handleModeSelect = useCallback((selectedMode: OnboardingMode) => {
    setMode(selectedMode)
    if (selectedMode === "chatbot") {
      chat.startConversation()
    }
  }, [chat])

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
            firstName={firstName}
            isLoading={chat.isLoading}
            onStart={handleModeSelect}
          />
        ) : mode === "form" ? (
          <FormPanel
            accessToken={accessToken}
            firstName={firstName}
            fullName={userMetadata?.full_name ?? userMetadata?.name ?? null}
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
              error={chat.error}
              activeToolCall={chat.activeToolCall}
              toolCallElapsed={chat.toolCallElapsed}
              isReasoning={chat.isReasoning}
              reasoningContent={chat.reasoningContent}
              reasoningDuration={chat.reasoningDuration}
              reasoningPhase={chat.reasoningPhase}
              accessToken={accessToken}
              onSendMessage={chat.sendMessage}
              onEditMessage={chat.editMessage}
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
