"use client"

import { useMemo } from "react"
import { User, Briefcase, GraduationCap, Code, DollarSign, Linkedin } from "lucide-react"
import { EXPERIENCE_LEVEL_LABELS } from "@/lib/onboarding/constants"
import { StepIndicator } from "./step-indicator"
import type { CollectedData } from "@/lib/onboarding/schema"

type ProgressSidebarProps = {
  collectedData: CollectedData
}

function DataRow({ label, value, icon: Icon }: { label: string; value: string | null; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {Icon && <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value ? (
          <p className="truncate text-foreground">{value}</p>
        ) : (
          <p className="text-muted-foreground/50 italic">Not provided</p>
        )}
      </div>
    </div>
  )
}

function formatRate(min: number | null, max: number | null, currency: string | null): string | null {
  if (min == null && max == null) return null
  const c = currency ?? "USD"
  if (min != null && max != null) return `${c} ${min}-${max}/hr`
  if (min != null) return `${c} ${min}+/hr`
  return `${c} up to ${max}/hr`
}

export function ProgressSidebar({ collectedData }: ProgressSidebarProps) {
  const data = collectedData

  const skillsText = useMemo(() => {
    if (!data.skills || data.skills.length === 0) return null
    return data.skills.map((s) => s.name).join(", ")
  }, [data.skills])

  const experienceText = useMemo(() => {
    if (!data.experiences || data.experiences.length === 0) return null
    return data.experiences.map((e) => e.title + (e.company ? ` at ${e.company}` : "")).join("; ")
  }, [data.experiences])

  const educationText = useMemo(() => {
    if (!data.educations || data.educations.length === 0) return null
    return data.educations.map((e) => e.degree ? `${e.degree} - ${e.school}` : e.school).join("; ")
  }, [data.educations])

  const engagementText = useMemo(() => {
    if (!data.engagementTypes || data.engagementTypes.length === 0) return null
    return data.engagementTypes.map((t) => t === "full_time" ? "Full-time" : "Part-time").join(", ")
  }, [data.engagementTypes])

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border/50 bg-card/50">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-foreground">Profile Data</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Collected during conversation
        </p>
      </div>

      <div className="px-4 pb-3">
        <StepIndicator collectedData={data} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <DataRow label="Name" value={data.fullName} icon={User} />

        <DataRow
          label="Experience Level"
          value={data.experienceLevel ? (EXPERIENCE_LEVEL_LABELS[data.experienceLevel] ?? data.experienceLevel) : null}
          icon={Briefcase}
        />

        <DataRow label="Skills" value={skillsText} icon={Code} />

        <DataRow label="Work Experience" value={experienceText} icon={Briefcase} />

        <DataRow label="Education" value={educationText} icon={GraduationCap} />

        <DataRow
          label="Current Rate"
          value={formatRate(data.currentRateMin, data.currentRateMax, data.currency)}
          icon={DollarSign}
        />

        <DataRow
          label="Dream Rate"
          value={formatRate(data.dreamRateMin, data.dreamRateMax, data.currency)}
          icon={DollarSign}
        />

        <DataRow label="Engagement" value={engagementText} icon={Briefcase} />

        <DataRow label="LinkedIn" value={data.linkedinUrl} icon={Linkedin} />
      </div>
    </div>
  )
}
