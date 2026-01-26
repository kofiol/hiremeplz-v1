import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyAuth } from "@/lib/auth.server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const { userId, teamId, role } = await verifyAuth(authHeader);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan, display_name, email, profile_completeness_score")
      .eq("user_id", userId)
      .maybeSingle<{
        plan: string | null;
        display_name: string | null;
        email: string | null;
        profile_completeness_score: number | null;
      }>();

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to load profile", details: profileError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      user_id: userId,
      team_id: teamId,
      role: role,
      plan: profile?.plan ?? null,
      display_name: profile?.display_name ?? null,
      email: profile?.email ?? null,
      profile_completeness_score: profile?.profile_completeness_score ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: 401 },
    );
  }
}
