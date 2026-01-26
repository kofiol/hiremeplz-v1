import "server-only";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required server-side Supabase env vars");
}

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export function createUserSupabaseClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type AuthContext = {
  userId: string;
  teamId: string;
  role: "leader" | "member";
};

export async function ensureUserProfileAndTeam(params: {
  userId: string;
  email: string | null;
  displayName: string | null;
}): Promise<{ teamId: string }> {
  const { userId, email, displayName } = params;

  const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
    .from("profiles")
    .select("user_id, team_id")
    .eq("user_id", userId)
    .maybeSingle<{
      user_id: string;
      team_id: string;
    }>();

  if (profileLookupError) {
    throw new Error("User profile lookup failed");
  }

  let teamId: string | null = existingProfile?.team_id ?? null;

  if (!teamId) {
    const { data: memberships, error: memberError } = await supabaseAdmin
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .returns<{ team_id: string }[]>();

    if (memberError) {
      throw new Error("User team lookup failed");
    }

    teamId = memberships?.[0]?.team_id ?? null;
  }

  if (!teamId) {
    const nameBase = displayName ?? email ?? "My";
    const { data: newTeam, error: teamCreateError } = await supabaseAdmin
      .from("teams")
      .insert({
        name: nameBase.includes("Team") ? nameBase : `${nameBase} Team`,
        owner_user_id: userId,
      })
      .select("id")
      .single<{ id: string }>();

    if (teamCreateError || !newTeam?.id) {
      throw new Error("Team create failed");
    }

    teamId = newTeam.id;
  }

  const { error: membershipUpsertError } = await supabaseAdmin
    .from("team_members")
    .upsert(
      {
        team_id: teamId,
        user_id: userId,
        role: "leader",
        status: "active",
        invited_email: email ?? undefined,
      },
      { onConflict: "team_id,user_id" },
    );

  if (membershipUpsertError) {
    throw new Error("Team membership bootstrap failed");
  }

  const { error: profileUpsertError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        team_id: teamId,
        email,
        display_name: displayName ?? email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (profileUpsertError) {
    throw new Error("User profile bootstrap failed");
  }

  const { error: preferencesUpsertError } = await supabaseAdmin
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        team_id: teamId,
      },
      { onConflict: "user_id" },
    );

  if (preferencesUpsertError) {
    throw new Error("User preferences bootstrap failed");
  }

  return { teamId };
}

export async function verifyAuth(authHeader: string | null): Promise<AuthContext> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  try {
    const token = authHeader.slice("Bearer ".length).trim();
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const userId = user.id;
    const email = user.email ?? null;
    const fullName =
      typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name.length > 0
        ? user.user_metadata.full_name
        : null;

    // 2. Fetch user profile using Service Role (Bypasses RLS)
    // We trust the userId from the valid token, so we can use admin privileges to look up their data.
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("team_id")
      .eq("user_id", userId)
      .returns<{ team_id: string }[]>();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
      throw new Error("User profile lookup failed");
    }

    let teamId = profiles?.[0]?.team_id ?? null;

    if (!teamId) {
      const bootstrapped = await ensureUserProfileAndTeam({
        userId,
        email,
        displayName: fullName ?? email,
      });
      teamId = bootstrapped.teamId;
    }

    // 3. Fetch team membership using Service Role (Bypasses RLS)
    const { data: members, error: memberError } = await supabaseAdmin
      .from("team_members")
      .select("team_id, role")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .eq("status", "active")
      .returns<{ team_id: string; role: "leader" | "member" }[]>();

    if (memberError) {
      console.error("Auth verification failed: User has no active team", memberError);
      throw new Error("User is not part of an active team");
    }

    if (!members || members.length === 0) {
      await ensureUserProfileAndTeam({
        userId,
        email,
        displayName: fullName ?? email,
      });

      const { data: membersAfter, error: memberAfterError } = await supabaseAdmin
        .from("team_members")
        .select("team_id, role")
        .eq("team_id", teamId)
        .eq("user_id", userId)
        .eq("status", "active")
        .returns<{ team_id: string; role: "leader" | "member" }[]>();

      if (memberAfterError || !membersAfter || membersAfter.length === 0) {
        console.error("Auth verification failed: User has no active team");
        throw new Error("User is not part of an active team");
      }

      const memberData = membersAfter[0];
      return {
        userId,
        teamId: memberData.team_id,
        role: memberData.role as "leader" | "member",
      };
    }

    const memberData = members[0];

    return {
      userId,
      teamId: memberData.team_id,
      role: memberData.role as "leader" | "member",
    };
  } catch (err) {
    console.error("Auth verification failed:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Unauthorized");
  }
}
