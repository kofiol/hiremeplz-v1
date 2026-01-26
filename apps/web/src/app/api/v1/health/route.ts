import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth.server";

export async function GET() {
  try {
    const start = Date.now();
    
    const { error } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .limit(1);

    const duration = Date.now() - start;

    if (error) {
      console.error("Health check failed:", error);
      return NextResponse.json(
        { 
          status: "error", 
          message: "Database connectivity failed", 
          details: error.message 
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        status: "ok", 
        timestamp: new Date().toISOString(),
        latency_ms: duration,
        services: {
          database: "connected"
        }
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Health check exception:", err);
    return NextResponse.json(
      { 
        status: "error", 
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
}
