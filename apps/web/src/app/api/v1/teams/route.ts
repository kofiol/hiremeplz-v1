import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/auth.server";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const authHeader = request.headers.get("Authorization");
    const { teamId, role } = await verifyAuth(authHeader);

    // 2. Fetch Team Details (using admin client to bypass RLS if needed, or regular client if policies allow)
    // We'll use supabaseAdmin here for consistency with the auth flow fix, 
    // assuming the user might not have direct read access to the team table via RLS yet.
    const { data: team, error } = await supabaseAdmin
      .from("teams")
      .select("id, name") // Removed slug and created_at to be safe
      .eq("id", teamId)
      .single();

    if (error) {
      console.error("Error fetching team:", error);
      return NextResponse.json({ error: "Failed to fetch team details", details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      team,
      user_role: role
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: 401 },
    );
  }
}
