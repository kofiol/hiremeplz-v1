import type { Job, JobFilters, SortOption } from "./types"

export function formatBudget(job: Job): string {
  if (job.budget_type === "hourly") {
    if (job.hourly_min != null && job.hourly_max != null) {
      return `$${job.hourly_min}–${job.hourly_max}/hr`
    }
    if (job.hourly_min != null) return `From $${job.hourly_min}/hr`
    if (job.hourly_max != null) return `Up to $${job.hourly_max}/hr`
  }
  if (job.budget_type === "fixed") {
    if (job.fixed_budget_min != null && job.fixed_budget_max != null) {
      if (job.fixed_budget_min === job.fixed_budget_max) {
        return `Fixed $${job.fixed_budget_min.toLocaleString()}`
      }
      return `Fixed $${job.fixed_budget_min.toLocaleString()}–${job.fixed_budget_max.toLocaleString()}`
    }
    if (job.fixed_budget_min != null) return `Fixed from $${job.fixed_budget_min.toLocaleString()}`
    if (job.fixed_budget_max != null) return `Fixed up to $${job.fixed_budget_max.toLocaleString()}`
  }
  return "Budget not specified"
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Unknown"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function getScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
  if (score >= 40) return "text-amber-400 bg-amber-400/10 border-amber-400/20"
  return "text-red-400 bg-red-400/10 border-red-400/20"
}

export function getScoreBarColor(score: number): string {
  if (score >= 70) return "bg-emerald-400"
  if (score >= 40) return "bg-amber-400"
  return "bg-red-400"
}

function getBudgetValue(job: Job): number {
  if (job.budget_type === "hourly") return job.hourly_max ?? job.hourly_min ?? 0
  if (job.budget_type === "fixed") return job.fixed_budget_max ?? job.fixed_budget_min ?? 0
  return 0
}

export function filterJobs(jobs: Job[], filters: JobFilters): Job[] {
  return jobs.filter((job) => {
    if (filters.platforms.length > 0 && !filters.platforms.includes(job.platform)) {
      return false
    }

    const budget = getBudgetValue(job)
    if (filters.salaryMin != null && budget > 0 && budget < filters.salaryMin) {
      return false
    }
    if (filters.salaryMax != null && budget > 0 && budget > filters.salaryMax) {
      return false
    }

    if (filters.skills.length > 0) {
      const jobSkillsLower = job.skills.map((s) => s.toLowerCase())
      const hasMatch = filters.skills.some((s) => jobSkillsLower.includes(s.toLowerCase()))
      if (!hasMatch) return false
    }

    if (filters.seniority && job.seniority) {
      if (job.seniority.toLowerCase() !== filters.seniority.toLowerCase()) return false
    }

    if (job.ranking && job.ranking.tightness < filters.tightness) {
      return false
    }

    return true
  })
}

export function sortJobs(jobs: Job[], sort: SortOption): Job[] {
  const sorted = [...jobs]
  switch (sort) {
    case "score":
      return sorted.sort((a, b) => (b.ranking?.score ?? 0) - (a.ranking?.score ?? 0))
    case "date":
      return sorted.sort((a, b) => {
        const dateA = a.posted_at ? new Date(a.posted_at).getTime() : 0
        const dateB = b.posted_at ? new Date(b.posted_at).getTime() : 0
        return dateB - dateA
      })
    case "salary":
      return sorted.sort((a, b) => getBudgetValue(b) - getBudgetValue(a))
    default:
      return sorted
  }
}

export function getAllSkills(jobs: Job[]): string[] {
  const skillSet = new Set<string>()
  for (const job of jobs) {
    for (const skill of job.skills) {
      skillSet.add(skill)
    }
  }
  return Array.from(skillSet).sort()
}
