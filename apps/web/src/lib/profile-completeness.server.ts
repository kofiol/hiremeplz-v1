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
    agentSettingsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("email, timezone")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .maybeSingle<{
        email: string | null;
        timezone: string | null;
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
    supabaseAdmin
      .from("user_agent_settings")
      .select("settings_json")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .eq("agent_type", "job_search")
      .maybeSingle<{ settings_json: Record<string, unknown> | null }>(),
  ]);

  const missingFields: string[] = [];
  let score = 0;

  if (profileResult.error) {
    throw profileResult.error;
  }

  const profile = profileResult.data;

  const hasBasicProfile =
    !!profile && !!profile.email && !!profile.timezone;

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

  if (agentSettingsResult.error) {
    throw agentSettingsResult.error;
  }

  const agentSettings = agentSettingsResult.data?.settings_json ?? {};
  const timeZones =
    Array.isArray(agentSettings.time_zones) &&
    agentSettings.time_zones.every((value) => typeof value === "string")
      ? (agentSettings.time_zones as string[])
      : [];
  const engagementTypes =
    Array.isArray(agentSettings.engagement_types) &&
    agentSettings.engagement_types.every((value) => typeof value === "string")
      ? (agentSettings.engagement_types as string[])
      : [];
  const preferredProjectLengthDays =
    Array.isArray(agentSettings.preferred_project_length_days) &&
    agentSettings.preferred_project_length_days.length === 2 &&
    agentSettings.preferred_project_length_days.every(
      (value) => typeof value === "number",
    )
      ? (agentSettings.preferred_project_length_days as [number, number])
      : null;

  const hasConstraints =
    timeZones.length > 0 &&
    engagementTypes.length > 0 &&
    !!preferredProjectLengthDays &&
    preferredProjectLengthDays[0] >= 1 &&
    preferredProjectLengthDays[1] <= 365 &&
    preferredProjectLengthDays[0] <= preferredProjectLengthDays[1];

  const hasPreferences =
    !!preferences &&
    !!preferences.currency &&
    ((preferences.hourly_min ?? null) !== null ||
      (preferences.fixed_budget_min ?? null) !== null) &&
    hasConstraints;

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

