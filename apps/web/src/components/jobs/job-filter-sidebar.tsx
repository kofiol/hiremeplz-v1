"use client"

import * as React from "react"
import { Filter, X, Linkedin, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { JobFilters } from "@/lib/jobs/types"
import { DEFAULT_FILTERS } from "@/lib/jobs/types"

function UpworkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.214-1.832-2.148-4.032-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.548-1.405-.002-2.543-1.143-2.545-2.548V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z" />
    </svg>
  )
}

const SIDEBAR_WIDTH = "15rem"
const SIDEBAR_WIDTH_ICON = "2.75rem"

const TIGHTNESS_LABELS: Record<number, string> = {
  1: "Very loose",
  2: "Loose",
  3: "Balanced",
  4: "Tight",
  5: "Very tight",
}

type JobFilterSidebarProps = {
  filters: JobFilters
  allSkills: string[]
  onFiltersChange: (filters: JobFilters) => void
  onApply: () => void
  onReset: () => void
}

export function JobFilterSidebar({
  filters,
  allSkills,
  onFiltersChange,
  onApply,
  onReset,
}: JobFilterSidebarProps) {
  const [isExpanded, setIsExpanded] = React.useState(true)
  const [skillSearch, setSkillSearch] = React.useState("")

  const filteredSkills = React.useMemo(() => {
    if (!skillSearch) return allSkills.slice(0, 20)
    return allSkills
      .filter((s) => s.toLowerCase().includes(skillSearch.toLowerCase()))
      .slice(0, 20)
  }, [allSkills, skillSearch])

  const hasActiveFilters =
    filters.platforms.length > 0 ||
    filters.salaryMin != null ||
    filters.salaryMax != null ||
    filters.skills.length > 0 ||
    filters.seniority != null ||
    filters.tightness !== DEFAULT_FILTERS.tightness

  const updateFilter = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const togglePlatform = (platform: "upwork" | "linkedin") => {
    const current = filters.platforms
    const next = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform]
    updateFilter("platforms", next)
  }

  const toggleSkill = (skill: string) => {
    const current = filters.skills
    const next = current.includes(skill)
      ? current.filter((s) => s !== skill)
      : [...current, skill]
    updateFilter("skills", next)
  }

  return (
    <div
      className="hidden lg:flex flex-col shrink-0 border-l bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear overflow-hidden"
      style={{ width: isExpanded ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON }}
      data-state={isExpanded ? "expanded" : "collapsed"}
      data-side="right"
    >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-1 p-2 shrink-0",
            !isExpanded && "flex-col"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="size-7 shrink-0 relative"
              >
                <Filter className="size-4" />
                {!isExpanded && hasActiveFilters && (
                  <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isExpanded ? "Collapse filters" : "Expand filters"}
            </TooltipContent>
          </Tooltip>

          {isExpanded && (
            <>
              <span className="text-sm font-medium truncate flex-1">
                Filters
              </span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={onReset}
                >
                  Reset
                </Button>
              )}
            </>
          )}
        </div>

        {/* Filter controls */}
        {isExpanded && (
          <ScrollArea className="flex-1 min-h-0 w-full overflow-hidden">
            <div className="px-3 pb-4 space-y-5">

              {/* Platform */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Platform
                </Label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.platforms.includes("linkedin")}
                      onCheckedChange={() => togglePlatform("linkedin")}
                    />
                    <Linkedin className="size-3.5" />
                    <span className="text-sm">LinkedIn</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.platforms.includes("upwork")}
                      onCheckedChange={() => togglePlatform("upwork")}
                    />
                    <UpworkIcon className="size-3.5" />
                    <span className="text-sm">Upwork</span>
                  </label>
                </div>
              </div>

              <Separator />

              {/* Salary range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Budget range
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    className="h-8 text-xs"
                    value={filters.salaryMin ?? ""}
                    onChange={(e) =>
                      updateFilter("salaryMin", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    className="h-8 text-xs"
                    value={filters.salaryMax ?? ""}
                    onChange={(e) =>
                      updateFilter("salaryMax", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Skills */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Skills
                </Label>
                {filters.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {filters.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 cursor-pointer gap-1"
                        onClick={() => toggleSkill(skill)}
                      >
                        {skill}
                        <X className="size-2.5" />
                      </Badge>
                    ))}
                  </div>
                )}
                <Input
                  type="text"
                  placeholder="Search skills..."
                  className="h-8 text-xs"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                />
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {filteredSkills.map((skill) => {
                    const isSelected = filters.skills.includes(skill)
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={cn(
                          "flex items-center gap-2 w-full rounded px-2 py-1 text-xs text-left transition-colors",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent text-muted-foreground"
                        )}
                      >
                        {isSelected && <Check className="size-3 shrink-0" />}
                        <span className={cn(!isSelected && "pl-5")}>{skill}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Seniority */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Seniority
                </Label>
                <Select
                  value={filters.seniority ?? "any"}
                  onValueChange={(v) => updateFilter("seniority", v === "any" ? null : v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Tightness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tightness
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {filters.tightness} — {TIGHTNESS_LABELS[filters.tightness]}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[filters.tightness]}
                  onValueChange={([v]) => updateFilter("tightness", v)}
                />
              </div>

              <Separator />

              {/* Apply button */}
              <Button size="sm" className="w-full" onClick={onApply}>
                Apply filters
              </Button>
            </div>
          </ScrollArea>
        )}
    </div>
  )
}
