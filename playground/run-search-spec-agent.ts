import dotenv from "dotenv";
import type { UserProfile } from "../packages/job-search-engine/src/index.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

// #region agent log
fetch('http://127.0.0.1:7242/ingest/25d17162-8518-4d3a-ad84-ff94ccaf2f34',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-search-spec-agent.ts:INIT',message:'Script loaded, checking env vars',data:{TEST_USER_ID:process.env.TEST_USER_ID ?? null,TEST_TEAM_ID:process.env.TEST_TEAM_ID ?? null,OPENAI_API_KEY_set:!!process.env.OPENAI_API_KEY,NEXT_PUBLIC_SUPABASE_URL_set:!!process.env.NEXT_PUBLIC_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY_set:!!process.env.SUPABASE_SERVICE_ROLE_KEY},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4-env-vars'})}).catch(()=>{});
// #endregion

async function runRealWorldTest() {
  console.log("🚀 Starting Real-World Search Spec Generation Test...\n");

  // Debug: Show env vars
  console.log("🔧 Environment Check:");
  console.log(`   TEST_USER_ID: ${process.env.TEST_USER_ID}`);
  console.log(`   TEST_TEAM_ID: ${process.env.TEST_TEAM_ID}`);
  console.log(`   OPENAI_API_KEY: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
  console.log("");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ ERROR: OPENAI_API_KEY is not set in environment variables.");
    process.exit(1);
  }

  try {
    const { normalizeProfile, SearchSpecAgent } = await import("../packages/job-search-engine/src/index.js");
    let rawProfile: UserProfile;
    const userId = process.env.TEST_USER_ID;
    const teamId = process.env.TEST_TEAM_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/25d17162-8518-4d3a-ad84-ff94ccaf2f34',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-search-spec-agent.ts:30',message:'About to fetch profile',data:{userId:userId ?? null,teamId:teamId ?? null,usingSupabaseRest:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4-fetch-decision'})}).catch(()=>{});
    // #endregion

    if (userId && teamId && supabaseUrl && supabaseServiceRoleKey) {
      console.log("📊 Fetching profile from Supabase REST...");
      console.log(`   User ID: ${userId}`);
      console.log(`   Team ID: ${teamId}`);

      const supabaseHeaders = {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
      };

      const getJson = async <T>(path: string, params: Record<string, string>) => {
        const url = new URL(`${supabaseUrl}/rest/v1/${path}`);
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, value);
        }
        const response = await fetch(url, { headers: supabaseHeaders });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Supabase request failed (${response.status}): ${errorText}`);
        }
        return (await response.json()) as T;
      };

      const profileRows = await getJson<
        Array<{
          user_id: string;
          team_id: string;
          email: string | null;
          display_name: string | null;
          timezone: string;
          date_of_birth: string | null;
          plan: string;
          plan_ends_at: string | null;
          profile_completeness_score: number | null;
          created_at: string;
          updated_at: string;
        }>
      >("profiles", {
        select: "user_id,team_id,email,display_name,timezone,date_of_birth,plan,plan_ends_at,profile_completeness_score,created_at,updated_at",
        user_id: `eq.${userId}`,
        team_id: `eq.${teamId}`,
        limit: "1",
      });

      const profile = profileRows[0];
      if (!profile) {
        console.error("❌ ERROR: Profile not found in database");
        process.exit(1);
      }

      const [skills, experiences, educations, preferencesRows] = await Promise.all([
        getJson<
          Array<{
            id: string;
            name: string;
            level: number;
            years: number | null;
            created_at: string;
          }>
        >("user_skills", {
          select: "id,name,level,years,created_at",
          user_id: `eq.${userId}`,
          team_id: `eq.${teamId}`,
          order: "level.desc,years.desc.nullslast,name.asc",
        }),
        getJson<
          Array<{
            id: string;
            title: string;
            company: string | null;
            start_date: string | null;
            end_date: string | null;
            highlights: string | null;
            created_at: string;
          }>
        >("user_experiences", {
          select: "id,title,company,start_date,end_date,highlights,created_at",
          user_id: `eq.${userId}`,
          team_id: `eq.${teamId}`,
          order: "start_date.desc.nullslast,title.asc",
        }),
        getJson<
          Array<{
            id: string;
            school: string;
            degree: string | null;
            field: string | null;
            start_year: number | null;
            end_year: number | null;
            created_at: string;
          }>
        >("user_educations", {
          select: "id,school,degree,field,start_year,end_year,created_at",
          user_id: `eq.${userId}`,
          team_id: `eq.${teamId}`,
          order: "end_year.desc.nullslast,school.asc",
        }),
        getJson<
          Array<{
            platforms: string[];
            currency: string;
            hourly_min: number | null;
            hourly_max: number | null;
            fixed_budget_min: number | null;
            project_types: string[];
            tightness: number;
            updated_at: string;
          }>
        >("user_preferences", {
          select: "platforms,currency,hourly_min,hourly_max,fixed_budget_min,project_types,tightness,updated_at",
          user_id: `eq.${userId}`,
          team_id: `eq.${teamId}`,
          limit: "1",
        }),
      ]);

      const preferences = preferencesRows[0]
        ? {
            platforms: preferencesRows[0].platforms,
            currency: preferencesRows[0].currency,
            hourly_min: preferencesRows[0].hourly_min,
            hourly_max: preferencesRows[0].hourly_max,
            fixed_budget_min: preferencesRows[0].fixed_budget_min,
            project_types: preferencesRows[0].project_types,
            tightness: preferencesRows[0].tightness,
            updated_at: preferencesRows[0].updated_at,
          }
        : null;

      const profileVersion = skills.length + experiences.length + educations.length + 1;

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/25d17162-8518-4d3a-ad84-ff94ccaf2f34',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-search-spec-agent.ts:44',message:'Database fetch result',data:{found:!!profile,displayName:profile.display_name ?? null,skillCount:skills.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4-db-result'})}).catch(()=>{});
      // #endregion

      console.log(`✅ Profile found: ${profile.display_name || profile.email || "Unknown"}`);
      console.log(`   Skills: ${skills.length}`);
      console.log(`   Experiences: ${experiences.length}`);
      console.log(`   Educations: ${educations.length}`);

      rawProfile = {
        user_id: profile.user_id,
        team_id: profile.team_id,
        email: profile.email,
        display_name: profile.display_name,
        timezone: profile.timezone,
        date_of_birth: profile.date_of_birth,
        plan: profile.plan as "trial" | "starter" | "pro" | "enterprise",
        plan_ends_at: profile.plan_ends_at,
        profile_completeness_score: profile.profile_completeness_score ?? 0,
        profile_version: profileVersion,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        skills,
        experiences,
        educations: educations.map((edu) => ({
          id: edu.id,
          institution: edu.school,
          degree: edu.degree,
          field_of_study: edu.field,
          start_date: edu.start_year ? `${edu.start_year}-01-01` : null,
          end_date: edu.end_year ? `${edu.end_year}-06-01` : null,
          created_at: edu.created_at,
        })),
        preferences: preferences
          ? {
              platforms: preferences.platforms as ("upwork" | "linkedin")[],
              currency: preferences.currency,
              hourly_min: preferences.hourly_min,
              hourly_max: preferences.hourly_max,
              fixed_budget_min: preferences.fixed_budget_min,
              project_types: preferences.project_types as ("short_gig" | "medium_project" | "long_term" | "full_time")[],
              tightness: preferences.tightness,
              updated_at: preferences.updated_at,
            }
          : null,
      };
    } else {
      console.error("❌ ERROR: Missing required environment variables: TEST_USER_ID, TEST_TEAM_ID, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.");
      process.exit(1);
    }

    console.log(`\n👤 Profile: ${rawProfile.display_name || rawProfile.email || "Unknown"}`);

    // 2. Normalize the profile (Deterministic Step)
    const normalized = normalizeProfile(rawProfile, {
      referenceDate: new Date("2026-01-21"),
      normalizedAt: new Date().toISOString()
    });
    console.log("✅ Profile Normalized (Deterministic)");

    // 3. Initialize the Agent
    const agent = new SearchSpecAgent({
      model: "gpt-4o-mini", // Using mini for cost-effective testing
    });

    console.log("🤖 Invoking AI Agent (gpt-4o-mini)...");
    
    // 4. Generate the Search Spec (AI Step)
    const startTime = Date.now();
    const result = await agent.generate(normalized);
    const duration = Date.now() - startTime;

    // 5. Output results
    console.log(`\n✨ AI Generation Complete in ${duration}ms!`);
    console.log("--------------------------------------------------");
    console.log("Generated SearchSpec:");
    console.log(JSON.stringify(result.spec, null, 2));
    console.log("--------------------------------------------------");
    console.log("Metadata:");
    console.log(`- From Cache: ${result.fromCache}`);
    console.log(`- Cache Key: ${result.cacheKey}`);
    
    // 6. Test Caching (Immediate repeat)
    console.log("\n🔄 Testing Cache (Running again)...");
    const cacheResult = await agent.generate(normalized);
    console.log(`- From Cache: ${cacheResult.fromCache}`);

  } catch (error) {
    console.error("❌ Test Failed:", error);
  }
}

runRealWorldTest();
