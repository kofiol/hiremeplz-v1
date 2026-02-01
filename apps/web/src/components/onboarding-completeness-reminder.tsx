"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { useSession } from "@/app/auth/session-provider"

export function OnboardingCompletenessReminder() {
  const { session, isLoading } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const hasRunRef = React.useRef(false)

  React.useEffect(() => {
    if (isLoading) return
    const token = session?.access_token
    if (!token) return
    // Don't show reminder on onboarding pages or overview (where onboarding is now integrated)
    if (pathname.startsWith("/onboarding") || pathname.startsWith("/overview")) return
    if (hasRunRef.current) return
    hasRunRef.current = true

    let isMounted = true

    async function run() {
      try {
        const response = await fetch("/api/v1/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) return
        const payload = await response.json()
        const score =
          typeof payload.profile_completeness_score === "number"
            ? payload.profile_completeness_score
            : 0

        if (!isMounted) return

        if (score < 1) {
          toast.info("Finish onboarding for a better experience.", {
            id: "onboarding-reminder",
            duration: Infinity,
            closeButton: true,
            action: {
              label: "Continue",
              onClick: () => router.push("/overview"),
            },
          })
        } else {
          toast.dismiss("onboarding-reminder")
        }
      } catch {
        return
      }
    }

    run()

    return () => {
      isMounted = false
    }
  }, [isLoading, pathname, router, session?.access_token])

  return null
}
