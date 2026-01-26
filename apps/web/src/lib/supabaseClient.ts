import { createClient } from "@supabase/supabase-js";

const envSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (process.env.NODE_ENV === "production" && (!envSupabaseUrl || !envSupabaseAnonKey)) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseUrl = envSupabaseUrl ?? "http://localhost:54321";
const supabaseAnonKey = envSupabaseAnonKey ?? "dev-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

