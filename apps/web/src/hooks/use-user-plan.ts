import * as React from "react"

import { useSession } from "@/app/auth/session-provider"

type UserPlan = "trial" | "solo_pro" | "team_pro" | (string & {})

type UseUserPlanResult = {
  plan: UserPlan | null
  displayName: string | null
  email: string | null
  isLoading: boolean
}

export function useUserPlan(): UseUserPlanResult {
  const { session, isLoading: isSessionLoading } = useSession()
  const [plan, setPlan] = React.useState<UserPlan | null>(null)
  const [displayName, setDisplayName] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState<string | null>(null)
  const [isPlanLoading, setIsPlanLoading] = React.useState(false)

  React.useEffect(() => {
    if (isSessionLoading) return
    if (!session?.user?.id) {
      setPlan(null)
      setDisplayName(null)
      setEmail(null)
      setIsPlanLoading(false)
      return
    }

    let isMounted = true
    const controller = new AbortController()

    async function loadPlan() {
      const accessToken = session?.access_token
      if (!accessToken) return

      setIsPlanLoading(true)
      try {
        const res = await fetch("/api/v1/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        })

        if (!isMounted) return

        if (!res.ok) {
          setPlan(null)
          setDisplayName(null)
          setEmail(null)
          setIsPlanLoading(false)
          return
        }

        const body = (await res.json()) as {
          plan?: UserPlan | null
          display_name?: string | null
          email?: string | null
        }

        setPlan(body.plan ?? null)
        setDisplayName(body.display_name ?? null)
        setEmail(body.email ?? null)
        setIsPlanLoading(false)
      } catch {
        if (!isMounted) return
        setPlan(null)
        setDisplayName(null)
        setEmail(null)
        setIsPlanLoading(false)
        return
      }
    }

    loadPlan()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [isSessionLoading, session?.user?.id, session?.access_token])

  return { plan, displayName, email, isLoading: isSessionLoading || isPlanLoading }
}
