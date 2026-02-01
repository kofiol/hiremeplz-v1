"use client"

import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

export type CVData = {
  personalInfo: {
    name: string
    headline: string
    email: string
    location: string
    linkedinUrl: string
  }
  summary: string
  experiences: Array<{
    title: string
    company: string
    startDate: string
    endDate: string | null
    highlights: string
  }>
  educations: Array<{
    school: string
    degree: string
    field: string
    startYear: number | null
    endYear: number | null
  }>
  skills: Array<{
    name: string
    level: number
    years: number | null
  }>
}

export function emptyCVData(): CVData {
  return {
    personalInfo: {
      name: "",
      headline: "",
      email: "",
      location: "",
      linkedinUrl: "",
    },
    summary: "",
    experiences: [],
    educations: [],
    skills: [],
  }
}

// ============================================================================
// Component
// ============================================================================

type CVPreviewProps = {
  data: CVData
  className?: string
}

export function CVPreview({ data, className }: CVPreviewProps) {
  const { personalInfo, summary, experiences, educations, skills } = data

  const hasContent =
    personalInfo.name ||
    summary ||
    experiences.length > 0 ||
    educations.length > 0 ||
    skills.length > 0

  if (!hasContent) {
    return (
      <div
        data-cv-preview
        className={cn(
          "flex h-full items-center justify-center text-muted-foreground",
          className
        )}
      >
        <p>No profile data yet. Complete your onboarding to get started.</p>
      </div>
    )
  }

  return (
    <div
      data-cv-preview
      className={cn(
        "mx-auto w-full max-w-[210mm] bg-white text-black print:max-w-none print:p-0",
        className
      )}
    >
      <div className="space-y-5 p-8 print:p-[15mm]">
        {/* Header */}
        <header className="border-b border-gray-300 pb-4">
          {personalInfo.name && (
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {personalInfo.name}
            </h1>
          )}
          {personalInfo.headline && (
            <p className="mt-1 text-base text-gray-600">
              {personalInfo.headline}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.location && <span>{personalInfo.location}</span>}
            {personalInfo.linkedinUrl && (
              <span className="print:hidden">{personalInfo.linkedinUrl}</span>
            )}
          </div>
        </header>

        {/* Summary */}
        {summary && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Summary
            </h2>
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
              {summary}
            </p>
          </section>
        )}

        {/* Experience */}
        {experiences.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Experience
            </h2>
            <div className="space-y-4">
              {experiences.map((exp, i) => (
                <div key={i} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {exp.title}
                    </h3>
                    <span className="shrink-0 text-xs text-gray-500">
                      {exp.startDate}
                      {" - "}
                      {exp.endDate ?? "Present"}
                    </span>
                  </div>
                  {exp.company && (
                    <p className="text-sm text-gray-600">{exp.company}</p>
                  )}
                  {exp.highlights && (
                    <p className="mt-1 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                      {exp.highlights}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {educations.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Education
            </h2>
            <div className="space-y-3">
              {educations.map((edu, i) => (
                <div key={i} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {edu.degree}
                      {edu.field ? `, ${edu.field}` : ""}
                    </h3>
                    {(edu.startYear || edu.endYear) && (
                      <span className="shrink-0 text-xs text-gray-500">
                        {edu.startYear ?? ""}
                        {edu.startYear && edu.endYear ? " - " : ""}
                        {edu.endYear ?? ""}
                      </span>
                    )}
                  </div>
                  {edu.school && (
                    <p className="text-sm text-gray-600">{edu.school}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <span
                  key={i}
                  className="rounded bg-gray-100 px-2 py-0.5 text-sm text-gray-700 print:border print:border-gray-300 print:bg-transparent"
                >
                  {skill.name}
                  {skill.years ? ` (${skill.years}y)` : ""}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
