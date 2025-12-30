"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "../auth/session-provider"
import { ThemeToggle } from "@/components/theme-toggle"

type OnboardingLayoutProps = {
  children: ReactNode
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const { session, isLoading } = useSession()
  const router = useRouter()
  const [isGuardChecked, setIsGuardChecked] = useState(false)

  useEffect(() => {
    async function guardOnboarding() {
      if (isLoading) {
        return
      }

      if (!session) {
        router.replace("/login")
        return
      }

      try {
        const response = await fetch("/api/v1/me", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          setIsGuardChecked(true)
          return
        }

        const payload = await response.json()
        const completeness =
          typeof payload.profile_completeness_score === "number"
            ? payload.profile_completeness_score
            : 0

        if (completeness >= 0.8) {
          router.replace("/overview")
          return
        }
      } finally {
        setIsGuardChecked(true)
      }
    }

    guardOnboarding()
  }, [isLoading, session, router])

  if (!isGuardChecked) {
    return null
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <main className="w-full max-w-3xl rounded-xl border bg-card p-6 shadow-sm">
        {children}
      </main>
    </div>
  )
}
