"use client"

import * as React from "react"
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSelector, useDispatch } from "react-redux"
import { ChevronDownIcon, InfoIcon } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { z } from "zod"
import { useSession } from "../../auth/session-provider"
import type { RootState } from "@/lib/state/store"
import {
  addEducation,
  addExperience,
  addSkill,
  removeEducation,
  removeExperience,
  removeSkill,
  setCompletion,
  setCurrency,
  setCurrentStep,
  setEngagementTypes,
  setFixedBudgetMin,
  setHourlyRange,
  setExperienceLevel,
  setProfileField,
  setProfilePath,
  setPreferredProjectLengthDays,
  setProfileSetupUrl,
  setRemoteOnly,
  setSaveError,
  setSaving,
  setTeamMode,
  setTimeZones,
} from "@/lib/state/onboardingSlice"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const AVAILABLE_SKILLS = [
  "React",
  "TypeScript",
  "JavaScript",
  "Next.js",
  "Node.js",
  "Python",
  "Django",
  "Rails",
  "Go",
  "Java",
  "SQL",
  "PostgreSQL",
  "Prisma",
  "GraphQL",
  "Tailwind CSS",
  "Figma",
  "Product Management",
  "Project Management",
]

const AVAILABLE_TIMEZONES = [
  "UTC-8",
  "UTC-5",
  "UTC",
  "UTC+1",
  "UTC+3",
  "UTC+5:30",
  "UTC+8",
]

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"]

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth is required")
    .nullable()
    .refine((value) => value !== null, "Date of birth is required"),
});

const teamModeSchema = z.enum(["solo", "team"]);

const profilePathSchema = z.enum(["import", "manual"]);

const preferencesSchema = z
  .object({
    platforms: z
      .array(z.enum(["upwork", "linkedin"]))
      .nonempty("Select at least one platform"),
    currency: z.string().trim().min(1, "Currency is required"),
    hourlyMin: z.number().min(0).nullable(),
    hourlyMax: z.number().min(0).nullable(),
    fixedBudgetMin: z.number().min(0).nullable(),
    projectTypes: z.array(z.string()).min(1, "Select at least one project type"),
    timeZones: z.array(z.string()).min(1, "Select at least one time zone"),
    remoteOnly: z.boolean(),
    tightness: z.number().int().min(1).max(5),
  })
  .superRefine((value, ctx) => {
    if (
      value.hourlyMin !== null &&
      value.hourlyMax !== null &&
      value.hourlyMin > value.hourlyMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hourlyMax"],
        message: "Hourly max must be >= hourly min",
      });
    }

    const hasRate = value.hourlyMin !== null || value.fixedBudgetMin !== null;
    if (!hasRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hourlyMin"],
        message: "Set an hourly min or fixed budget minimum",
      });
    }
  });

function collectIssueKeys(error: z.ZodError<unknown>) {
  const keys = new Set<string>();
  for (const issue of error.issues) {
    if (issue.path.length === 0) {
      keys.add("form");
      continue;
    }
    const head = issue.path[0];
    if (typeof head === "string") {
      keys.add(head);
    }
  }
  return keys;
}

function getIssueLabelsForStep(step: number, keys: Set<string>) {
  const labels: string[] = [];
  const add = (key: string, label: string) => {
    if (keys.has(key)) {
      labels.push(label);
    }
  };

  if (step === 1) {
    add("firstName", "First name");
    add("lastName", "Last name");
    add("dateOfBirth", "Date of birth");
  } else if (step === 3) {
    if (keys.has("profilePath")) {
      labels.push("Profile path");
    }
  } else if (step === 7) {
    add("platforms", "Platforms");
    add("projectTypes", "Project types");
    add("timeZones", "Time zones");
    add("hourlyMin", "Budget / rate");
    add("hourlyMax", "Hourly range");
  }

  return labels;
}

function formatPercentage(value: number) {
  if (value <= 0) {
    return "0%"
  }
  if (value >= 1) {
    return "100%"
  }
  return `${Math.round(value * 100)}%`
}

function StepIndicator() {
  const currentStep = useSelector(
    (state: RootState) => state.onboarding.currentStep,
  )
  const totalSteps = useSelector(
    (state: RootState) => state.onboarding.totalSteps,
  )

  const stepsLeft = Math.max(0, totalSteps - currentStep)

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Onboarding
          </p>
          <p className="text-sm font-semibold text-foreground">
            Step {currentStep} of {totalSteps}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Steps remaining
          </p>
          <p className="text-sm font-semibold text-foreground">
            {stepsLeft}
          </p>
        </div>
      </div>
      <Progress value={(currentStep / totalSteps) * 100} />
    </div>
  )
}

function DateOfBirthField({ invalid }: { invalid: boolean }) {
  const dispatch = useDispatch()
  const dateOfBirth = useSelector(
    (state: RootState) => state.onboarding.profile.dateOfBirth,
  )
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(
    dateOfBirth ? new Date(dateOfBirth) : undefined,
  )

  const handleSelect = useCallback(
    (value: Date | undefined) => {
      setDate(value)
      if (!value) {
        dispatch(
          setProfileField({
            field: "dateOfBirth",
            value: null,
          }),
        )
        return
      }
      const iso = value.toISOString().slice(0, 10)
      dispatch(
        setProfileField({
          field: "dateOfBirth",
          value: iso,
        }),
      )
      setOpen(false)
    },
    [dispatch],
  )

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="date-of-birth" className="px-1 text-sm font-medium">
        Date of birth <span className="text-muted-foreground">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date-of-birth"
            className={
              invalid
                ? "flex w-52 items-center justify-between border-destructive font-normal focus-visible:ring-destructive"
                : "flex w-52 items-center justify-between font-normal"
            }
          >
            {date ? date.toLocaleDateString() : "Select date"}
            <ChevronDownIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
      {invalid && (
        <p className="px-1 text-xs text-muted-foreground">Required to continue</p>
      )}
    </div>
  )
}

function StepOne({ issues }: { issues: Set<string> }) {
  const dispatch = useDispatch()
  const profile = useSelector((state: RootState) => state.onboarding.profile)
  const firstNameInvalid = issues.has("firstName")
  const lastNameInvalid = issues.has("lastName")
  const dateOfBirthInvalid = issues.has("dateOfBirth")

  const handleFirstNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        setProfileField({
          field: "firstName",
          value: event.target.value,
        }),
      )
    },
    [dispatch],
  )

  const handleLastNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        setProfileField({
          field: "lastName",
          value: event.target.value,
        }),
      )
    },
    [dispatch],
  )

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Step 1: Personal details</h2>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first-name">
              First name <span className="text-muted-foreground">*</span>
            </Label>
            <Input
              id="first-name"
              value={profile.firstName}
              onChange={handleFirstNameChange}
              placeholder="Jane"
              className={
                firstNameInvalid
                  ? "border-destructive focus-visible:ring-destructive"
                  : undefined
              }
            />
            {firstNameInvalid && (
              <p className="text-xs text-muted-foreground">Required to continue</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">
              Last name <span className="text-muted-foreground">*</span>
            </Label>
            <Input
              id="last-name"
              value={profile.lastName}
              onChange={handleLastNameChange}
              placeholder="Doe"
              className={
                lastNameInvalid
                  ? "border-destructive focus-visible:ring-destructive"
                  : undefined
              }
            />
            {lastNameInvalid && (
              <p className="text-xs text-muted-foreground">Required to continue</p>
            )}
          </div>
        </div>
        <DateOfBirthField invalid={dateOfBirthInvalid} />
      </div>
    </div>
  )
}

function StepTwo({ locked }: { locked: boolean }) {
  const dispatch = useDispatch()
  const teamMode = useSelector(
    (state: RootState) => state.onboarding.teamMode,
  )

  const handleChange = useCallback(
    (value: string) => {
      if (locked) {
        return
      }
      if (value === "solo" || value === "team") {
        dispatch(setTeamMode(value))
      }
    },
    [dispatch, locked],
  )

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Step 1: Team size</h2>
      <RadioGroup
        value={teamMode}
        onValueChange={handleChange}
        className="grid gap-4 md:grid-cols-2"
      >
        <label
          htmlFor="team-mode-solo"
          className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer flex-col gap-1 rounded-lg border p-4 text-left transition"
        >
          <div className="flex items-center gap-3">
            <RadioGroupItem value="solo" id="team-mode-solo" />
            <div>
              <div className="text-sm font-semibold">Solo</div>
              <p className="text-xs text-muted-foreground">
                I&apos;m a solo freelancer.
              </p>
            </div>
          </div>
        </label>
        <label
          htmlFor="team-mode-team"
          className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer flex-col gap-1 rounded-lg border p-4 text-left transition"
        >
          <div className="flex items-center gap-3">
            <RadioGroupItem value="team" id="team-mode-team" />
            <div>
              <div className="text-sm font-semibold">Team</div>
              <p className="text-xs text-muted-foreground">
                I lead or represent a small team.
              </p>
            </div>
          </div>
        </label>
      </RadioGroup>
    </div>
  )
}

function SkillsSection() {
  const dispatch = useDispatch()
  const skills = useSelector((state: RootState) => state.onboarding.skills)
  const [skillSearch, setSkillSearch] = useState("")
  const [customSkill, setCustomSkill] = useState("")

  const filteredSkills = useMemo(() => {
    const query = skillSearch.toLowerCase().trim()
    if (!query) {
      return AVAILABLE_SKILLS
    }
    return AVAILABLE_SKILLS.filter((skill) =>
      skill.toLowerCase().includes(query),
    )
  }, [skillSearch])

  const handleSelectSkill = useCallback(
    (value: string) => {
      dispatch(addSkill({ name: value }))
    },
    [dispatch],
  )

  const handleAddCustomSkill = useCallback(() => {
    const value = customSkill.trim()
    if (!value) {
      return
    }
    dispatch(addSkill({ name: value }))
    setCustomSkill("")
  }, [customSkill, dispatch])

  const handleRemoveSkill = useCallback(
    (id: string) => {
      dispatch(removeSkill(id))
    },
    [dispatch],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Skills</Label>
        <span className="text-xs text-muted-foreground">Optional</span>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1 space-y-2">
          <Input
            placeholder="Search skills"
            value={skillSearch}
            onChange={(event) => setSkillSearch(event.target.value)}
          />
          <Select onValueChange={handleSelectSkill}>
            <SelectTrigger>
              <SelectValue placeholder="Add skill from list" />
            </SelectTrigger>
            <SelectContent>
              {filteredSkills.map((skill) => (
                <SelectItem key={skill} value={skill}>
                  {skill}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex w-full max-w-sm items-center gap-2">
          <Input
            value={customSkill}
            onChange={(event) => setCustomSkill(event.target.value)}
            placeholder="Add custom skill"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddCustomSkill}
          >
            Add
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          Leave empty to skip this step.
        </span>
      </div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => handleRemoveSkill(skill.id)}
              className="border-input hover:border-destructive/60 hover:bg-destructive/5 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
            >
              <span>{skill.name}</span>
              <span className="text-muted-foreground">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ExperienceSection() {
  const dispatch = useDispatch()
  const experiences = useSelector(
    (state: RootState) => state.onboarding.experiences,
  )
  const [title, setTitle] = useState("")
  const [company, setCompany] = useState("")
  const [startYear, setStartYear] = useState("")
  const [endYear, setEndYear] = useState("")
  const [highlights, setHighlights] = useState("")

  const handleAddExperience = useCallback(() => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      return
    }
    dispatch(
      addExperience({
        title: trimmedTitle,
        company: company.trim(),
        startDate: startYear ? `${startYear}-01-01` : null,
        endDate: endYear ? `${endYear}-01-01` : null,
        highlights: highlights.trim(),
      }),
    )
    setTitle("")
    setCompany("")
    setStartYear("")
    setEndYear("")
    setHighlights("")
  }, [dispatch, title, company, startYear, endYear, highlights])

  const handleRemoveExperience = useCallback(
    (id: string) => {
      dispatch(removeExperience(id))
    },
    [dispatch],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Experience</Label>
        <span className="text-xs text-muted-foreground">Optional</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="experience-title">Role</Label>
          <Input
            id="experience-title"
            placeholder="Senior Software Engineer"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="experience-company">Company</Label>
          <Input
            id="experience-company"
            placeholder="Acme Inc."
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="experience-start-year">Start year</Label>
          <Input
            id="experience-start-year"
            placeholder="2020"
            value={startYear}
            onChange={(event) => setStartYear(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="experience-end-year">End year</Label>
          <Input
            id="experience-end-year"
            placeholder="2024 or leave empty"
            value={endYear}
            onChange={(event) => setEndYear(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="experience-highlights">Highlights</Label>
        <Input
          id="experience-highlights"
          placeholder="Key achievements or responsibilities"
          value={highlights}
          onChange={(event) => setHighlights(event.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddExperience}
        >
          Add experience
        </Button>
        <span className="text-xs text-muted-foreground">
          You can leave this empty and continue.
        </span>
      </div>
      {experiences.length > 0 && (
        <div className="space-y-2">
          {experiences.map((experience) => (
            <div
              key={experience.id}
              className="border-input flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{experience.title}</div>
                <div className="text-xs text-muted-foreground">
                  {experience.company}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRemoveExperience(experience.id)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EducationSection() {
  const dispatch = useDispatch()
  const educations = useSelector(
    (state: RootState) => state.onboarding.educations,
  )
  const [school, setSchool] = useState("")
  const [degree, setDegree] = useState("")
  const [field, setField] = useState("")
  const [startYear, setStartYear] = useState("")
  const [endYear, setEndYear] = useState("")

  const handleAddEducation = useCallback(() => {
    const trimmedSchool = school.trim()
    if (!trimmedSchool) {
      return
    }
    dispatch(
      addEducation({
        school: trimmedSchool,
        degree: degree.trim(),
        field: field.trim(),
        startYear,
        endYear,
      }),
    )
    setSchool("")
    setDegree("")
    setField("")
    setStartYear("")
    setEndYear("")
  }, [dispatch, school, degree, field, startYear, endYear])

  const handleRemoveEducation = useCallback(
    (id: string) => {
      dispatch(removeEducation(id))
    },
    [dispatch],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Education</Label>
        <span className="text-xs text-muted-foreground">Optional</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="education-school">School</Label>
          <Input
            id="education-school"
            placeholder="University or institution"
            value={school}
            onChange={(event) => setSchool(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="education-degree">Degree</Label>
          <Input
            id="education-degree"
            placeholder="Degree"
            value={degree}
            onChange={(event) => setDegree(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="education-field">Field</Label>
          <Input
            id="education-field"
            placeholder="Field of study"
            value={field}
            onChange={(event) => setField(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="education-start-year">Start year</Label>
          <Input
            id="education-start-year"
            placeholder="2018"
            value={startYear}
            onChange={(event) => setStartYear(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="education-end-year">End year</Label>
          <Input
            id="education-end-year"
            placeholder="2022 or leave empty"
            value={endYear}
            onChange={(event) => setEndYear(event.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddEducation}
        >
          Add education
        </Button>
        <span className="text-xs text-muted-foreground">
          You can leave this empty and continue.
        </span>
      </div>
      {educations.length > 0 && (
        <div className="space-y-2">
          {educations.map((education) => (
            <div
              key={education.id}
              className="border-input flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{education.school}</div>
                <div className="text-xs text-muted-foreground">
                  {education.degree} {education.field}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRemoveEducation(education.id)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StepThree({ invalid }: { invalid: boolean }) {
  const dispatch = useDispatch()
  const profilePath = useSelector(
    (state: RootState) => state.onboarding.profilePath,
  )
  const profileSetup = useSelector(
    (state: RootState) => state.onboarding.profileSetup,
  )
  const experienceLevel = useSelector(
    (state: RootState) => state.onboarding.experienceLevel,
  )

  const handlePathChange = useCallback(
    (value: string) => {
      if (
        value === "linkedin" ||
        value === "upwork" ||
        value === "cv" ||
        value === "portfolio" ||
        value === "manual"
      ) {
        dispatch(setProfilePath(value))
      }
    },
    [dispatch],
  )

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Step 2: Profile setup</h2>
      <div className="space-y-6">
        <RadioGroup
          value={profilePath ?? undefined}
          onValueChange={handlePathChange}
          className="grid gap-4 md:grid-cols-2"
        >
          <label
            htmlFor="profile-path-linkedin"
            className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem
                value="linkedin"
                id="profile-path-linkedin"
              />
              <div>
                <div className="text-sm font-semibold">
                  Import from LinkedIn
                </div>
                <p className="text-xs text-muted-foreground">
                  Use your existing profile as a starting point.
                </p>
              </div>
            </div>
          </label>
          <label
            htmlFor="profile-path-upwork"
            className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem
                value="upwork"
                id="profile-path-upwork"
              />
              <div>
                <div className="text-sm font-semibold">
                  Import from Upwork
                </div>
                <p className="text-xs text-muted-foreground">
                  Bring your Upwork profile in with a link.
                </p>
              </div>
            </div>
          </label>
          <label
            htmlFor="profile-path-cv"
            className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="cv" id="profile-path-cv" />
              <div>
                <div className="text-sm font-semibold">Upload CV</div>
                <p className="text-xs text-muted-foreground">
                  Upload a resume file to extract details.
                </p>
              </div>
            </div>
          </label>
          <label
            htmlFor="profile-path-portfolio"
            className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="portfolio" id="profile-path-portfolio" />
              <div>
                <div className="text-sm font-semibold">Add a portfolio</div>
                <p className="text-xs text-muted-foreground">
                  Link a portfolio or personal website.
                </p>
              </div>
            </div>
          </label>
          <label
            htmlFor="profile-path-manual"
            className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition md:col-span-2"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="manual" id="profile-path-manual" />
              <div>
                <div className="text-sm font-semibold">Set up manually</div>
                <p className="text-xs text-muted-foreground">
                  Add skills, experience, and education in one place.
                </p>
              </div>
            </div>
          </label>
        </RadioGroup>
        <AnimatePresence mode="popLayout" initial={false}>
          {profilePath && profilePath !== "manual" && (
            <motion.div
              key={`import-${profilePath}`}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{
                opacity: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
                y: { type: "spring", stiffness: 340, damping: 30, mass: 0.7 },
                layout: { type: "spring", stiffness: 300, damping: 32, mass: 0.8 },
              }}
              className="space-y-4"
            >
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                Under construction for now. You can add everything manually or skip this step.
              </div>
              {profilePath === "linkedin" && (
                <div className="space-y-2">
                  <Label htmlFor="linkedin-url">LinkedIn URL</Label>
                  <Input
                    id="linkedin-url"
                    value={profileSetup.linkedinUrl}
                    onChange={(event) =>
                      dispatch(
                        setProfileSetupUrl({
                          field: "linkedinUrl",
                          value: event.target.value,
                        }),
                      )
                    }
                    placeholder="https://www.linkedin.com/in/your-name"
                  />
                </div>
              )}
              {profilePath === "upwork" && (
                <div className="space-y-2">
                  <Label htmlFor="upwork-url">Upwork URL</Label>
                  <Input
                    id="upwork-url"
                    value={profileSetup.upworkUrl}
                    onChange={(event) =>
                      dispatch(
                        setProfileSetupUrl({
                          field: "upworkUrl",
                          value: event.target.value,
                        }),
                      )
                    }
                    placeholder="https://www.upwork.com/freelancers/~your-id"
                  />
                </div>
              )}
              {profilePath === "portfolio" && (
                <div className="space-y-2">
                  <Label htmlFor="portfolio-url">Portfolio URL</Label>
                  <Input
                    id="portfolio-url"
                    value={profileSetup.portfolioUrl}
                    onChange={(event) =>
                      dispatch(
                        setProfileSetupUrl({
                          field: "portfolioUrl",
                          value: event.target.value,
                        }),
                      )
                    }
                    placeholder="https://your-portfolio.com"
                  />
                </div>
              )}
              {profilePath === "cv" && (
                <div className="space-y-2">
                  <Label htmlFor="cv-upload">CV file</Label>
                  <Input id="cv-upload" type="file" />
                </div>
              )}
            </motion.div>
          )}
          {profilePath === "manual" && (
            <motion.div
              key="manual"
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{
                opacity: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
                y: { type: "spring", stiffness: 340, damping: 30, mass: 0.7 },
                layout: { type: "spring", stiffness: 300, damping: 32, mass: 0.8 },
              }}
              className="space-y-6"
            >
            <div className="space-y-3">
              <Label className="text-sm font-medium">Experience level</Label>
              <RadioGroup
                value={experienceLevel ?? undefined}
                onValueChange={(value) => {
                  if (
                    value === "intern_new_grad" ||
                    value === "entry" ||
                    value === "mid" ||
                    value === "senior" ||
                    value === "lead" ||
                    value === "director"
                  ) {
                    dispatch(setExperienceLevel(value))
                  }
                }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <label
                  htmlFor="experience-level-intern"
                  className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition"
                >
                  <RadioGroupItem
                    value="intern_new_grad"
                    id="experience-level-intern"
                  />
                  <span className="text-sm font-medium">Intern / New grad</span>
                </label>
                <label
                  htmlFor="experience-level-entry"
                  className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition"
                >
                  <RadioGroupItem value="entry" id="experience-level-entry" />
                  <span className="text-sm font-medium">Entry</span>
                </label>
                <label
                  htmlFor="experience-level-mid"
                  className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition"
                >
                  <RadioGroupItem value="mid" id="experience-level-mid" />
                  <span className="text-sm font-medium">Mid</span>
                </label>
                <label
                  htmlFor="experience-level-senior"
                  className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition"
                >
                  <RadioGroupItem value="senior" id="experience-level-senior" />
                  <span className="text-sm font-medium">Senior</span>
                </label>
                <label
                  htmlFor="experience-level-lead"
                  className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition"
                >
                  <RadioGroupItem value="lead" id="experience-level-lead" />
                  <span className="text-sm font-medium">Lead</span>
                </label>
                <label
                  htmlFor="experience-level-director"
                  className="border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition"
                >
                  <RadioGroupItem
                    value="director"
                    id="experience-level-director"
                  />
                  <span className="text-sm font-medium">Director</span>
                </label>
              </RadioGroup>
            </div>
            <Separator />
            <SkillsSection />
            <Separator />
            <ExperienceSection />
            <Separator />
            <EducationSection />
            </motion.div>
          )}
        </AnimatePresence>
        {!profilePath && (
          <p className="text-xs text-muted-foreground">
            Optional for now. Choose a path or skip this step.
          </p>
        )}
      </div>
    </div>
  )
}

function StepFourSkills() {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Skills</h2>
      <SkillsSection />
    </div>
  )
}

function StepFiveExperience() {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Experience</h2>
      <ExperienceSection />
    </div>
  )
}

function StepSixEducation() {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Education</h2>
      <EducationSection />
    </div>
  )
}

function StepSevenPreferences({ issues }: { issues: Set<string> }) {
  const dispatch = useDispatch()
  const preferences = useSelector(
    (state: RootState) => state.onboarding.preferences,
  )
  const hideFullTime = preferences.preferredProjectLengthDays[1] < 7

  React.useEffect(() => {
    if (!hideFullTime) return
    if (!preferences.engagementTypes.includes("full_time")) return
    dispatch(
      setEngagementTypes(
        preferences.engagementTypes.filter((value) => value !== "full_time"),
      ),
    )
  }, [dispatch, hideFullTime, preferences.engagementTypes])

  const handleCurrencyChange = useCallback(
    (value: string) => {
      dispatch(setCurrency(value))
    },
    [dispatch],
  )

  const handleHourlyChange = useCallback(
    (value: number[]) => {
      const min = typeof value[0] === "number" ? value[0] : null
      const max = typeof value[1] === "number" ? value[1] : null
      dispatch(setHourlyRange({ min, max }))
    },
    [dispatch],
  )

  const handleFixedBudgetChange = useCallback(
    (value: number[]) => {
      const min = typeof value[0] === "number" ? value[0] : null
      dispatch(setFixedBudgetMin(min))
    },
    [dispatch],
  )

  const handleProjectLengthChange = useCallback(
    (value: number[]) => {
      if (value.length < 2) return
      const next: [number, number] = [
        Math.max(1, Math.round(value[0])),
        Math.min(365, Math.round(value[1])),
      ]
      if (next[0] > next[1]) {
        next[0] = next[1]
      }
      dispatch(setPreferredProjectLengthDays(next))
    },
    [dispatch],
  )

  const handleEngagementToggle = useCallback(
    (type: "full_time" | "part_time" | "internship") => {
      const next = new Set(preferences.engagementTypes)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      dispatch(setEngagementTypes(Array.from(next)))
    },
    [dispatch, preferences.engagementTypes],
  )

  const handleRemoteOnlyChange = useCallback(
    (checked: boolean | "indeterminate") => {
      dispatch(setRemoteOnly(checked === true))
    },
    [dispatch],
  )

  return (
    <div className="space-y-8">
      <h2 className="text-base font-semibold">Step 3: Preferences</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label id="hourly-range-label" className="text-sm font-medium">
            Hourly range
          </Label>
          <div className="text-muted-foreground text-xs tabular-nums">
            {preferences.hourlyMin ?? "—"}–{preferences.hourlyMax ?? "—"} / hr
          </div>
        </div>
        <Slider
          aria-labelledby="hourly-range-label"
          min={0}
          max={300}
          step={1}
          value={[preferences.hourlyMin ?? 25, preferences.hourlyMax ?? 100]}
          onValueChange={handleHourlyChange}
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label id="fixed-budget-label" className="text-sm font-medium">
            Fixed project budget minimum
          </Label>
          <div className="text-muted-foreground text-xs tabular-nums">
            {preferences.fixedBudgetMin ?? "—"} {preferences.currency}
          </div>
        </div>
        <Slider
          aria-labelledby="fixed-budget-label"
          min={0}
          max={50000}
          step={50}
          value={[preferences.fixedBudgetMin ?? 2000]}
          onValueChange={handleFixedBudgetChange}
        />
      </div>
      <Separator />
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={preferences.currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label id="project-length-label" className="text-sm font-medium">
              Preferred project length
            </Label>
            <div className="text-muted-foreground text-xs tabular-nums">
              {preferences.preferredProjectLengthDays[0]}–{preferences.preferredProjectLengthDays[1]} days
            </div>
          </div>
          <Slider
            aria-labelledby="project-length-label"
            min={1}
            max={365}
            step={1}
            value={preferences.preferredProjectLengthDays}
            onValueChange={handleProjectLengthChange}
          />
          {hideFullTime && (
            <Tooltip>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span>Full-time is hidden.</span>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center"
                  >
                    <InfoIcon className="size-3.5" />
                    <span className="sr-only">
                      Full-time tooltip
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Full-time is only available for projects of 1 week or longer.
                </TooltipContent>
              </div>
            </Tooltip>
          )}
        </div>
        <div className="space-y-2">
          <Label id="time-zones-label" className="text-sm font-medium">
            Time zones
          </Label>
          <ToggleGroup
            type="multiple"
            value={preferences.timeZones}
            onValueChange={(values) => dispatch(setTimeZones(values))}
            className="flex flex-wrap justify-start gap-2"
            size="sm"
            aria-labelledby="time-zones-label"
          >
            {AVAILABLE_TIMEZONES.map((zone) => (
              <ToggleGroupItem key={zone} value={zone}>
                {zone}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="space-y-3">
          <Label className="text-sm font-medium">Full-time / Part-time / Internship</Label>
          <div className="space-y-3">
            {!hideFullTime && (
              <div className="flex items-start gap-3 rounded-lg border border-input p-3">
                <Checkbox
                  id="availability-full-time"
                  checked={preferences.engagementTypes.includes("full_time")}
                  onCheckedChange={() => handleEngagementToggle("full_time")}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="availability-full-time" className="text-sm">
                    Full-time
                  </Label>
                  <div className="text-muted-foreground text-xs">
                    35+ hrs/week
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 rounded-lg border border-input p-3">
              <Checkbox
                id="availability-part-time"
                checked={preferences.engagementTypes.includes("part_time")}
                onCheckedChange={() => handleEngagementToggle("part_time")}
              />
              <div className="space-y-0.5">
                <Label htmlFor="availability-part-time" className="text-sm">
                  Part-time
                </Label>
                <div className="text-muted-foreground text-xs">
                  &lt; 35 hrs/week
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-input p-3">
              <Checkbox
                id="availability-internship"
                checked={preferences.engagementTypes.includes("internship")}
                onCheckedChange={() => handleEngagementToggle("internship")}
              />
              <div className="space-y-0.5">
                <Label htmlFor="availability-internship" className="text-sm">
                  Internship
                </Label>
                <div className="text-muted-foreground text-xs">
                  learning-focused, temporary role
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
          <div>
            <Label htmlFor="remote-only" className="text-sm font-medium">
              Remote only
            </Label>
            <p className="text-xs text-muted-foreground">
              Only show fully remote roles.
            </p>
          </div>
          <Checkbox
            id="remote-only"
            checked={preferences.remoteOnly}
            onCheckedChange={handleRemoteOnlyChange}
          />
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { session } = useSession()
  const [userRole, setUserRole] = useState<"leader" | "member" | null>(null)
  const currentStep = useSelector(
    (state: RootState) => state.onboarding.currentStep,
  )
  const totalSteps = useSelector(
    (state: RootState) => state.onboarding.totalSteps,
  )
  const state = useSelector((root: RootState) => root.onboarding)
  const isSaving = state.isSaving
  const saveError = state.saveError

  const [showWelcome, setShowWelcome] = useState(false)
  const [isStepVisible, setIsStepVisible] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pendingStep, setPendingStep] = useState<number | null>(null)

  React.useEffect(() => {
    const seen = typeof window !== "undefined"
      ? window.localStorage.getItem("hmplz:onboarding:welcome_seen")
      : "1"
    setShowWelcome(!seen)
  }, [])

  React.useEffect(() => {
    async function loadRole() {
      if (!session?.access_token) {
        setUserRole(null)
        return
      }

      try {
        const res = await fetch("/api/v1/me", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        if (!res.ok) {
          setUserRole(null)
          return
        }
        const payload = await res.json()
        if (payload?.role === "leader" || payload?.role === "member") {
          setUserRole(payload.role)
        } else {
          setUserRole(null)
        }
      } catch {
        setUserRole(null)
      }
    }

    loadRole()
  }, [session?.access_token])

  const transitionToStep = useCallback(
    (step: number) => {
      if (step < 1 || step > totalSteps) return
      if (step === currentStep) return
      if (isTransitioning) return

      setIsTransitioning(true)
      setPendingStep(step)
      setIsStepVisible(false)
    },
    [currentStep, isTransitioning, totalSteps],
  )

  const handleStepExitComplete = useCallback(() => {
    if (pendingStep === null) return
    dispatch(setCurrentStep(pendingStep))
    setPendingStep(null)
    setIsStepVisible(true)
    setIsTransitioning(false)
  }, [dispatch, pendingStep])

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps) {
      transitionToStep(currentStep + 1)
    }
  }, [currentStep, totalSteps, transitionToStep])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      transitionToStep(currentStep - 1)
    }
  }, [currentStep, transitionToStep])

  const handleStart = useCallback(() => {
    window.localStorage.setItem("hmplz:onboarding:welcome_seen", "1")
    setShowWelcome(false)
  }, [])

  const handleSkipAll = useCallback(() => {
    window.localStorage.setItem("hmplz:onboarding:welcome_seen", "1")
    router.replace("/overview")
  }, [router])

  const handleSubmit = useCallback(async () => {
    dispatch(setSaving(true))
    dispatch(setSaveError(null))

    const payload: Record<string, unknown> = {
      team: {
        mode: state.teamMode,
      },
      path: state.profilePath,
      profileSetup: {
        linkedinUrl: state.profileSetup.linkedinUrl,
        upworkUrl: state.profileSetup.upworkUrl,
        portfolioUrl: state.profileSetup.portfolioUrl,
      },
      experienceLevel: state.experienceLevel,
      preferences: {
        currency: state.preferences.currency,
        hourlyMin: state.preferences.hourlyMin,
        hourlyMax: state.preferences.hourlyMax,
        fixedBudgetMin: state.preferences.fixedBudgetMin,
        timeZones: state.preferences.timeZones,
        remoteOnly: state.preferences.remoteOnly,
        preferredProjectLengthDays: state.preferences.preferredProjectLengthDays,
        engagementTypes: state.preferences.engagementTypes,
        tightness: state.preferences.tightness,
      },
    }

    if (state.profilePath === "manual") {
      payload.skills = state.skills.map((skill) => ({
        name: skill.name,
        level: skill.level,
        years: skill.years,
      }))
      payload.experiences = state.experiences.map((experience) => ({
        title: experience.title,
        company: experience.company,
        startDate: experience.startDate,
        endDate: experience.endDate,
        highlights: experience.highlights,
      }))
      payload.educations = state.educations.map((education) => ({
        school: education.school,
        degree: education.degree,
        field: education.field,
        startYear: education.startYear ? parseInt(education.startYear) : null,
        endYear: education.endYear ? parseInt(education.endYear) : null,
      }))
    }

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message =
          payload?.error?.message ??
          payload?.error ??
          "Failed to save onboarding"
        dispatch(setSaveError(message))
        dispatch(setSaving(false))
        return
      }

      const result = await response.json()
      const score =
        typeof result.profile_completeness_score === "number"
          ? result.profile_completeness_score
          : 0
      const missingFields =
        Array.isArray(result.missing_fields) &&
        result.missing_fields.every((item: unknown) => typeof item === "string")
          ? (result.missing_fields as string[])
          : []

      dispatch(
        setCompletion({
          score,
          missingFields,
        }),
      )
      dispatch(setSaving(false))

      router.replace("/overview")
    } catch (error) {
      if (error instanceof Error) {
        dispatch(setSaveError(error.message))
      } else {
        dispatch(setSaveError("Failed to save onboarding"))
      }
      dispatch(setSaving(false))
    }
  }, [
    dispatch,
    router,
    session,
    state,
  ])

  const handleSkipStep = useCallback(() => {
    if (currentStep < totalSteps) {
      transitionToStep(currentStep + 1)
      return
    }
    void handleSubmit()
  }, [currentStep, handleSubmit, totalSteps, transitionToStep])

  let content: React.ReactNode

  if (showWelcome) {
    content = (
      <Card className="w-full sm:w-fit sm:max-w-[min(92vw,48rem)] overflow-hidden">
        <div className="bg-primary/5 p-6 sm:p-8">
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Welcome to HireMePlz</CardTitle>
          <p className="text-muted-foreground text-base max-w-lg">
            Let&apos;s get your profile ready for the best opportunities. A complete profile helps you stand out.
          </p>
        </div>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="font-semibold">1</span>
              </div>
              <div className="font-semibold">Get Matched</div>
              <p className="text-muted-foreground mt-1 text-sm">
                Share your skills and preferences so we can filter the noise and find the right projects for you.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="font-semibold">2</span>
              </div>
              <div className="font-semibold">Save Time</div>
              <p className="text-muted-foreground mt-1 text-sm">
                Set your defaults now so you don&apos;t have to repeat yourself later. You can always change them.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center pt-2">
            <Button type="button" variant="ghost" onClick={handleSkipAll} className="text-muted-foreground hover:text-foreground">
              Skip for now
            </Button>
            <Button type="button" size="lg" onClick={handleStart} className="font-semibold">
              Let&apos;s set you up
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  } else if (currentStep === 1) {
    content = (
      <div
        className={userRole === "member" ? "opacity-60" : undefined}
        aria-disabled={userRole === "member"}
      >
        <StepTwo locked={userRole === "member"} />
        {userRole === "member" && (
          <p className="mt-3 text-xs text-muted-foreground">
            Team settings are locked for members.
          </p>
        )}
      </div>
    )
  } else if (currentStep === 2) {
    content = <StepThree invalid={false} />
  } else {
    content = (
      <StepSevenPreferences issues={new Set<string>()} />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8">
      {showWelcome ? (
        <div className="mx-auto w-full sm:w-fit sm:max-w-[min(92vw,56rem)]">
          <AnimatePresence
            mode="wait"
            initial={false}
            onExitComplete={handleStepExitComplete}
          >
            {isStepVisible && (
              <motion.div
                key="welcome"
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{
                  opacity: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
                  y: { type: "spring", stiffness: 320, damping: 28, mass: 0.7 },
                  layout: { type: "spring", stiffness: 280, damping: 30, mass: 0.8 },
                }}
              >
                {content}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="mx-auto w-full sm:w-fit sm:max-w-[min(92vw,56rem)] space-y-4">
          <Card className="p-5 sm:p-6">
            <StepIndicator />
            <AnimatePresence
              mode="wait"
              initial={false}
              onExitComplete={handleStepExitComplete}
            >
              {isStepVisible && (
                <motion.div
                  key={currentStep}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{
                    opacity: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
                    y: { type: "spring", stiffness: 320, damping: 28, mass: 0.7 },
                    layout: { type: "spring", stiffness: 280, damping: 30, mass: 0.8 },
                  }}
                >
                  {content}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                disabled={currentStep <= 1 || isSaving || isTransitioning}
                onClick={handleBack}
              >
                Back
              </Button>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSaving || isTransitioning}
                  onClick={handleSkipStep}
                >
                  Skip
                </Button>
                {currentStep < totalSteps && (
                  <Button
                    type="button"
                    disabled={isSaving || isTransitioning}
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                )}
                {currentStep === totalSteps && (
                  <Button
                    type="button"
                    disabled={isSaving || isTransitioning}
                    onClick={handleSubmit}
                  >
                    {isSaving ? "Saving..." : "Finish onboarding"}
                  </Button>
                )}
              </div>
            </div>
            {saveError && (
              <p className="mt-2 text-xs text-destructive">{saveError}</p>
            )}
            <div className="mt-6 flex gap-2">
              {Array.from({ length: totalSteps }).map((_, index) => {
                const step = index + 1
                return (
                  <button
                    key={step}
                    type="button"
                    disabled={isSaving || isTransitioning}
                    onClick={() => transitionToStep(step)}
                    className={
                      step === currentStep
                        ? "bg-primary h-1.5 flex-1 rounded-full"
                        : "bg-muted h-1.5 flex-1 rounded-full"
                    }
                  />
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
