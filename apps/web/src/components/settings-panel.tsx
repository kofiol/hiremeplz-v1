"use client"

import * as React from "react"
import { toast } from "sonner"
import { SlidersHorizontal, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useSession } from "@/app/auth/session-provider"

type SettingsSectionKey = "profile" | "job_search"

type SettingsResponse = {
  profile: {
    display_name: string | null
    timezone: string | null
  }
  preferences: {
    currency: string | null
    hourly_min: number | null
    hourly_max: number | null
    fixed_budget_min: number | null
    project_types: string[] | null
    tightness: number | null
    platforms: ("upwork" | "linkedin")[] | null
  }
  agent: {
    time_zones: string[]
    remote_only: boolean
  }
}

const USER_PLAN_REFRESH_EVENT = "user-plan:refresh"

const sections: { key: SettingsSectionKey; label: string; icon: React.ElementType }[] =
  [
    { key: "profile", label: "Profile", icon: UserRound },
    { key: "job_search", label: "Job Search", icon: SlidersHorizontal },
  ]

export function SettingsPanel({
  enabled = true,
  showCancel = false,
  onCancel,
  onSaveSuccess,
}: {
  enabled?: boolean
  showCancel?: boolean
  onCancel?: () => void
  onSaveSuccess?: () => void
}) {
  const { session } = useSession()

  const [activeSection, setActiveSection] =
    React.useState<SettingsSectionKey>("profile")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const [displayName, setDisplayName] = React.useState("")
  const [currency, setCurrency] = React.useState("USD")
  const [tightness, setTightness] = React.useState(3)
  const [remoteOnly, setRemoteOnly] = React.useState(true)
  const [timeZonesText, setTimeZonesText] = React.useState("")
  const [platforms, setPlatforms] = React.useState<Set<"upwork" | "linkedin">>(
    () => new Set(["upwork", "linkedin"]),
  )
  const [projectTypes, setProjectTypes] = React.useState<
    Set<"short_gig" | "medium_project">
  >(() => new Set(["short_gig", "medium_project"]))
  const [hourlyMin, setHourlyMin] = React.useState<string>("")
  const [hourlyMax, setHourlyMax] = React.useState<string>("")
  const [fixedBudgetMin, setFixedBudgetMin] = React.useState<string>("")

  const canLoad = Boolean(session?.access_token)

  const loadSettings = React.useCallback(async () => {
    if (!session?.access_token) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/v1/settings", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        throw new Error("Failed to load settings")
      }

      const body = (await res.json()) as SettingsResponse

      setDisplayName(body.profile.display_name ?? "")
      setCurrency(body.preferences.currency ?? "USD")
      setTightness(
        typeof body.preferences.tightness === "number" ? body.preferences.tightness : 3,
      )
      setRemoteOnly(Boolean(body.agent.remote_only))
      setTimeZonesText((body.agent.time_zones ?? []).join(", "))

      setPlatforms(
        new Set(
          (body.preferences.platforms ?? ["upwork", "linkedin"]).filter(
            (p) => p === "upwork" || p === "linkedin",
          ),
        ),
      )

      const types = (body.preferences.project_types ?? ["short_gig", "medium_project"])
        .filter((t) => t === "short_gig" || t === "medium_project") as (
        | "short_gig"
        | "medium_project"
      )[]
      setProjectTypes(new Set(types))

      setHourlyMin(
        typeof body.preferences.hourly_min === "number"
          ? String(body.preferences.hourly_min)
          : "",
      )
      setHourlyMax(
        typeof body.preferences.hourly_max === "number"
          ? String(body.preferences.hourly_max)
          : "",
      )
      setFixedBudgetMin(
        typeof body.preferences.fixed_budget_min === "number"
          ? String(body.preferences.fixed_budget_min)
          : "",
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load settings")
    } finally {
      setIsLoading(false)
    }
  }, [session?.access_token])

  React.useEffect(() => {
    if (!enabled) return
    if (!canLoad) return
    loadSettings()
  }, [canLoad, enabled, loadSettings])

  const timeZones = React.useMemo(() => {
    return timeZonesText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  }, [timeZonesText])

  const payload = React.useMemo(() => {
    const hourlyMinNumber = hourlyMin.trim().length > 0 ? Number(hourlyMin) : null
    const hourlyMaxNumber = hourlyMax.trim().length > 0 ? Number(hourlyMax) : null
    const fixedBudgetMinNumber =
      fixedBudgetMin.trim().length > 0 ? Number(fixedBudgetMin) : null

    return {
      profile: {
        displayName: displayName.trim().length > 0 ? displayName.trim() : null,
      },
      preferences: {
        currency,
        platforms: Array.from(platforms),
        tightness,
        projectTypes: Array.from(projectTypes),
        hourlyMin: Number.isFinite(hourlyMinNumber) ? hourlyMinNumber : null,
        hourlyMax: Number.isFinite(hourlyMaxNumber) ? hourlyMaxNumber : null,
        fixedBudgetMin: Number.isFinite(fixedBudgetMinNumber) ? fixedBudgetMinNumber : null,
      },
      agent: {
        timeZones,
        remoteOnly,
      },
    }
  }, [
    currency,
    displayName,
    fixedBudgetMin,
    hourlyMax,
    hourlyMin,
    platforms,
    projectTypes,
    remoteOnly,
    tightness,
    timeZones,
  ])

  async function handleSave() {
    if (!session?.access_token) return
    if (isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null)
        let message = "Failed to save settings"

        if (body && typeof body === "object" && "error" in body) {
          const errorValue = (body as { error?: unknown }).error
          if (typeof errorValue === "string") {
            message = errorValue
          } else if (errorValue && typeof errorValue === "object" && "message" in errorValue) {
            const errorMessage = (errorValue as { message?: unknown }).message
            if (typeof errorMessage === "string") {
              message = errorMessage
            }
          }
        }
        throw new Error(message)
      }

      toast.success("Settings saved")
      window.dispatchEvent(new Event(USER_PLAN_REFRESH_EVENT))
      onSaveSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Settings</h1>
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.key
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={
                  isActive
                    ? "bg-accent text-accent-foreground flex w-full items-center gap-2 rounded-md px-3 py-2 text-base font-medium"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-3 py-2 text-base"
                }
              >
                <Icon className="size-4" />
                <span className="truncate">{section.label}</span>
              </button>
            )
          })}
        </aside>

        <div className="space-y-6">
          {activeSection === "profile" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="settings-display-name">Display name</Label>
                <Input
                  id="settings-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Doe"
                  disabled={isLoading || !canLoad}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="settings-currency">Currency</Label>
                <Input
                  id="settings-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="USD"
                  disabled={isLoading || !canLoad}
                />
                <p className="text-muted-foreground text-xs">
                  Three-letter code (e.g. USD, EUR).
                </p>
              </div>
            </div>
          )}

          {activeSection === "job_search" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Platforms</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["upwork", "linkedin"] as const).map((platform) => (
                    <div
                      key={platform}
                      role="button"
                      tabIndex={isLoading || !canLoad ? -1 : 0}
                      aria-disabled={isLoading || !canLoad}
                      onClick={() => {
                        if (isLoading || !canLoad) return
                        const next = new Set(platforms)
                        if (next.has(platform)) next.delete(platform)
                        else next.add(platform)
                        setPlatforms(next)
                      }}
                      onKeyDown={(e) => {
                        if (isLoading || !canLoad) return
                        if (e.key !== "Enter" && e.key !== " ") return
                        e.preventDefault()
                        const next = new Set(platforms)
                        if (next.has(platform)) next.delete(platform)
                        else next.add(platform)
                        setPlatforms(next)
                      }}
                      className={`border-input hover:bg-accent/40 flex items-center justify-between rounded-md border px-3 py-2 text-sm ${isLoading || !canLoad ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <span className="capitalize">{platform}</span>
                      <Checkbox
                        checked={platforms.has(platform)}
                        disabled={isLoading || !canLoad}
                        onCheckedChange={() => {
                          const next = new Set(platforms)
                          if (next.has(platform)) next.delete(platform)
                          else next.add(platform)
                          setPlatforms(next)
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Job search tightness</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTightness(value)}
                      className={
                        value === tightness
                          ? "bg-primary text-primary-foreground size-9 rounded-md text-sm font-medium"
                          : "border-input hover:bg-accent/40 size-9 rounded-md border text-sm"
                      }
                      disabled={isLoading || !canLoad}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs">1 = broad, 5 = strict.</p>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="settings-hourly-min">Hourly min</Label>
                  <Input
                    id="settings-hourly-min"
                    type="number"
                    min={0}
                    value={hourlyMin}
                    onChange={(e) => setHourlyMin(e.target.value)}
                    placeholder="0"
                    disabled={isLoading || !canLoad}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-hourly-max">Hourly max</Label>
                  <Input
                    id="settings-hourly-max"
                    type="number"
                    min={0}
                    value={hourlyMax}
                    onChange={(e) => setHourlyMax(e.target.value)}
                    placeholder="0"
                    disabled={isLoading || !canLoad}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-fixed-min">Fixed budget min</Label>
                  <Input
                    id="settings-fixed-min"
                    type="number"
                    min={0}
                    value={fixedBudgetMin}
                    onChange={(e) => setFixedBudgetMin(e.target.value)}
                    placeholder="0"
                    disabled={isLoading || !canLoad}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Project types</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      { key: "short_gig", label: "Short gigs" },
                      { key: "medium_project", label: "Medium projects" },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.key}
                      role="button"
                      tabIndex={isLoading || !canLoad ? -1 : 0}
                      aria-disabled={isLoading || !canLoad}
                      onClick={() => {
                        if (isLoading || !canLoad) return
                        const next = new Set(projectTypes)
                        if (next.has(item.key)) next.delete(item.key)
                        else next.add(item.key)
                        setProjectTypes(next)
                      }}
                      onKeyDown={(e) => {
                        if (isLoading || !canLoad) return
                        if (e.key !== "Enter" && e.key !== " ") return
                        e.preventDefault()
                        const next = new Set(projectTypes)
                        if (next.has(item.key)) next.delete(item.key)
                        else next.add(item.key)
                        setProjectTypes(next)
                      }}
                      className={`border-input hover:bg-accent/40 flex items-center justify-between rounded-md border px-3 py-2 text-sm ${isLoading || !canLoad ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <span>{item.label}</span>
                      <Checkbox
                        checked={projectTypes.has(item.key)}
                        disabled={isLoading || !canLoad}
                        onCheckedChange={() => {
                          const next = new Set(projectTypes)
                          if (next.has(item.key)) next.delete(item.key)
                          else next.add(item.key)
                          setProjectTypes(next)
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-timezones">Time zones</Label>
                  <Input
                    id="settings-timezones"
                    value={timeZonesText}
                    onChange={(e) => setTimeZonesText(e.target.value)}
                    placeholder="America/New_York, Europe/London"
                    disabled={isLoading || !canLoad}
                  />
                  <p className="text-muted-foreground text-xs">Comma-separated.</p>
                </div>

                <div className="border-input flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Remote only</Label>
                    <p className="text-muted-foreground text-xs">
                      Only show fully remote roles.
                    </p>
                  </div>
                  <Checkbox
                    checked={remoteOnly}
                    onCheckedChange={(value) => setRemoteOnly(value === true)}
                    disabled={isLoading || !canLoad}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {showCancel ? (
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
            ) : null}
            <Button onClick={handleSave} disabled={!canLoad || isLoading || isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
