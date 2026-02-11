"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowDownUp, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { JobFeed } from "@/components/jobs/job-feed"
import { JobFilterSidebar } from "@/components/jobs/job-filter-sidebar"
import { JobDetailDrawer } from "@/components/jobs/job-detail-drawer"
import { MOCK_JOBS } from "@/lib/jobs/mock-data"
import { DEFAULT_FILTERS } from "@/lib/jobs/types"
import { filterJobs, sortJobs, getAllSkills } from "@/lib/jobs/utils"
import type { Job, JobFilters, SortOption } from "@/lib/jobs/types"

const PAGE_SIZE = 8

function parseFiltersFromParams(params: URLSearchParams): JobFilters {
  const platforms = params.get("platforms")
  const skills = params.get("skills")
  return {
    platforms: platforms ? (platforms.split(",") as ("upwork" | "linkedin")[]) : [],
    salaryMin: params.get("salaryMin") ? Number(params.get("salaryMin")) : null,
    salaryMax: params.get("salaryMax") ? Number(params.get("salaryMax")) : null,
    skills: skills ? skills.split(",") : [],
    seniority: params.get("seniority") ?? null,
    tightness: params.get("tightness") ? Number(params.get("tightness")) : DEFAULT_FILTERS.tightness,
  }
}

function filtersToParams(filters: JobFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.platforms.length > 0) params.set("platforms", filters.platforms.join(","))
  if (filters.salaryMin != null) params.set("salaryMin", String(filters.salaryMin))
  if (filters.salaryMax != null) params.set("salaryMax", String(filters.salaryMax))
  if (filters.skills.length > 0) params.set("skills", filters.skills.join(","))
  if (filters.seniority) params.set("seniority", filters.seniority)
  if (filters.tightness !== DEFAULT_FILTERS.tightness) params.set("tightness", String(filters.tightness))
  return params
}

export default function JobsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [filters, setFilters] = React.useState<JobFilters>(() =>
    parseFiltersFromParams(searchParams)
  )
  const [sort, setSort] = React.useState<SortOption>(
    (searchParams.get("sort") as SortOption) ?? "score"
  )
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE)
  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [jobs, setJobs] = React.useState<Job[]>(MOCK_JOBS)

  // Simulate initial loading
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // All available skills for the filter
  const allSkills = React.useMemo(() => getAllSkills(MOCK_JOBS), [])

  // Apply filters and sorting
  const processedJobs = React.useMemo(() => {
    const filtered = filterJobs(jobs, filters)
    return sortJobs(filtered, sort)
  }, [jobs, filters, sort])

  const visibleJobs = processedJobs.slice(0, visibleCount)
  const hasMore = visibleCount < processedJobs.length

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job)
    setDrawerOpen(true)
  }

  const handleToggleBookmark = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, is_bookmarked: !j.is_bookmarked } : j))
    )
  }

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE)
  }

  const handleApplyFilters = () => {
    const params = filtersToParams(filters)
    if (sort !== "score") params.set("sort", sort)
    router.replace(`/jobs?${params.toString()}`, { scroll: false })
    setVisibleCount(PAGE_SIZE)
  }

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setSort("score")
    router.replace("/jobs", { scroll: false })
    setVisibleCount(PAGE_SIZE)
  }

  const handleSortChange = (value: string) => {
    setSort(value as SortOption)
    const params = filtersToParams(filters)
    if (value !== "score") params.set("sort", value)
    router.replace(`/jobs?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold">Job Discovery</h1>
            {!isLoading && (
              <span className="text-xs text-muted-foreground">
                {processedJobs.length} {processedJobs.length === 1 ? "job" : "jobs"} found
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Sort */}
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <ArrowDownUp className="size-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">By score</SelectItem>
                <SelectItem value="date">By date</SelectItem>
                <SelectItem value="salary">By salary</SelectItem>
              </SelectContent>
            </Select>

            {/* Fetch new jobs button */}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <RefreshCw className="size-3.5" />
              Fetch new jobs
            </Button>
          </div>
        </div>

        {/* Feed */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4">
            <JobFeed
              jobs={visibleJobs}
              isLoading={isLoading}
              hasMore={hasMore}
              onSelectJob={handleSelectJob}
              onToggleBookmark={handleToggleBookmark}
              onLoadMore={handleLoadMore}
            />
          </div>
        </ScrollArea>
      </div>

      {/* Filter sidebar */}
      <JobFilterSidebar
        filters={filters}
        allSkills={allSkills}
        onFiltersChange={setFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* Detail drawer */}
      <JobDetailDrawer
        job={selectedJob}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}
