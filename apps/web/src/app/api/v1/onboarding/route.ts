import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, supabaseAdmin } from "@/lib/auth.server";
import { computeAndUpdateProfileCompleteness } from "@/lib/profile-completeness.server";

const onboardingSchema = z.object({
  team: z
    .object({
      mode: z.enum(["solo", "team"]).optional(),
    })
    .optional(),
  cv: z
    .object({
      storagePath: z.string().min(1),
      filename: z.string().min(1),
    })
    .optional()
    .nullable(),
  path: z
    .enum(["linkedin", "upwork", "cv", "portfolio", "manual"])
    .optional()
    .nullable(),
  profileSetup: z
    .object({
      linkedinUrl: z.string().optional(),
      upworkUrl: z.string().optional(),
      portfolioUrl: z.string().optional(),
    })
    .optional()
    .nullable(),
  experienceLevel: z
    .enum([
      "intern_new_grad",
      "entry",
      "mid",
      "senior",
      "lead",
      "director",
    ])
    .optional()
    .nullable(),
  skills: z
    .array(
      z.object({
        name: z.string().min(1),
        level: z.number().int().min(1).max(5).optional().nullable(),
        years: z.number().min(0).optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  experiences: z
    .array(
      z.object({
        title: z.string().min(1),
        company: z.string().optional().nullable(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
        highlights: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  educations: z
    .array(
      z.object({
        school: z.string().min(1),
        degree: z.string().optional().nullable(),
        field: z.string().optional().nullable(),
        startYear: z.number().int().optional().nullable(),
        endYear: z.number().int().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  preferences: z
    .object({
      currency: z.string().min(1).optional(),
      hourlyMin: z.number().min(0).optional().nullable(),
      hourlyMax: z.number().min(0).optional().nullable(),
      fixedBudgetMin: z.number().min(0).optional().nullable(),
      timeZones: z.array(z.string()).optional().nullable(),
      remoteOnly: z.boolean().optional().nullable(),
      preferredProjectLengthDays: z
        .tuple([
          z.number().int().min(1).max(365),
          z.number().int().min(1).max(365),
        ])
        .optional()
        .nullable(),
      engagementTypes: z
        .array(z.enum(["full_time", "part_time", "internship"]))
        .optional()
        .nullable(),
      tightness: z.number().int().min(1).max(5).optional(),
    })
    .optional()
    .nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const authContext = await verifyAuth(authHeader);

    const json = await request.json();
    const parsed = onboardingSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_payload",
            message: "Invalid onboarding payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const {
      team,
      cv,
      skills,
      experiences,
      educations,
      preferences,
      path,
      profileSetup,
      experienceLevel,
    } = parsed.data;

    const primaryTimeZone =
      preferences?.timeZones && preferences.timeZones.length > 0
        ? preferences.timeZones[0]
        : null;

    if (primaryTimeZone) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          timezone: primaryTimeZone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId);

      if (profileUpdateError) {
        return NextResponse.json(
          {
            error: {
              code: "profile_update_failed",
              message: "Failed to update profile",
              details: profileUpdateError.message,
            },
          },
          { status: 500 },
        );
      }
    }

    if (cv && cv.storagePath && cv.filename) {
      const { error: cvInsertError } = await supabaseAdmin.from(
        "user_cv_files",
      ).insert({
        team_id: authContext.teamId,
        user_id: authContext.userId,
        storage_path: cv.storagePath,
        filename: cv.filename,
      });

      if (cvInsertError) {
        return NextResponse.json(
          {
            error: {
              code: "cv_persist_failed",
              message: "Failed to persist CV metadata",
              details: cvInsertError.message,
            },
          },
          { status: 500 },
        );
      }
    }

    if (skills !== undefined && skills !== null) {
      const { error: skillsDeleteError } = await supabaseAdmin
        .from("user_skills")
        .delete()
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId);

      if (skillsDeleteError) {
        return NextResponse.json(
          {
            error: {
              code: "skills_reset_failed",
              message: "Failed to reset skills",
              details: skillsDeleteError.message,
            },
          },
          { status: 500 },
        );
      }

      if (skills.length > 0) {
        const { error: skillsInsertError } = await supabaseAdmin
          .from("user_skills")
          .insert(
            skills.map((skill) => ({
              team_id: authContext.teamId,
              user_id: authContext.userId,
              name: skill.name,
              level: skill.level ?? 3,
              years: skill.years ?? null,
            })),
          );

        if (skillsInsertError) {
          return NextResponse.json(
            {
              error: {
                code: "skills_persist_failed",
                message: "Failed to persist skills",
                details: skillsInsertError.message,
              },
            },
            { status: 500 },
          );
        }
      }
    }

    if (experiences !== undefined && experiences !== null) {
      const { error: experiencesDeleteError } = await supabaseAdmin
        .from("user_experiences")
        .delete()
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId);

      if (experiencesDeleteError) {
        return NextResponse.json(
          {
            error: {
              code: "experiences_reset_failed",
              message: "Failed to reset experiences",
              details: experiencesDeleteError.message,
            },
          },
          { status: 500 },
        );
      }

      if (experiences.length > 0) {
        const { error: experiencesInsertError } = await supabaseAdmin
          .from("user_experiences")
          .insert(
            experiences.map((experience) => ({
              team_id: authContext.teamId,
              user_id: authContext.userId,
              title: experience.title,
              company: experience.company ?? null,
              start_date: experience.startDate ?? null,
              end_date: experience.endDate ?? null,
              highlights: experience.highlights ?? null,
            })),
          );

        if (experiencesInsertError) {
          return NextResponse.json(
            {
              error: {
                code: "experiences_persist_failed",
                message: "Failed to persist experiences",
                details: experiencesInsertError.message,
              },
            },
            { status: 500 },
          );
        }
      }
    }

    if (educations !== undefined && educations !== null) {
      const { error: educationsDeleteError } = await supabaseAdmin
        .from("user_educations")
        .delete()
        .eq("user_id", authContext.userId)
        .eq("team_id", authContext.teamId);

      if (educationsDeleteError) {
        return NextResponse.json(
          {
            error: {
              code: "educations_reset_failed",
              message: "Failed to reset educations",
              details: educationsDeleteError.message,
            },
          },
          { status: 500 },
        );
      }

      if (educations.length > 0) {
        const { error: educationsInsertError } = await supabaseAdmin
          .from("user_educations")
          .insert(
            educations.map((education) => ({
              team_id: authContext.teamId,
              user_id: authContext.userId,
              school: education.school,
              degree: education.degree ?? null,
              field: education.field ?? null,
              start_year: education.startYear ?? null,
              end_year: education.endYear ?? null,
            })),
          );

        if (educationsInsertError) {
          return NextResponse.json(
            {
              error: {
                code: "educations_persist_failed",
                message: "Failed to persist educations",
                details: educationsInsertError.message,
              },
            },
            { status: 500 },
          );
        }
      }
    }

    if (preferences !== undefined && preferences !== null) {
      const { error: preferencesError } = await supabaseAdmin
        .from("user_preferences")
        .upsert(
          {
            user_id: authContext.userId,
            team_id: authContext.teamId,
            platforms: ["upwork", "linkedin"],
            currency: preferences.currency ?? "USD",
            hourly_min: preferences.hourlyMin ?? null,
            hourly_max: preferences.hourlyMax ?? null,
            fixed_budget_min: preferences.fixedBudgetMin ?? null,
            project_types: ["short_gig", "medium_project"],
            tightness: preferences.tightness ?? 3,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );

      if (preferencesError) {
        return NextResponse.json(
          {
            error: {
              code: "preferences_persist_failed",
              message: "Failed to persist preferences",
              details: preferencesError.message,
            },
          },
          { status: 500 },
        );
      }
    }

    const { data: existingAgentSettings, error: existingAgentSettingsError } =
      await supabaseAdmin
        .from("user_agent_settings")
        .select("settings_json")
        .eq("team_id", authContext.teamId)
        .eq("user_id", authContext.userId)
        .eq("agent_type", "job_search")
        .maybeSingle<{ settings_json: Record<string, unknown> | null }>();

    if (existingAgentSettingsError) {
      return NextResponse.json(
        {
          error: {
            code: "agent_settings_load_failed",
            message: "Failed to load agent settings",
            details: existingAgentSettingsError.message,
          },
        },
        { status: 500 },
      );
    }

    const currentSettings = existingAgentSettings?.settings_json ?? {};
    const nextSettings: Record<string, unknown> = {
      ...currentSettings,
      onboarding: {
        ...(typeof currentSettings.onboarding === "object" &&
        currentSettings.onboarding !== null
          ? (currentSettings.onboarding as Record<string, unknown>)
          : {}),
        team_mode: team?.mode ?? null,
        profile_setup_method: path ?? null,
        profile_setup: profileSetup ?? null,
        experience_level: experienceLevel ?? null,
      },
    };

    if (preferences?.timeZones) {
      nextSettings.time_zones = preferences.timeZones;
    }
    if (typeof preferences?.remoteOnly === "boolean") {
      nextSettings.remote_only = preferences.remoteOnly;
    }
    if (preferences?.preferredProjectLengthDays) {
      nextSettings.preferred_project_length_days = preferences.preferredProjectLengthDays;
    }
    if (preferences?.engagementTypes) {
      nextSettings.engagement_types = preferences.engagementTypes;
    }

    const { error: agentSettingsError } = await supabaseAdmin
      .from("user_agent_settings")
      .upsert(
        {
          team_id: authContext.teamId,
          user_id: authContext.userId,
          agent_type: "job_search",
          settings_json: nextSettings,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "team_id,user_id,agent_type",
        },
      );

    if (agentSettingsError) {
      return NextResponse.json(
        {
          error: {
            code: "agent_settings_persist_failed",
            message: "Failed to persist agent settings",
            details: agentSettingsError.message,
          },
        },
        { status: 500 },
      );
    }

    const completeness = await computeAndUpdateProfileCompleteness(authContext);

    return NextResponse.json(
      {
        profile_completeness_score: completeness.score,
        missing_fields: completeness.missingFields,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: "onboarding_save_failed",
            message: error.message,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "onboarding_save_failed",
          message: "Unknown error",
        },
      },
      { status: 500 },
    );
  }
}
