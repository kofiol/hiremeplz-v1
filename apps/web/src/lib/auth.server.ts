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

// 1. Service Role Client (Bypasses RLS)
// Only use this when you absolutely need admin privileges.
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

export type AuthContext = {
  userId: string;
  teamId: string;
  role: "leader" | "member";
};

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

    if (!profiles || profiles.length === 0) {
      console.error("Profile not found for userId:", userId);
      throw new Error("User profile not found");
    }

    const profile = profiles[0];

    // 3. Fetch team membership using Service Role (Bypasses RLS)
    const { data: members, error: memberError } = await supabaseAdmin
      .from("team_members")
      .select("team_id, role")
      .eq("team_id", profile.team_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .returns<{ team_id: string; role: "leader" | "member" }[]>();

    if (memberError) {
      console.error("Auth verification failed: User has no active team", memberError);
      throw new Error("User is not part of an active team");
    }

    if (!members || members.length === 0) {
      console.error("Auth verification failed: User has no active team");
      throw new Error("User is not part of an active team");
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
