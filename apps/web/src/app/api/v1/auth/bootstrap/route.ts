import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureUserProfileAndTeam } from "@/lib/auth.server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables for auth bootstrap");
}

export async function POST(request: NextRequest) {
  try {
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

    const supabase = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
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
    const fullName =
      typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name.length > 0
        ? user.user_metadata.full_name
        : null;
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
