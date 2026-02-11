import "server-only"
import { getSupabaseAdmin } from "@/lib/auth.server"

// ============================================================================
// Types
// ============================================================================

export interface UserContext {
  profile: {
    displayName: string | null
    headline: string | null
    about: string | null
    location: string | null
    countryCode: string | null
  }
  skills: {
    name: string
    level: number
    years: number | null
  }[]
  experiences: {
    title: string
    company: string | null
    startDate: string | null
    endDate: string | null
    highlights: string | null
  }[]
  preferences: {
    hourlyMin: number | null
    hourlyMax: number | null
    currency: string
    tightness: number
    platforms: string[]
    projectTypes: string[]
  }
}

// ============================================================================
// Fetcher
// ============================================================================

export async function fetchUserContext(userId: string): Promise<UserContext> {
  const supabase = getSupabaseAdmin()

  const [profileRes, skillsRes, experiencesRes, preferencesRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, headline, about, location, country_code")
        .eq("user_id", userId)
        .maybeSingle<{
          display_name: string | null
          headline: string | null
          about: string | null
          location: string | null
          country_code: string | null
        }>(),
      supabase
        .from("user_skills")
        .select("name, level, years")
        .eq("user_id", userId)
        .returns<{ name: string; level: number; years: number | null }[]>(),
      supabase
        .from("user_experiences")
        .select("title, company, start_date, end_date, highlights")
        .eq("user_id", userId)
        .returns<
          {
            title: string
            company: string | null
            start_date: string | null
            end_date: string | null
            highlights: string | null
          }[]
        >(),
      supabase
        .from("user_preferences")
        .select("hourly_min, hourly_max, currency, tightness, platforms, project_types")
        .eq("user_id", userId)
        .maybeSingle<{
          hourly_min: number | null
          hourly_max: number | null
          currency: string
          tightness: number
          platforms: string[]
          project_types: string[]
        }>(),
    ])

  const profile = profileRes.data
  const preferences = preferencesRes.data

  return {
    profile: {
      displayName: profile?.display_name ?? null,
      headline: profile?.headline ?? null,
      about: profile?.about ?? null,
      location: profile?.location ?? null,
      countryCode: profile?.country_code ?? null,
    },
    skills: skillsRes.data ?? [],
    experiences: (experiencesRes.data ?? []).map((e) => ({
      title: e.title,
      company: e.company,
      startDate: e.start_date,
      endDate: e.end_date,
      highlights: e.highlights,
    })),
    preferences: {
      hourlyMin: preferences?.hourly_min ?? null,
      hourlyMax: preferences?.hourly_max ?? null,
      currency: preferences?.currency ?? "USD",
      tightness: preferences?.tightness ?? 3,
      platforms: preferences?.platforms ?? [],
      projectTypes: preferences?.project_types ?? [],
    },
  }
}

// ============================================================================
// String Formatter (for overview chat compatibility)
// ============================================================================

export function formatUserContextAsString(ctx: UserContext): string {
  const sections: string[] = []

  if (ctx.profile.displayName) sections.push(`Name: ${ctx.profile.displayName}`)
  if (ctx.profile.headline) sections.push(`Headline: ${ctx.profile.headline}`)
  if (ctx.profile.about) sections.push(`About: ${ctx.profile.about}`)

  if (ctx.skills.length > 0) {
    const skillList = ctx.skills
      .map((s) => {
        let str = s.name
        if (s.years) str += ` (${s.years}y)`
        return str
      })
      .join(", ")
    sections.push(`Skills: ${skillList}`)
  }

  if (ctx.experiences.length > 0) {
    const expList = ctx.experiences
      .map((e) => {
        let str = e.title
        if (e.company) str += ` at ${e.company}`
        if (e.startDate || e.endDate) {
          str += ` (${e.startDate ?? "?"} - ${e.endDate ?? "present"})`
        }
        if (e.highlights) str += `\n  Highlights: ${e.highlights}`
        return str
      })
      .join("\n")
    sections.push(`Experience:\n${expList}`)
  }

  if (ctx.preferences.hourlyMin || ctx.preferences.hourlyMax) {
    sections.push(
      `Rate: ${ctx.preferences.currency} ${ctx.preferences.hourlyMin ?? "?"}–${ctx.preferences.hourlyMax ?? "?"}/hr`,
    )
  }

  return sections.length > 0
    ? sections.join("\n\n")
    : "No profile data available."
}
