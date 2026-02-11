export type Job = {
  id: string
  platform: "upwork" | "linkedin"
  platform_job_id: string
  title: string
  description: string
  apply_url: string
  posted_at: string | null
  budget_type: "hourly" | "fixed" | "unknown"
  hourly_min: number | null
  hourly_max: number | null
  fixed_budget_min: number | null
  fixed_budget_max: number | null
  currency: string
  client_country: string | null
  client_rating: number | null
  client_hires: number | null
  client_payment_verified: boolean | null
  skills: string[]
  seniority: string | null
  category: string | null
  company_name: string | null
  company_logo_url: string | null
  ai_summary: string | null
  is_bookmarked: boolean
  ranking: {
    score: number
    tightness: number
    breakdown: {
      skill_match: number
      budget_fit: number
      client_quality: number
      scope_fit: number
      win_probability: number
    }
    reasoning: string
    created_at: string
  } | null
}

export type JobFilters = {
  platforms: ("upwork" | "linkedin")[]
  salaryMin: number | null
  salaryMax: number | null
  skills: string[]
  seniority: string | null
  tightness: number
}

export type SortOption = "score" | "date" | "salary"

export const DEFAULT_FILTERS: JobFilters = {
  platforms: [],
  salaryMin: null,
  salaryMax: null,
  skills: [],
  seniority: null,
  tightness: 3,
}
