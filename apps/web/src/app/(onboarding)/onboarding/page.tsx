"use client"

import * as React from "react"
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSelector, useDispatch } from "react-redux"
import { ChevronDownIcon } from "lucide-react"
import { z } from "zod"
import { useSession } from "../../auth/session-provider"
import type { RootState } from "@/lib/state/store"
import {
  addEducation,
  addExperience,
  addSkill,
  nextStep,
  previousStep,
  removeEducation,
  removeExperience,
  removeSkill,
  setCompletion,
  setCurrency,
  setCurrentStep,
  setFixedBudgetMin,
  setHourlyRange,
  setPlatforms,
  setProfileField,
  setProfilePath,
  setProjectTypes,
  setRemoteOnly,
  setSaveError,
  setSaving,
  setTeamMode,
  setTimeZones,
  setTightness,
} from "@/lib/state/onboardingSlice"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

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
  const completionScore = useSelector(
    (state: RootState) => state.onboarding.completion.score,
  )
  const missingFields = useSelector(
    (state: RootState) => state.onboarding.completion.missingFields,
  )

  const progressPercent = completionScore * 100

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
            Profile completeness
          </p>
          <p className="text-sm font-semibold text-foreground">
            {formatPercentage(completionScore)}
          </p>
        </div>
      </div>
      <Progress value={progressPercent} />
      {missingFields.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {missingFields.map((field) => (
            <Badge key={field} variant="outline">
              Missing {field.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Step 1: Personal details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Step 2: Team size
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
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
  const isMissing = invalid && !profilePath

  const handlePathChange = useCallback(
    (value: string) => {
      if (value === "import" || value === "manual") {
        dispatch(setProfilePath(value))
      }
    },
    [dispatch],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Step 3: Profile setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={profilePath ?? undefined}
          onValueChange={handlePathChange}
          className="grid gap-4 md:grid-cols-2"
        >
          <label
            htmlFor="profile-path-import"
            className={
              isMissing
                ? "border-destructive hover:border-ring hover:bg-accent/40 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition"
                : "border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition"
            }
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem
                value="import"
                id="profile-path-import"
              />
              <div>
                <div className="text-sm font-semibold">
                  Import from LinkedIn or Upwork
                </div>
                <p className="text-xs text-muted-foreground">
                  Use your existing profile as a starting point.
                </p>
              </div>
            </div>
          </label>
          <label
            htmlFor="profile-path-manual"
            className={
              isMissing
                ? "border-destructive hover:border-ring hover:bg-accent/40 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition"
                : "border-input hover:border-ring hover:bg-accent/40 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition"
            }
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem
                value="manual"
                id="profile-path-manual"
              />
              <div>
                <div className="text-sm font-semibold">
                  Add skills and experience manually
                </div>
                <p className="text-xs text-muted-foreground">
                  Describe your skills, experience, and education by hand.
                </p>
              </div>
            </div>
          </label>
        </RadioGroup>
        {profilePath === "import" && (
          <div className="rounded-md bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            Importing from LinkedIn and Upwork is under construction.
            You can continue onboarding and come back later.
          </div>
        )}
        {!profilePath && (
          <p className="text-xs text-muted-foreground">
            Choose one of the paths above to continue.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function StepFourSkills() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Step 4: Skills</CardTitle>
      </CardHeader>
      <CardContent>
        <SkillsSection />
      </CardContent>
    </Card>
  )
}

function StepFiveExperience() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Step 5: Experience</CardTitle>
      </CardHeader>
      <CardContent>
        <ExperienceSection />
      </CardContent>
    </Card>
  )
}

function StepSixEducation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Step 6: Education</CardTitle>
      </CardHeader>
      <CardContent>
        <EducationSection />
      </CardContent>
    </Card>
  )
}

function StepSevenPreferences({ issues }: { issues: Set<string> }) {
  const dispatch = useDispatch()
  const preferences = useSelector(
    (state: RootState) => state.onboarding.preferences,
  )
  const platformsInvalid = issues.has("platforms")
  const projectTypesInvalid = issues.has("projectTypes")
  const timeZonesInvalid = issues.has("timeZones")
  const hourlyMinInvalid = issues.has("hourlyMin")
  const hourlyMaxInvalid = issues.has("hourlyMax")

  const handlePlatformsChange = useCallback(
    (platform: "upwork" | "linkedin") => {
      const current = new Set(preferences.platforms)
      if (current.has(platform)) {
        current.delete(platform)
      } else {
        current.add(platform)
      }
      if (current.size === 0) {
        return
      }
      dispatch(setPlatforms(Array.from(current)))
    },
    [dispatch, preferences.platforms],
  )

  const handleCurrencyChange = useCallback(
    (value: string) => {
      dispatch(setCurrency(value))
    },
    [dispatch],
  )

  const handleHourlyMinChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      const parsed = value ? Number(value) : null
      dispatch(
        setHourlyRange({
          min: parsed !== null && Number.isFinite(parsed) ? parsed : null,
          max: preferences.hourlyMax,
        }),
      )
    },
    [dispatch, preferences.hourlyMax],
  )

  const handleHourlyMaxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      const parsed = value ? Number(value) : null
      dispatch(
        setHourlyRange({
          min: preferences.hourlyMin,
          max: parsed !== null && Number.isFinite(parsed) ? parsed : null,
        }),
      )
    },
    [dispatch, preferences.hourlyMin],
  )

  const handleFixedBudgetMinChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      const parsed = value ? Number(value) : null
      dispatch(setFixedBudgetMin(parsed !== null && Number.isFinite(parsed) ? parsed : null))
    },
    [dispatch],
  )

  const handleProjectTypeChange = useCallback(
    (type: string) => {
      const current = new Set(preferences.projectTypes)
      if (current.has(type)) {
        current.delete(type)
      } else {
        current.add(type)
      }
      dispatch(setProjectTypes(Array.from(current)))
    },
    [dispatch, preferences.projectTypes],
  )

  const handleTimeZoneToggle = useCallback(
    (zone: string) => {
      const current = new Set(preferences.timeZones)
      if (current.has(zone)) {
        current.delete(zone)
      } else {
        current.add(zone)
      }
      dispatch(setTimeZones(Array.from(current)))
    },
    [dispatch, preferences.timeZones],
  )

  const handleRemoteOnlyChange = useCallback(
    (checked: boolean | "indeterminate") => {
      dispatch(setRemoteOnly(checked === true))
    },
    [dispatch],
  )

  const handleTightnessChange = useCallback(
    (value: string[]) => {
      const raw = Number(value[0])
      if (!Number.isFinite(raw)) {
        return
      }
      dispatch(setTightness(raw))
    },
    [dispatch],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Step 7: Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handlePlatformsChange("upwork")}
                className={
                  platformsInvalid
                    ? "border-destructive flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    : "border-input flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                }
              >
                <span>Upwork</span>
                <Checkbox
                  checked={preferences.platforms.includes("upwork")}
                  onCheckedChange={() => handlePlatformsChange("upwork")}
                />
              </button>
              <button
                type="button"
                onClick={() => handlePlatformsChange("linkedin")}
                className={
                  platformsInvalid
                    ? "border-destructive flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    : "border-input flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                }
              >
                <span>LinkedIn</span>
                <Checkbox
                  checked={preferences.platforms.includes("linkedin")}
                  onCheckedChange={() => handlePlatformsChange("linkedin")}
                />
              </button>
            </div>
            {platformsInvalid && (
              <p className="text-xs text-zinc-500">Select at least one</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={preferences.currency}
              onValueChange={handleCurrencyChange}
            >
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
          <div className="space-y-2">
            <Label>Job search tightness</Label>
            <ToggleGroup
              type="single"
              value={String(preferences.tightness)}
              onValueChange={(value) =>
                handleTightnessChange(value ? [value] : [])
              }
              size="sm"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <ToggleGroupItem key={value} value={String(value)}>
                  {value}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-zinc-500">
              1 = very broad, 5 = very strict.
            </p>
          </div>
        </div>
        <Separator />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Hourly rate range</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                placeholder="Min"
                value={preferences.hourlyMin ?? ""}
                onChange={handleHourlyMinChange}
                className={
                  hourlyMinInvalid
                    ? "border-destructive focus-visible:ring-destructive"
                    : undefined
                }
              />
              <Input
                type="number"
                min={0}
                placeholder="Max"
                value={preferences.hourlyMax ?? ""}
                onChange={handleHourlyMaxChange}
                className={
                  hourlyMaxInvalid
                    ? "border-destructive focus-visible:ring-destructive"
                    : undefined
                }
              />
            </div>
            {hourlyMinInvalid && (
              <p className="text-xs text-zinc-500">
                Set an hourly min or fixed budget minimum
              </p>
            )}
            {hourlyMaxInvalid && (
              <p className="text-xs text-zinc-500">
                Hourly max must be greater than or equal to min
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Fixed budget minimum</Label>
            <Input
              type="number"
              min={0}
              placeholder="Optional"
              value={preferences.fixedBudgetMin ?? ""}
              onChange={handleFixedBudgetMinChange}
              className={
                hourlyMinInvalid
                  ? "border-destructive focus-visible:ring-destructive"
                  : undefined
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Project types</Label>
            <div className="flex flex-col gap-2">
              <label
                className={
                  projectTypesInvalid
                    ? "flex items-center justify-between rounded-md border border-destructive px-3 py-2 text-sm"
                    : "flex items-center justify-between rounded-md border border-input px-3 py-2 text-sm"
                }
              >
                <span>Short gigs</span>
                <Checkbox
                  checked={preferences.projectTypes.includes("short_gig")}
                  onCheckedChange={() =>
                    handleProjectTypeChange("short_gig")
                  }
                />
              </label>
              <label
                className={
                  projectTypesInvalid
                    ? "flex items-center justify-between rounded-md border border-destructive px-3 py-2 text-sm"
                    : "flex items-center justify-between rounded-md border border-input px-3 py-2 text-sm"
                }
              >
                <span>Medium projects</span>
                <Checkbox
                  checked={preferences.projectTypes.includes(
                    "medium_project",
                  )}
                  onCheckedChange={() =>
                    handleProjectTypeChange("medium_project")
                  }
                />
              </label>
            </div>
            {projectTypesInvalid && (
              <p className="text-xs text-zinc-500">Select at least one</p>
            )}
          </div>
        </div>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Time zones</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TIMEZONES.map((zone) => {
                const active = preferences.timeZones.includes(zone)
                return (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => handleTimeZoneToggle(zone)}
                    className={
                      active
                        ? "bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs"
                        : timeZonesInvalid
                          ? "border-destructive rounded-full border px-3 py-1 text-xs"
                          : "border-input rounded-full border px-3 py-1 text-xs"
                    }
                  >
                    {zone}
                  </button>
                )
              })}
            </div>
            {timeZonesInvalid && (
              <p className="text-xs text-zinc-500">Pick at least one</p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
            <div>
              <Label className="text-sm font-medium">Remote only</Label>
              <p className="text-xs text-zinc-500">
                Only show fully remote roles.
              </p>
            </div>
            <Checkbox
              checked={preferences.remoteOnly}
              onCheckedChange={handleRemoteOnlyChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { session } = useSession()
  const [userRole, setUserRole] = useState<"leader" | "member" | null>(null)
  const [clientErrors, setClientErrors] = useState<string[]>([])
  const currentStep = useSelector(
    (state: RootState) => state.onboarding.currentStep,
  )
  const totalSteps = useSelector(
    (state: RootState) => state.onboarding.totalSteps,
  )
  const state = useSelector((root: RootState) => root.onboarding)

  const isSaving = state.isSaving
  const saveError = state.saveError

  const canGoBack = currentStep > 1

  const stepValidities = useMemo(() => {
    const step1 = profileSchema.safeParse(state.profile).success
    const step2 = teamModeSchema.safeParse(state.teamMode).success
    const step3 = profilePathSchema.safeParse(state.profilePath).success
    const step4 = true
    const step5 = true
    const step6 = true
    const step7 = preferencesSchema.safeParse(state.preferences).success
    return { step1, step2, step3, step4, step5, step6, step7 }
  }, [state.preferences, state.profile, state.profilePath, state.teamMode])

  const currentStepIssues = useMemo(() => {
    if (currentStep === 1) {
      const result = profileSchema.safeParse(state.profile)
      return result.success ? new Set<string>() : collectIssueKeys(result.error)
    }

    if (currentStep === 2) {
      return new Set<string>()
    }

    if (currentStep === 3) {
      const result = profilePathSchema.safeParse(state.profilePath)
      return result.success ? new Set<string>() : new Set<string>(["profilePath"])
    }

    if (currentStep >= 4 && currentStep <= 6) {
      return new Set<string>()
    }

    const result = preferencesSchema.safeParse(state.preferences)
    return result.success ? new Set<string>() : collectIssueKeys(result.error)
  }, [currentStep, state.preferences, state.profile, state.profilePath])

  const remainingLabels = useMemo(
    () => getIssueLabelsForStep(currentStep, currentStepIssues),
    [currentStep, currentStepIssues],
  )

  const stepValidation = useMemo(() => {
    if (currentStep === 1) {
      const result = profileSchema.safeParse(state.profile)
      return {
        valid: result.success,
        errors: result.success
          ? []
          : Object.values(result.error.flatten().fieldErrors).flatMap(
              (items) => items ?? [],
            ),
      }
    }

    if (currentStep === 2) {
      const result = teamModeSchema.safeParse(state.teamMode)
      return { valid: result.success, errors: result.success ? [] : [result.error.message] }
    }

    if (currentStep === 3) {
      const result = profilePathSchema.safeParse(state.profilePath)
      return {
        valid: result.success,
        errors: result.success ? [] : ["Choose a profile path to continue"],
      }
    }

    if (currentStep >= 4 && currentStep <= 6) {
      return { valid: true, errors: [] }
    }

    const result = preferencesSchema.safeParse(state.preferences)
    return {
      valid: result.success,
      errors: result.success
        ? []
        : Object.values(result.error.flatten().fieldErrors).flatMap(
            (items) => items ?? [],
          ),
    }
  }, [currentStep, state.preferences, state.profile, state.profilePath, state.teamMode])

  React.useEffect(() => {
    setClientErrors([])
  }, [currentStep])

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

  const handleNext = useCallback(() => {
    if (!stepValidation.valid) {
      setClientErrors(stepValidation.errors)
      return
    }

    if (currentStep < totalSteps) {
      dispatch(nextStep())
    }
  }, [dispatch, currentStep, totalSteps, stepValidation.errors, stepValidation.valid])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      dispatch(previousStep())
    }
  }, [dispatch, currentStep])

  const handleStepSelect = useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        const canNavigate =
          step <= currentStep ||
          (step === 2 && stepValidities.step1) ||
          (step === 3 && stepValidities.step1 && stepValidities.step2) ||
          (step === 4 &&
            stepValidities.step1 &&
            stepValidities.step2 &&
            stepValidities.step3) ||
          (step === 5 &&
            stepValidities.step1 &&
            stepValidities.step2 &&
            stepValidities.step3 &&
            stepValidities.step4) ||
          (step === 6 &&
            stepValidities.step1 &&
            stepValidities.step2 &&
            stepValidities.step3 &&
            stepValidities.step4 &&
            stepValidities.step5) ||
          (step === 7 &&
            stepValidities.step1 &&
            stepValidities.step2 &&
            stepValidities.step3 &&
            stepValidities.step4 &&
            stepValidities.step5 &&
            stepValidities.step6)

        if (!canNavigate) {
          setClientErrors(remainingLabels.length > 0 ? remainingLabels : ["Complete required fields to continue"])
          return
        }

        dispatch(setCurrentStep(step))
      }
    },
    [currentStep, dispatch, remainingLabels, stepValidities, totalSteps],
  )

  const handleSubmit = useCallback(async () => {
    if (!stepValidation.valid) {
      setClientErrors(stepValidation.errors)
      return
    }

    dispatch(setSaving(true))
    dispatch(setSaveError(null))

    const payload = {
      profile: {
        firstName: state.profile.firstName,
        lastName: state.profile.lastName,
        dateOfBirth: state.profile.dateOfBirth,
      },
      team: {
        mode: state.teamMode,
      },
      cv:
        state.cv.storagePath && state.cv.filename
          ? {
              storagePath: state.cv.storagePath,
              filename: state.cv.filename,
            }
          : null,
      path: state.profilePath,
      skills: state.skills.map((skill) => ({
        name: skill.name,
        level: skill.level,
        years: skill.years,
      })),
      experiences: state.experiences.map((experience) => ({
        title: experience.title,
        company: experience.company,
        startDate: experience.startDate,
        endDate: experience.endDate,
        highlights: experience.highlights,
      })),
      educations: state.educations.map((education) => ({
        school: education.school,
        degree: education.degree,
        field: education.field,
        startYear: education.startYear ? parseInt(education.startYear) : null,
        endYear: education.endYear ? parseInt(education.endYear) : null,
      })),
      preferences: {
        platforms: state.preferences.platforms,
        currency: state.preferences.currency,
        hourlyMin: state.preferences.hourlyMin,
        hourlyMax: state.preferences.hourlyMax,
        fixedBudgetMin: state.preferences.fixedBudgetMin,
        projectTypes: state.preferences.projectTypes,
        timeZones: state.preferences.timeZones,
        remoteOnly: state.preferences.remoteOnly,
        tightness: state.preferences.tightness,
      },
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

      if (score >= 0.8) {
        router.replace("/overview")
      }
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
    stepValidation.errors,
    stepValidation.valid,
  ])

  let content: React.ReactNode

  if (currentStep === 1) {
    content = <StepOne issues={currentStepIssues} />
  } else if (currentStep === 2) {
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
  } else if (currentStep === 3) {
    content = <StepThree invalid={currentStepIssues.has("profilePath")} />
  } else if (currentStep === 4) {
    content = <StepFourSkills />
  } else if (currentStep === 5) {
    content = <StepFiveExperience />
  } else if (currentStep === 6) {
    content = <StepSixEducation />
  } else {
    content = <StepSevenPreferences issues={currentStepIssues} />
  }

  return (
    <div className="space-y-4">
      <StepIndicator />
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1 space-y-4">
          {content}
          {remainingLabels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {remainingLabels.map((label) => (
                <Badge key={label} variant="outline" className="text-muted-foreground">
                  {label}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={!canGoBack || isSaving}
              onClick={handleBack}
            >
              Back
            </Button>
            {currentStep < totalSteps && (
              <Button
                type="button"
                disabled={isSaving || !stepValidation.valid}
                onClick={handleNext}
              >
                Next
              </Button>
            )}
            {currentStep === totalSteps && (
              <Button
                type="button"
                disabled={isSaving || !stepValidation.valid}
                onClick={handleSubmit}
              >
                {isSaving ? "Saving..." : "Finish onboarding"}
              </Button>
            )}
          </div>
          {clientErrors.length > 0 && (
            <div className="space-y-1 text-xs text-destructive">
              {clientErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}
          {saveError && (
            <p className="text-xs text-destructive">
              {saveError}
            </p>
          )}
        </div>
        <div className="hidden w-64 flex-none flex-col gap-3 rounded-lg bg-muted p-4 text-sm text-muted-foreground md:flex">
          <div className="text-foreground font-semibold">What this setup powers</div>
          <p>
            Your profile, skills, experience, and preferences are used by
            the job search and ranking engine in the backend.
          </p>
          <p>
            The backend persists this data in Supabase tables
            and computes a profile completeness score used to gate
            agent triggers.
          </p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const step = index + 1
          const canNavigate =
            step <= currentStep ||
            (step === 2 && stepValidities.step1) ||
            (step === 3 && stepValidities.step1 && stepValidities.step2) ||
            (step === 4 &&
              stepValidities.step1 &&
              stepValidities.step2 &&
              stepValidities.step3) ||
            (step === 5 &&
              stepValidities.step1 &&
              stepValidities.step2 &&
              stepValidities.step3 &&
              stepValidities.step4) ||
            (step === 6 &&
              stepValidities.step1 &&
              stepValidities.step2 &&
              stepValidities.step3 &&
              stepValidities.step4 &&
              stepValidities.step5) ||
            (step === 7 &&
              stepValidities.step1 &&
              stepValidities.step2 &&
              stepValidities.step3 &&
              stepValidities.step4 &&
              stepValidities.step5 &&
              stepValidities.step6)

          return (
            <button
              key={step}
              type="button"
              disabled={!canNavigate || isSaving}
              onClick={() => handleStepSelect(step)}
              className={
                step === currentStep
                  ? "bg-primary h-1.5 flex-1 rounded-full"
                  : canNavigate
                    ? "bg-muted h-1.5 flex-1 rounded-full"
                    : "bg-muted/50 h-1.5 flex-1 rounded-full"
              }
            />
          )
        })}
      </div>
    </div>
  )
}
