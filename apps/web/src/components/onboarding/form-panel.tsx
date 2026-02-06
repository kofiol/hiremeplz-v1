"use client"

import { useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle,
  Loader2,
  X,
  Plus,
  Briefcase,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { ExperienceLevelSchema, CurrencySchema, EngagementTypeSchema } from "@/lib/onboarding/schema"
import { z } from "zod"

type FormPanelProps = {
  accessToken: string | null
  firstName: string
  fullName: string | null
  onBack?: () => void
}

type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>
type Currency = z.infer<typeof CurrencySchema>
type EngagementType = z.infer<typeof EngagementTypeSchema>

// Form step definitions
const STEPS = [
  { id: "linkedin", title: "LinkedIn (Optional)", description: "We can pull details from your profile" },
  { id: "experience", title: "Experience Level", description: "Where are you in your career?" },
  { id: "skills", title: "Skills", description: "What technologies and skills do you have?" },
  { id: "work", title: "Work Experience", description: "Your professional background" },
  { id: "education", title: "Education", description: "Your academic background (optional)" },
  { id: "engagement", title: "Engagement Type", description: "Full-time, part-time, or both?" },
  { id: "current-rate", title: "Current Rate", description: "What do you charge now?" },
  { id: "dream-rate", title: "Target Rate", description: "What do you want to charge?" },
] as const

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "intern_new_grad", label: "Junior / New Grad" },
  { value: "entry", label: "Entry-Level (1-2 years)" },
  { value: "mid", label: "Mid-Level (3-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "lead", label: "Lead / Principal (8+ years)" },
  { value: "director", label: "Director-Level" },
]

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CAD", "AUD"]

const COMMON_SKILLS = [
  "JavaScript", "TypeScript", "Python", "React", "Next.js", "Node.js",
  "PostgreSQL", "AWS", "Docker", "GraphQL", "REST APIs", "Git",
  "Vue.js", "Angular", "Java", "C#", "Go", "Rust", "PHP", "Ruby",
  "MongoDB", "Redis", "Kubernetes", "Terraform", "Machine Learning",
]

type Skill = { name: string }
type Experience = { title: string; company: string; startDate: string; endDate: string; highlights: string }
type Education = { school: string; degree: string; field: string; startYear: string; endYear: string }

// Helper: Input with filled state styling
function FilledInput({
  value,
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const isFilled = typeof value === "string" && value.trim().length > 0
  return (
    <Input
      value={value}
      className={cn(
        "transition-colors",
        isFilled && "border-primary/40 bg-primary/5",
        className
      )}
      {...props}
    />
  )
}

// Month/Year picker using shadcn selects
const MONTHS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
]

function MonthYearPicker({
  value,
  onChange,
  placeholder = "Select date",
  allowPresent = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowPresent?: boolean
}) {
  // Parse value (format: "YYYY-MM" or "present")
  const isPresent = value === "present"
  const [year, month] = isPresent ? ["", ""] : (value?.split("-") ?? ["", ""])

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 30 }, (_, i) => String(currentYear - i))

  const handleMonthChange = (newMonth: string) => {
    if (year) {
      onChange(`${year}-${newMonth}`)
    } else {
      onChange(`${currentYear}-${newMonth}`)
    }
  }

  const handleYearChange = (newYear: string) => {
    if (newYear === "present") {
      onChange("present")
    } else if (month) {
      onChange(`${newYear}-${month}`)
    } else {
      onChange(`${newYear}-01`)
    }
  }

  const isFilled = !!value && value !== ""

  return (
    <div className="flex gap-2">
      <Select
        value={isPresent ? "" : month}
        onValueChange={handleMonthChange}
        disabled={isPresent}
      >
        <SelectTrigger
          className={cn(
            "w-[100px] transition-colors",
            isFilled && !isPresent && "border-primary/40 bg-primary/5"
          )}
        >
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={isPresent ? "present" : year}
        onValueChange={handleYearChange}
      >
        <SelectTrigger
          className={cn(
            "w-[110px] transition-colors",
            isFilled && "border-primary/40 bg-primary/5"
          )}
        >
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {allowPresent && (
            <SelectItem value="present">Present</SelectItem>
          )}
          {years.map((y) => (
            <SelectItem key={y} value={y}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function FormPanel({ accessToken, firstName, fullName, onBack }: FormPanelProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    fullName: fullName ?? "",
    linkedinUrl: "",
    experienceLevel: null as ExperienceLevel | null,
    skills: [] as Skill[],
    experiences: [{ title: "", company: "", startDate: "", endDate: "", highlights: "" }] as Experience[],
    educations: [{ school: "", degree: "", field: "", startYear: "", endYear: "" }] as Education[],
    engagementTypes: [] as EngagementType[],
    currentRateMin: "",
    currentRateMax: "",
    dreamRateMin: "",
    dreamRateMax: "",
    currency: "USD" as Currency,
  })

  // Skill input state
  const [skillInput, setSkillInput] = useState("")

  const updateField = useCallback(<K extends keyof typeof formData>(
    key: K,
    value: typeof formData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const addSkill = useCallback((name?: string) => {
    const skillName = (name ?? skillInput).trim()
    if (!skillName) return
    if (formData.skills.some((s) => s.name.toLowerCase() === skillName.toLowerCase())) {
      setSkillInput("")
      return
    }
    updateField("skills", [...formData.skills, { name: skillName }])
    setSkillInput("")
  }, [formData.skills, skillInput, updateField])

  const removeSkill = useCallback((name: string) => {
    updateField("skills", formData.skills.filter((s) => s.name !== name))
  }, [formData.skills, updateField])

  const updateExperience = useCallback((index: number, field: keyof Experience, value: string) => {
    const updated = formData.experiences.map((e, i) =>
      i === index ? { ...e, [field]: value } : e
    )
    updateField("experiences", updated)
  }, [formData.experiences, updateField])

  const addExperience = useCallback(() => {
    updateField("experiences", [
      ...formData.experiences,
      { title: "", company: "", startDate: "", endDate: "", highlights: "" },
    ])
  }, [formData.experiences, updateField])

  const removeExperience = useCallback((index: number) => {
    updateField("experiences", formData.experiences.filter((_, i) => i !== index))
  }, [formData.experiences, updateField])

  const updateEducation = useCallback((index: number, field: keyof Education, value: string) => {
    const updated = formData.educations.map((e, i) =>
      i === index ? { ...e, [field]: value } : e
    )
    updateField("educations", updated)
  }, [formData.educations, updateField])

  const addEducation = useCallback(() => {
    updateField("educations", [
      ...formData.educations,
      { school: "", degree: "", field: "", startYear: "", endYear: "" },
    ])
  }, [formData.educations, updateField])

  const removeEducation = useCallback((index: number) => {
    updateField("educations", formData.educations.filter((_, i) => i !== index))
  }, [formData.educations, updateField])

  const toggleEngagement = useCallback((type: EngagementType) => {
    const current = formData.engagementTypes
    if (current.includes(type)) {
      updateField("engagementTypes", current.filter((t) => t !== type))
    } else {
      updateField("engagementTypes", [...current, type])
    }
  }, [formData.engagementTypes, updateField])

  // Step validation
  const canProceed = useMemo(() => {
    switch (STEPS[currentStep].id) {
      case "linkedin":
        return true // Optional
      case "experience":
        return formData.experienceLevel !== null
      case "skills":
        return formData.skills.length > 0
      case "work":
        return formData.experiences.some((e) => e.title.trim())
      case "education":
        return true // Optional
      case "engagement":
        return formData.engagementTypes.length > 0
      case "current-rate":
        return formData.currentRateMin.trim() || formData.currentRateMax.trim()
      case "dream-rate":
        return formData.dreamRateMin.trim() || formData.dreamRateMax.trim()
      default:
        return true
    }
  }, [currentStep, formData])

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep])

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const handleSubmit = useCallback(async () => {
    if (!accessToken) {
      setError("Session expired. Please refresh the page and try again.")
      return
    }
    setIsSubmitting(true)
    setError(null)

    try {
      // Helper to convert empty strings to null and trim
      const toNullableString = (s: string) => {
        const trimmed = s.trim()
        return trimmed.length > 0 ? trimmed : null
      }

      // Helper to convert "YYYY-MM" to "YYYY-MM-01" date format for PostgreSQL
      const toDateString = (s: string) => {
        const trimmed = s.trim()
        if (!trimmed) return null
        // "present" means ongoing - send null for end_date
        if (trimmed === "present") return null
        // If already in YYYY-MM-DD format, use as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
        // If in YYYY-MM format, add day
        if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`
        return null
      }

      // Filter and map experiences - only include if has title
      const validExperiences = formData.experiences
        .filter((e) => e.title.trim())
        .map((e) => ({
          title: e.title.trim(),
          company: toNullableString(e.company),
          startDate: toDateString(e.startDate),
          endDate: toDateString(e.endDate),
          highlights: toNullableString(e.highlights),
        }))

      // Filter and map educations - only include if has school
      const validEducations = formData.educations
        .filter((e) => e.school.trim())
        .map((e) => ({
          school: e.school.trim(),
          degree: toNullableString(e.degree),
          field: toNullableString(e.field),
          startYear: e.startYear.trim() ? parseInt(e.startYear.trim(), 10) : null,
          endYear: e.endYear.trim() ? parseInt(e.endYear.trim(), 10) : null,
        }))

      const payload = {
        fullName: formData.fullName.trim() || null,
        skills: formData.skills.length > 0
          ? formData.skills.map((s) => ({ name: s.name.trim() }))
          : null,
        // Only send experiences if there are valid entries, otherwise null (skip the operation)
        experiences: validExperiences.length > 0 ? validExperiences : null,
        // Only send educations if there are valid entries, otherwise null (skip the operation)
        educations: validEducations.length > 0 ? validEducations : null,
        preferences: {
          currency: formData.currency,
          currentHourlyMin: formData.currentRateMin.trim() ? parseFloat(formData.currentRateMin.trim()) : null,
          currentHourlyMax: formData.currentRateMax.trim() ? parseFloat(formData.currentRateMax.trim()) : null,
          hourlyMin: formData.dreamRateMin.trim() ? parseFloat(formData.dreamRateMin.trim()) : null,
          hourlyMax: formData.dreamRateMax.trim() ? parseFloat(formData.dreamRateMax.trim()) : null,
          engagementTypes: formData.engagementTypes.length > 0 ? formData.engagementTypes : null,
        },
        experienceLevel: formData.experienceLevel,
        profileSetup: formData.linkedinUrl.trim() ? { linkedinUrl: formData.linkedinUrl.trim() } : null,
      }

      const res = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 401) {
          throw new Error("Session expired. Please refresh the page and sign in again.")
        }
        throw new Error(data.error?.message || "Failed to save profile")
      }

      // Redirect to analysis page
      router.push("/analysis")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }, [accessToken, formData, router])

  const isLastStep = currentStep === STEPS.length - 1

  // Check if experience entry has data
  const isExperienceFilled = (exp: Experience) =>
    exp.title.trim() || exp.company.trim() || exp.startDate.trim() || exp.endDate.trim()

  // Check if education entry has data
  const isEducationFilled = (edu: Education) =>
    edu.school.trim() || edu.degree.trim() || edu.field.trim()

  // Render step content
  const renderStepContent = () => {
    const step = STEPS[currentStep]

    switch (step.id) {
      case "linkedin":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
              <FilledInput
                id="linkedin"
                value={formData.linkedinUrl}
                onChange={(e) => updateField("linkedinUrl", e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="mt-1.5"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Optional. You can skip this step if you prefer.
              </p>
            </div>
          </div>
        )

      case "experience":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {EXPERIENCE_LEVELS.map((level) => {
                const isSelected = formData.experienceLevel === level.value
                return (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => updateField("experienceLevel", level.value)}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg border p-4 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                        : "border-border/50 hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute right-2 top-2">
                        <CheckCircle className="size-4 text-success" />
                      </div>
                    )}
                    <span className="text-sm font-medium">{level.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )

      case "skills":
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <FilledInput
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addSkill()
                  }
                }}
                placeholder="Type a skill and press Enter..."
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addSkill()}
                disabled={!skillInput.trim()}
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <Badge
                    key={skill.name}
                    variant="secondary"
                    className="gap-1.5 py-1.5 pl-3 pr-1.5 text-sm"
                  >
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill.name)}
                      className="rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="border-t border-border/50 pt-4">
              <p className="mb-2 text-xs text-muted-foreground">Common skills:</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SKILLS.filter(
                  (s) => !formData.skills.some((fs) => fs.name.toLowerCase() === s.toLowerCase())
                ).map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="cursor-pointer transition-colors hover:border-primary hover:bg-primary/10"
                    onClick={() => addSkill(skill)}
                  >
                    <Plus className="mr-1 size-3" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )

      case "work":
        return (
          <div className="space-y-4">
            {formData.experiences.map((exp, i) => {
              const filled = isExperienceFilled(exp)
              return (
                <div
                  key={i}
                  className={cn(
                    "relative space-y-4 rounded-lg border p-5 transition-colors",
                    filled
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/50 bg-card/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Position {i + 1}
                    </span>
                    {formData.experiences.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeExperience(i)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Title *</Label>
                      <FilledInput
                        value={exp.title}
                        onChange={(e) => updateExperience(i, "title", e.target.value)}
                        placeholder="Software Engineer"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Company</Label>
                      <FilledInput
                        value={exp.company}
                        onChange={(e) => updateExperience(i, "company", e.target.value)}
                        placeholder="Acme Corp"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Start</Label>
                      <div className="mt-1">
                        <MonthYearPicker
                          value={exp.startDate}
                          onChange={(v) => updateExperience(i, "startDate", v)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">End</Label>
                      <div className="mt-1">
                        <MonthYearPicker
                          value={exp.endDate}
                          onChange={(v) => updateExperience(i, "endDate", v)}
                          allowPresent
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <Button
              type="button"
              variant="outline"
              onClick={addExperience}
              className="w-full gap-2"
            >
              <Plus className="size-4" />
              Add Position
            </Button>
          </div>
        )

      case "education":
        return (
          <div className="space-y-4">
            {formData.educations.map((edu, i) => {
              const filled = isEducationFilled(edu)
              return (
                <div
                  key={i}
                  className={cn(
                    "relative space-y-4 rounded-lg border p-5 transition-colors",
                    filled
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/50 bg-card/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Education {i + 1}
                    </span>
                    {formData.educations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeEducation(i)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">School</Label>
                    <FilledInput
                      value={edu.school}
                      onChange={(e) => updateEducation(i, "school", e.target.value)}
                      placeholder="MIT"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Degree</Label>
                      <FilledInput
                        value={edu.degree}
                        onChange={(e) => updateEducation(i, "degree", e.target.value)}
                        placeholder="B.Sc."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Field</Label>
                      <FilledInput
                        value={edu.field}
                        onChange={(e) => updateEducation(i, "field", e.target.value)}
                        placeholder="Computer Science"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            <Button
              type="button"
              variant="outline"
              onClick={addEducation}
              className="w-full gap-2"
            >
              <Plus className="size-4" />
              Add Education
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              This step is optional. Skip if not applicable.
            </p>
          </div>
        )

      case "engagement":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  value: "full_time" as const,
                  label: "Full-time",
                  description: "40+ hrs/week",
                  icon: Briefcase,
                },
                {
                  value: "part_time" as const,
                  label: "Part-time",
                  description: "Less than 40 hrs/week",
                  icon: Clock,
                },
              ].map((option) => {
                const isSelected = formData.engagementTypes.includes(option.value)
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border p-6 text-center transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                        : "border-border/50 hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleEngagement(option.value)}
                      className="absolute right-3 top-3"
                    />
                    <option.icon className={cn(
                      "size-8",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                    <div>
                      <span className="text-lg font-medium">{option.label}</span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Select one or both options
            </p>
          </div>
        )

      case "current-rate":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              What's your current hourly rate range?
            </p>
            <div className="flex items-center gap-3">
              <Select
                value={formData.currency}
                onValueChange={(v) => updateField("currency", v as Currency)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FilledInput
                type="number"
                value={formData.currentRateMin}
                onChange={(e) => updateField("currentRateMin", e.target.value)}
                placeholder="Min"
                min={0}
              />
              <span className="text-muted-foreground">-</span>
              <FilledInput
                type="number"
                value={formData.currentRateMax}
                onChange={(e) => updateField("currentRateMax", e.target.value)}
                placeholder="Max"
                min={0}
              />
              <span className="shrink-0 text-sm text-muted-foreground">/hr</span>
            </div>
          </div>
        )

      case "dream-rate":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              What rate do you want to achieve? (Your target rate)
            </p>
            <div className="flex items-center gap-3">
              <Select
                value={formData.currency}
                onValueChange={(v) => updateField("currency", v as Currency)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FilledInput
                type="number"
                value={formData.dreamRateMin}
                onChange={(e) => updateField("dreamRateMin", e.target.value)}
                placeholder="Min"
                min={0}
              />
              <span className="text-muted-foreground">-</span>
              <FilledInput
                type="number"
                value={formData.dreamRateMax}
                onChange={(e) => updateField("dreamRateMax", e.target.value)}
                placeholder="Max"
                min={0}
              />
              <span className="shrink-0 text-sm text-muted-foreground">/hr</span>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-1 flex-col items-center justify-center p-6 min-h-0 overflow-y-auto"
    >
      <div className="w-full max-w-2xl space-y-8">
        {/* Back button */}
        {onBack && (
          <div className="mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{Math.round(((currentStep + 1) / STEPS.length) * 100)}% complete</span>
          </div>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Step header */}
        <div className="text-center">
          <h2 className="text-xl font-semibold">{STEPS[currentStep].title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {STEPS[currentStep].description}
          </p>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-border/50 bg-card/50 p-8"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
            className="flex-1"
          >
            <ChevronLeft className="mr-1 size-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-1 size-4" />
                  Complete Setup
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed}
              className="flex-1"
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
