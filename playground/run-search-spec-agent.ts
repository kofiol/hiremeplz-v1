import "dotenv/config";
import { 
  normalizeProfile, 
  SearchSpecAgent,
  VALID_USER_PROFILE 
} from "../packages/job-search-engine/src/index.js";

async function runRealWorldTest() {
  console.log("🚀 Starting Real-World Search Spec Generation Test...\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ ERROR: OPENAI_API_KEY is not set in environment variables.");
    process.exit(1);
  }

  try {
    // 1. INPUT YOUR OWN DATA HERE
    const rawProfile = {
      user_id: "550e8400-e29b-41d4-a716-446655440000", // Keep as valid UUID
      team_id: "660e8400-e29b-41d4-a716-446655440001",
      profile_version: 1,
      display_name: "Your Name",
      timezone: "Europe/London",
      skills: [
        { name: "React", level: 5, years: 4 },
        { name: "Tailwind CSS", level: 4, years: 2 },
        { name: "PostgreSQL", level: 3, years: 2 }
      ],
      experiences: [
        {
          title: "Senior Frontend Engineer",
          company: "Tech Solutions Inc",
          start_date: "2022-01-01",
          end_date: null, // Current position
          highlights: "Led migration to Next.js. Improved performance by 40%."
        }
      ],
      educations: [
        {
          institution: "University of Technology",
          degree: "Bachelor of Science in Computer Science",
          field_of_study: "Software Engineering",
          start_date: "2018-09-01",
          end_date: "2021-06-01"
        }
      ],
      preferences: {
        platforms: ["linkedin", "upwork"],
        hourly_min: 80,
        hourly_max: 120,
        fixed_budget_min: 2000,
        currency: "USD",
        tightness: 4,
        project_types: ["long_term", "medium_project"]
      }
    };
    console.log("📝 Raw Profile Sample:", rawProfile.display_name);

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
