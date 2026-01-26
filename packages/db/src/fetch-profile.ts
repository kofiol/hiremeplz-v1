import { Pool, PoolClient } from "pg";

// ============================================================================
// USER PROFILE FETCHER
// ============================================================================
// Fetches a complete UserProfile from the database by aggregating data from:
// - profiles
// - user_skills
// - user_experiences  
// - user_educations
// - user_preferences
//
// This is a read-only operation that doesn't modify any data.
// ============================================================================

export type FetchedUserProfile = {
  user_id: string;
  team_id: string;
  email: string | null;
  display_name: string | null;
  timezone: string;
  date_of_birth: string | null;
  plan: string;
  plan_ends_at: string | null;
  profile_completeness_score: number;
  profile_version: number;
  created_at: string;
  updated_at: string;
  skills: Array<{
    id: string;
    name: string;
    level: number;
    years: number | null;
    created_at: string;
  }>;
  experiences: Array<{
    id: string;
    title: string;
    company: string | null;
    start_date: string | null;
    end_date: string | null;
    highlights: string | null;
    created_at: string;
  }>;
  educations: Array<{
    id: string;
    institution: string;
    degree: string | null;
    field_of_study: string | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
  }>;
  preferences: {
    platforms: string[];
    currency: string;
    hourly_min: number | null;
    hourly_max: number | null;
    fixed_budget_min: number | null;
    project_types: string[];
    tightness: number;
    updated_at: string;
  } | null;
};

const defaultPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

let poolOverride: Pool | null = null;

export function setProfileFetcherPool(pool: Pool | null) {
  poolOverride = pool;
}

function getPool(): Pool {
  return poolOverride ?? defaultPool;
}

/**
 * Fetches a complete user profile by user_id and team_id.
 * Aggregates data from profiles, user_skills, user_experiences, user_educations, and user_preferences.
 * 
 * @param userId - The user's UUID
 * @param teamId - The team's UUID
 * @returns Complete UserProfile or null if not found
 */
export async function fetchUserProfile(
  userId: string,
  teamId: string
): Promise<FetchedUserProfile | null> {
  const client = await getPool().connect();
  try {
    return await fetchUserProfileWithClient(client, userId, teamId);
  } finally {
    client.release();
  }
}

/**
 * Fetches a user profile using an existing database client (for transactions).
 */
export async function fetchUserProfileWithClient(
  client: PoolClient,
  userId: string,
  teamId: string
): Promise<FetchedUserProfile | null> {
  // 1. Fetch base profile
  const profileResult = await client.query<{
    user_id: string;
    team_id: string;
    email: string | null;
    display_name: string | null;
    timezone: string;
    date_of_birth: string | null;
    plan: string;
    plan_ends_at: string | null;
    profile_completeness_score: number;
    created_at: string;
    updated_at: string;
  }>(
    `
    SELECT 
      user_id,
      team_id,
      email,
      display_name,
      timezone,
      date_of_birth::text,
      plan,
      plan_ends_at::text,
      profile_completeness_score::numeric,
      created_at::text,
      updated_at::text
    FROM public.profiles
    WHERE user_id = $1 AND team_id = $2
    `,
    [userId, teamId]
  );

  const profile = profileResult.rows[0];
  if (!profile) {
    return null;
  }

  // 2. Fetch skills
  const skillsResult = await client.query<{
    id: string;
    name: string;
    level: number;
    years: number | null;
    created_at: string;
  }>(
    `
    SELECT 
      id,
      name,
      level,
      years::numeric,
      created_at::text
    FROM public.user_skills
    WHERE user_id = $1 AND team_id = $2
    ORDER BY level DESC, years DESC NULLS LAST, name ASC
    `,
    [userId, teamId]
  );

  // 3. Fetch experiences
  const experiencesResult = await client.query<{
    id: string;
    title: string;
    company: string | null;
    start_date: string | null;
    end_date: string | null;
    highlights: string | null;
    created_at: string;
  }>(
    `
    SELECT 
      id,
      title,
      company,
      start_date::text,
      end_date::text,
      highlights,
      created_at::text
    FROM public.user_experiences
    WHERE user_id = $1 AND team_id = $2
    ORDER BY start_date DESC NULLS LAST, title ASC
    `,
    [userId, teamId]
  );

  // 4. Fetch educations
  const educationsResult = await client.query<{
    id: string;
    school: string;
    degree: string | null;
    field: string | null;
    start_year: number | null;
    end_year: number | null;
    created_at: string;
  }>(
    `
    SELECT 
      id,
      school,
      degree,
      field,
      start_year,
      end_year,
      created_at::text
    FROM public.user_educations
    WHERE user_id = $1 AND team_id = $2
    ORDER BY end_year DESC NULLS LAST, school ASC
    `,
    [userId, teamId]
  );

  // 5. Fetch preferences
  const preferencesResult = await client.query<{
    platforms: string[];
    currency: string;
    hourly_min: number | null;
    hourly_max: number | null;
    fixed_budget_min: number | null;
    project_types: string[];
    tightness: number;
    updated_at: string;
  }>(
    `
    SELECT 
      platforms,
      currency,
      hourly_min::numeric,
      hourly_max::numeric,
      fixed_budget_min::numeric,
      project_types,
      tightness,
      updated_at::text
    FROM public.user_preferences
    WHERE user_id = $1 AND team_id = $2
    `,
    [userId, teamId]
  );

  // 6. Compute profile_version based on related data changes
  // For now, use a simple hash of update timestamps
  // In production, this should be a proper version column
  const versionResult = await client.query<{ version: number }>(
    `
    SELECT COALESCE(
      (
        SELECT COUNT(*)::int + 1
        FROM (
          SELECT created_at FROM public.user_skills WHERE user_id = $1 AND team_id = $2
          UNION ALL
          SELECT created_at FROM public.user_experiences WHERE user_id = $1 AND team_id = $2
          UNION ALL
          SELECT created_at FROM public.user_educations WHERE user_id = $1 AND team_id = $2
        ) as changes
      ),
      1
    ) as version
    `,
    [userId, teamId]
  );

  // Transform educations to match schema (school -> institution, field -> field_of_study, years -> dates)
  const educations = educationsResult.rows.map((edu) => ({
    id: edu.id,
    institution: edu.school,
    degree: edu.degree,
    field_of_study: edu.field,
    start_date: edu.start_year ? `${edu.start_year}-01-01` : null,
    end_date: edu.end_year ? `${edu.end_year}-06-01` : null,
    created_at: edu.created_at,
  }));

  // Build preferences object if available
  const prefs = preferencesResult.rows[0];
  const preferences = prefs
    ? {
        platforms: prefs.platforms,
        currency: prefs.currency,
        hourly_min: prefs.hourly_min !== null ? Number(prefs.hourly_min) : null,
        hourly_max: prefs.hourly_max !== null ? Number(prefs.hourly_max) : null,
        fixed_budget_min: prefs.fixed_budget_min !== null ? Number(prefs.fixed_budget_min) : null,
        project_types: prefs.project_types,
        tightness: Number(prefs.tightness),
        updated_at: prefs.updated_at,
      }
    : null;

  return {
    user_id: profile.user_id,
    team_id: profile.team_id,
    email: profile.email,
    display_name: profile.display_name,
    timezone: profile.timezone,
    date_of_birth: profile.date_of_birth,
    plan: profile.plan,
    plan_ends_at: profile.plan_ends_at,
    profile_completeness_score: Number(profile.profile_completeness_score),
    profile_version: versionResult.rows[0]?.version ?? 1,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    skills: skillsResult.rows.map((s) => ({
      ...s,
      level: Number(s.level),
      years: s.years !== null ? Number(s.years) : null,
    })),
    experiences: experiencesResult.rows,
    educations,
    preferences,
  };
}

/**
 * Fetches a user profile by team_id only (gets the team owner's profile).
 * Useful when you only have the team context.
 */
export async function fetchUserProfileByTeam(
  teamId: string
): Promise<FetchedUserProfile | null> {
  const client = await getPool().connect();
  try {
    // First, find the team owner
    const teamResult = await client.query<{ owner_user_id: string }>(
      `SELECT owner_user_id FROM public.teams WHERE id = $1`,
      [teamId]
    );

    const teamRow = teamResult.rows[0];
    if (!teamRow) {
      return null;
    }

    const userId = teamRow.owner_user_id;
    return await fetchUserProfileWithClient(client, userId, teamId);
  } finally {
    client.release();
  }
}
