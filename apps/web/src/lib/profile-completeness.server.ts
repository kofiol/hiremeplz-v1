"use server";

import "server-only";
import { supabaseAdmin } from "./auth.server";
import type { AuthContext } from "./auth.server";

export type ProfileCompletenessResult = {
  score: number;
  missingFields: string[];
};

export async function computeAndUpdateProfileCompleteness(
  context: AuthContext,
): Promise<ProfileCompletenessResult> {
  const { userId, teamId } = context;

  const [
    profileResult,
    cvFilesResult,
    skillsResult,
    experiencesResult,
    educationsResult,
    preferencesResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("email, display_name, timezone, date_of_birth")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .maybeSingle<{
        email: string | null;
        display_name: string | null;
        timezone: string | null;
        date_of_birth: string | null;
      }>(),
    supabaseAdmin
      .from("user_cv_files")
      .select("id")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .limit(1),
    supabaseAdmin
      .from("user_skills")
      .select("id")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .limit(1),
    supabaseAdmin
      .from("user_experiences")
      .select("id")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .limit(1),
    supabaseAdmin
      .from("user_educations")
      .select("id")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .limit(1),
    supabaseAdmin
      .from("user_preferences")
      .select("currency, hourly_min, fixed_budget_min, project_types")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .maybeSingle<{
        currency: string | null;
        hourly_min: number | null;
        fixed_budget_min: number | null;
        project_types: string[] | null;
      }>(),
  ]);

  const missingFields: string[] = [];
  let score = 0;

  if (profileResult.error) {
    throw profileResult.error;
  }

  const profile = profileResult.data;

  const hasBasicProfile =
    !!profile &&
    !!profile.display_name &&
    !!profile.email &&
    !!profile.timezone &&
    !!profile.date_of_birth;

  if (hasBasicProfile) {
    score += 0.2;
  } else {
    missingFields.push("basic_profile");
  }

  if (cvFilesResult.error) {
    throw cvFilesResult.error;
  }

  const hasCv = !!cvFilesResult.data && cvFilesResult.data.length > 0;

  if (hasCv) {
    score += 0.2;
  } else {
    missingFields.push("cv");
  }

  if (skillsResult.error) {
    throw skillsResult.error;
  }

  const hasSkills = !!skillsResult.data && skillsResult.data.length > 0;

  if (hasSkills) {
    score += 0.2;
  } else {
    missingFields.push("skills");
  }

  if (experiencesResult.error) {
    throw experiencesResult.error;
  }

  if (educationsResult.error) {
    throw educationsResult.error;
  }

  const hasExperienceOrEducation =
    (experiencesResult.data?.length ?? 0) > 0 ||
    (educationsResult.data?.length ?? 0) > 0;

  if (hasExperienceOrEducation) {
    score += 0.2;
  } else {
    missingFields.push("experience_or_education");
  }

  if (preferencesResult.error) {
    throw preferencesResult.error;
  }

  const preferences = preferencesResult.data;

  const hasPreferences =
    !!preferences &&
    !!preferences.currency &&
    ((preferences.hourly_min ?? null) !== null ||
      (preferences.fixed_budget_min ?? null) !== null) &&
    !!preferences.project_types &&
    preferences.project_types.length > 0;

  if (hasPreferences) {
    score += 0.2;
  } else {
    missingFields.push("preferences");
  }

  if (score > 1) {
    score = 1;
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      profile_completeness_score: score,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("team_id", teamId);

  if (updateError) {
    throw updateError;
  }

  return {
    score,
    missingFields,
  };
}

