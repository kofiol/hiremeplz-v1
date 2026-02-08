"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, User, Briefcase, GraduationCap, Code, DollarSign, Clock, Linkedin } from "lucide-react"
import { cn } from "@/lib/utils"

// Fields to hide from user display (internal/system fields)
const HIDDEN_FIELDS = new Set(["teamMode", "profilePath"])

// Field name mappings for user-friendly display
const FIELD_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  fullName: { label: "Name", icon: User },
  linkedinUrl: { label: "LinkedIn", icon: Linkedin },
  experienceLevel: { label: "Experience Level", icon: Briefcase },
  skills: { label: "Skills", icon: Code },
  experiences: { label: "Work Experience", icon: Briefcase },
  educations: { label: "Education", icon: GraduationCap },
  engagementTypes: { label: "Engagement Type", icon: Clock },
  currentRateMin: { label: "Current Rate (Min)", icon: DollarSign },
  currentRateMax: { label: "Current Rate (Max)", icon: DollarSign },
  dreamRateMin: { label: "Target Rate (Min)", icon: DollarSign },
  dreamRateMax: { label: "Target Rate (Max)", icon: DollarSign },
  currency: { label: "Currency", icon: DollarSign },
}

// Experience level display names
const EXPERIENCE_LABELS: Record<string, string> = {
  intern_new_grad: "Junior / New Grad",
  entry: "Entry-Level",
  mid: "Mid-Level",
  senior: "Senior",
  lead: "Lead / Principal",
  director: "Director-Level",
}

// Engagement type display names
const ENGAGEMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
}

type SavedField = {
  field: string
  value: unknown
}

type SavedFieldsCardProps = {
  fields: SavedField[]
  className?: string
}

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return ""
  if (value === "skipped") return "Skipped"

  // Handle arrays
  if (Array.isArray(value)) {
    if (field === "skills") {
      return value.map((s: { name: string }) => s.name).join(", ")
    }
    if (field === "experiences") {
      return value.map((e: { title: string; company?: string }) =>
        e.company ? `${e.title} at ${e.company}` : e.title
      ).join("; ")
    }
    if (field === "educations") {
      return value.map((e: { school?: string; degree?: string; field?: string }) => {
        const parts = [e.degree, e.field, e.school].filter(Boolean)
        return parts.join(" - ") || "Education"
      }).join("; ")
    }
    if (field === "engagementTypes") {
      return value.map((t: string) => ENGAGEMENT_LABELS[t] || t).join(", ")
    }
    return value.join(", ")
  }

  // Handle experience level
  if (field === "experienceLevel" && typeof value === "string") {
    return EXPERIENCE_LABELS[value] || value
  }

  // Handle rates
  if ((field === "currentRateMin" || field === "currentRateMax" || field === "dreamRateMin" || field === "dreamRateMax") && typeof value === "number") {
    return `$${value}/hr`
  }

  // Handle LinkedIn URL - show shortened version
  if (field === "linkedinUrl" && typeof value === "string") {
    if (value === "skipped") return "Skipped"
    const match = value.match(/linkedin\.com\/in\/([^/]+)/)
    return match ? `linkedin.com/in/${match[1]}` : value
  }

  return String(value)
}

export function SavedFieldsCard({ fields, className }: SavedFieldsCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Filter out hidden/internal fields and "skipped" values (no point showing them)
  const visibleFields = fields.filter(({ field, value }) => !HIDDEN_FIELDS.has(field) && value !== "skipped")

  // Show loading briefly, then reveal details
  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 800)
    return () => clearTimeout(timer)
  }, [])

  if (!visibleFields || visibleFields.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-lg border border-border/30 bg-accent px-4 py-3 overflow-hidden",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {!showDetails ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Saving to profile...</span>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="size-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground">Saved to profile</span>
            </div>
            <div className="space-y-1.5">
              {visibleFields.map(({ field, value }) => {
                const config = FIELD_LABELS[field] || { label: field, icon: CheckCircle }
                const Icon = config.icon
                const displayValue = formatValue(field, value)

                if (!displayValue) return null

                return (
                  <div key={field} className="flex items-start gap-2 text-sm min-w-0">
                    <Icon className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="shrink-0 text-muted-foreground">{config.label}:</span>
                    <span className="font-medium text-foreground truncate min-w-0">{displayValue}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Loading state for when tool is being called
export function SavedFieldsLoading() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-accent px-3 py-2 text-sm text-muted-foreground">
      <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span>Saving to profile...</span>
    </div>
  )
}
