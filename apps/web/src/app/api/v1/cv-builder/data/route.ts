import { NextRequest } from "next/server"
import { verifyAuth, getSupabaseAdmin } from "@/lib/auth.server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId } = await verifyAuth(authHeader)

    const supabase = getSupabaseAdmin()

    const [profileRes, skillsRes, experiencesRes, educationsRes, generatedCVRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, headline, about, email, location, linkedin_url")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_skills")
          .select("name, level, years")
          .eq("user_id", userId),
        supabase
          .from("user_experiences")
          .select("title, company, start_date, end_date, highlights")
          .eq("user_id", userId),
        supabase
          .from("user_educations")
          .select("school, degree, field, start_year, end_year")
          .eq("user_id", userId),
        supabase
          .from("generated_cvs")
          .select("cv_data")
          .eq("user_id", userId)
          .maybeSingle(),
      ])

    const profile = profileRes.data as {
      display_name: string | null
      headline: string | null
      about: string | null
      email: string | null
      location: string | null
      linkedin_url: string | null
    } | null

    const skills = (skillsRes.data ?? []) as Array<{
      name: string
      level: number
      years: number | null
    }>

    const experiences = (experiencesRes.data ?? []) as Array<{
      title: string
      company: string | null
      start_date: string | null
      end_date: string | null
      highlights: string | null
    }>

    const educations = (educationsRes.data ?? []) as Array<{
      school: string
      degree: string | null
      field: string | null
      start_year: number | null
      end_year: number | null
    }>

    const generatedCV = (generatedCVRes.data as { cv_data: unknown } | null)
      ?.cv_data ?? null

    return Response.json({
      rawProfile: {
        personalInfo: {
          name: profile?.display_name ?? "",
          headline: profile?.headline ?? "",
          email: profile?.email ?? "",
          location: profile?.location ?? "",
          linkedinUrl: profile?.linkedin_url ?? "",
        },
        summary: profile?.about ?? "",
        experiences: experiences.map((e) => ({
          title: e.title,
          company: e.company ?? "",
          startDate: e.start_date ?? "",
          endDate: e.end_date,
          highlights: e.highlights ?? "",
        })),
        educations: educations.map((e) => ({
          school: e.school,
          degree: e.degree ?? "",
          field: e.field ?? "",
          startYear: e.start_year,
          endYear: e.end_year,
        })),
        skills: skills.map((s) => ({
          name: s.name,
          level: s.level,
          years: s.years,
        })),
      },
      generatedCV,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Missing or invalid Authorization header" ||
        error.message === "Unauthorized")
    ) {
      return Response.json(
        { error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      )
    }

    return Response.json(
      {
        error: {
          code: "fetch_error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch CV data",
        },
      },
      { status: 500 }
    )
  }
}
