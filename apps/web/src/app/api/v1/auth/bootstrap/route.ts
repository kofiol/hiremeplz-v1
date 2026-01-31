import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureUserProfileAndTeam } from "@/lib/auth.server";

const getSupabasePublicEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables for auth bootstrap")
  }

  return { supabaseUrl, supabaseAnonKey }
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv()
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Missing or invalid Authorization header",
          },
        },
        { status: 401 },
      );
    }

    const token = authHeader.slice("Bearer ".length).trim();

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Unable to resolve authenticated user",
            details: userError?.message,
          },
        },
        { status: 401 },
      );
    }

    const user = userData.user;
    const userId = user.id;
    const email = user.email ?? null;

    // Try to get display name from various metadata fields
    // Google OAuth provides: full_name, name, or email
    // Prioritize: full_name > name (if not email-like) > email
    const fullName =
      (typeof user.user_metadata?.full_name === "string" &&
       user.user_metadata.full_name.length > 0
        ? user.user_metadata.full_name
        : null) ??
      (typeof user.user_metadata?.name === "string" &&
       user.user_metadata.name.length > 0 &&
       !user.user_metadata.name.includes("@") // Skip if it's an email
        ? user.user_metadata.name
        : null);

    await ensureUserProfileAndTeam({
      userId,
      email,
      displayName: fullName ?? email,
    });

    return NextResponse.json(
      {
        ok: true,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: "auth_bootstrap_failed",
            message: error.message,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "auth_bootstrap_failed",
          message: "Unknown error",
        },
      },
      { status: 500 },
    );
  }
}
