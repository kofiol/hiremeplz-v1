"use client"

import { useState, useCallback } from "react"
import type { CollectedData, ChatMessage } from "@/lib/onboarding/schema"
import { INITIAL_COLLECTED_DATA } from "@/lib/onboarding/schema"

type ProgressState = {
  messages: ChatMessage[]
  collectedData: CollectedData
  hasStarted: boolean
}

type UseOnboardingProgressReturn = {
  isRestoring: boolean
  loadProgress: (
    accessToken: string,
    userMetadata?: {
      fullName?: string | null
      planDisplayName?: string | null
    }
  ) => Promise<ProgressState | null>
  saveProgress: (
    messages: ChatMessage[],
    collectedData: CollectedData,
    hasStarted: boolean,
    accessToken: string
  ) => Promise<void>
}

export function useOnboardingProgress(): UseOnboardingProgressReturn {
  const [isRestoring, setIsRestoring] = useState(true)

  const loadProgress = useCallback(
    async (
      accessToken: string,
      userMetadata?: {
        fullName?: string | null
        planDisplayName?: string | null
      }
    ): Promise<ProgressState | null> => {
      try {
        const response = await fetch("/api/v1/onboarding/progress", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!response.ok) return null

        const data = await response.json()

        if (data.onboardingProgress) {
          const {
            messages: savedMessages,
            collectedData: savedData,
            hasStarted: savedHasStarted,
          } = data.onboardingProgress

          // Pre-fill name from auth metadata if not already set
          const nameFromAuth = userMetadata?.planDisplayName ?? userMetadata?.fullName ?? null

          const collectedData: CollectedData = {
            ...INITIAL_COLLECTED_DATA,
            ...savedData,
            fullName: savedData?.fullName || nameFromAuth,
            teamMode: savedData?.teamMode || "solo",
          }

          return {
            messages: savedMessages ?? [],
            collectedData,
            hasStarted: savedHasStarted ?? false,
          }
        }

        // No saved progress — just pre-fill name
        const nameFromAuth = userMetadata?.planDisplayName ?? userMetadata?.fullName ?? null
        if (nameFromAuth) {
          return {
            messages: [],
            collectedData: { ...INITIAL_COLLECTED_DATA, fullName: nameFromAuth },
            hasStarted: false,
          }
        }

        return null
      } catch (err) {
        console.error("Failed to load progress:", err)
        return null
      } finally {
        setIsRestoring(false)
      }
    },
    []
  )

  const saveProgress = useCallback(
    async (
      messages: ChatMessage[],
      collectedData: CollectedData,
      hasStarted: boolean,
      accessToken: string
    ) => {
      try {
        await fetch("/api/v1/onboarding/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ messages, collectedData, hasStarted }),
        })
      } catch (err) {
        console.error("Failed to save progress:", err)
      }
    },
    []
  )

  return { isRestoring, loadProgress, saveProgress }
}
