import { describe, it, expect } from "vitest";
import { normalizeProfile } from "../normalize-profile.js";
import type { UserProfile, NormalizedProfile } from "../../schemas/index.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Fixed reference date for deterministic testing.
 * All tests use this date to ensure reproducible durations.
 */
const REFERENCE_DATE = new Date("2026-01-21T00:00:00.000Z");
const NORMALIZED_AT = "2026-01-21T12:00:00.000Z";

/**
 * Standard test options for deterministic output.
 */
const TEST_OPTIONS = {
  referenceDate: REFERENCE_DATE,
  normalizedAt: NORMALIZED_AT,
};

/**
 * Creates a minimal valid UserProfile for testing.
 */
function createMinimalProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    user_id: "550e8400-e29b-41d4-a716-446655440000",
    team_id: "660e8400-e29b-41d4-a716-446655440001",
    email: "test@example.com",
    display_name: "Test User",
    timezone: "UTC",
    date_of_birth: null,
    plan: "trial",
    plan_ends_at: null,
    profile_completeness_score: 50,
    profile_version: 1,
    skills: [],
    experiences: [],
    educations: [],
    preferences: null,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Creates a complete UserProfile for testing.
 */
function createCompleteProfile(): UserProfile {
  return createMinimalProfile({
    display_name: "  Jane   Developer  ", // Extra whitespace to test normalization
    profile_version: 5,
    skills: [
      {
        id: "skill-1",
        name: "TypeScript",
        level: 5,
        years: 4,
        created_at: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "skill-2",
        name: "React.js", // Alias test
        level: 4,
        years: 3,
        created_at: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "skill-3",
        name: "NODE.JS", // Case normalization test
        level: 4,
        years: 5,
        created_at: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "skill-4",
        name: "PostgreSQL",
        level: 3,
        years: 2,
        created_at: "2025-01-01T00:00:00.000Z",
      },
    ],
    experiences: [
      {
        id: "exp-1",
        title: "Senior Full Stack Developer",
        company: "TechCorp",
        start_date: "2022-03-01",
        end_date: null, // Current position
        highlights: "Led team of 5. Built microservices.",
        created_at: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "exp-2",
        title: "Full Stack Developer",
        company: "StartupXYZ",
        start_date: "2019-06-01",
        end_date: "2022-02-28",
        highlights: null,
        created_at: "2025-01-01T00:00:00.000Z",
      },
    ],
    educations: [
      {
        id: "edu-1",
        institution: "MIT",
        degree: "Bachelor of Science",
        field_of_study: "Computer Science",
        start_date: "2012-09-01",
        end_date: "2016-05-31",
        created_at: "2025-01-01T00:00:00.000Z",
      },
    ],
    preferences: {
      platforms: ["linkedin", "upwork"],
      currency: "USD",
      hourly_min: 75,
      hourly_max: 150,
      fixed_budget_min: 5000,
      project_types: ["short_gig", "medium_project"],
      tightness: 3,
      updated_at: "2025-01-15T00:00:00.000Z",
    },
  });
}

// ============================================================================
// DETERMINISM TESTS
// ============================================================================

describe("normalizeProfile - Determinism", () => {
  it("produces identical output for identical input", () => {
    const profile = createCompleteProfile();

    const result1 = normalizeProfile(profile, TEST_OPTIONS);
    const result2 = normalizeProfile(profile, TEST_OPTIONS);

    expect(result1).toEqual(result2);
  });

  it("produces identical output when called multiple times", () => {
    const profile = createCompleteProfile();
    const results: NormalizedProfile[] = [];

    // Call 10 times
    for (let i = 0; i < 10; i++) {
      results.push(normalizeProfile(profile, TEST_OPTIONS));
    }

    // All results should be identical
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
    }
  });

  it("preserves profile_version exactly", () => {
    const profile = createMinimalProfile({ profile_version: 42 });
    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.profile_version).toBe(42);
  });

  it("preserves user_id and team_id exactly", () => {
    const profile = createMinimalProfile({
      user_id: "11111111-1111-1111-1111-111111111111",
      team_id: "22222222-2222-2222-2222-222222222222",
    });
    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.user_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(result.team_id).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("uses provided normalizedAt timestamp", () => {
    const profile = createMinimalProfile();
    const customTimestamp = "2025-06-15T08:30:00.000Z";

    const result = normalizeProfile(profile, {
      ...TEST_OPTIONS,
      normalizedAt: customTimestamp,
    });

    expect(result.normalized_at).toBe(customTimestamp);
  });
});

// ============================================================================
// ORDER-INSENSITIVITY TESTS
// ============================================================================

describe("normalizeProfile - Order Insensitivity", () => {
  it("produces same output regardless of skills array order", () => {
    const skillsOrder1 = [
      { id: "s1", name: "TypeScript", level: 5, years: 4, created_at: "2025-01-01T00:00:00.000Z" },
      { id: "s2", name: "React", level: 4, years: 3, created_at: "2025-01-01T00:00:00.000Z" },
      { id: "s3", name: "Python", level: 3, years: 2, created_at: "2025-01-01T00:00:00.000Z" },
    ];

    const skillsOrder2 = [
      { id: "s3", name: "Python", level: 3, years: 2, created_at: "2025-01-01T00:00:00.000Z" },
      { id: "s1", name: "TypeScript", level: 5, years: 4, created_at: "2025-01-01T00:00:00.000Z" },
      { id: "s2", name: "React", level: 4, years: 3, created_at: "2025-01-01T00:00:00.000Z" },
    ];

    const skillsOrder3 = [
      { id: "s2", name: "React", level: 4, years: 3, created_at: "2025-01-01T00:00:00.000Z" },
      { id: "s3", name: "Python", level: 3, years: 2, created_at: "2025-01-01T00:00:00.000Z" },
      { id: "s1", name: "TypeScript", level: 5, years: 4, created_at: "2025-01-01T00:00:00.000Z" },
    ];

    const profile1 = createMinimalProfile({ skills: skillsOrder1 });
    const profile2 = createMinimalProfile({ skills: skillsOrder2 });
    const profile3 = createMinimalProfile({ skills: skillsOrder3 });

    const result1 = normalizeProfile(profile1, TEST_OPTIONS);
    const result2 = normalizeProfile(profile2, TEST_OPTIONS);
    const result3 = normalizeProfile(profile3, TEST_OPTIONS);

    expect(result1.primary_skills).toEqual(result2.primary_skills);
    expect(result2.primary_skills).toEqual(result3.primary_skills);
    expect(result1.skill_keywords).toEqual(result2.skill_keywords);
    expect(result2.skill_keywords).toEqual(result3.skill_keywords);
  });

  it("produces same output regardless of experiences array order", () => {
    const exp1 = {
      id: "e1",
      title: "Senior Dev",
      company: "Company A",
      start_date: "2022-01-01",
      end_date: null,
      highlights: null,
      created_at: "2025-01-01T00:00:00.000Z",
    };
    const exp2 = {
      id: "e2",
      title: "Junior Dev",
      company: "Company B",
      start_date: "2019-01-01",
      end_date: "2021-12-31",
      highlights: null,
      created_at: "2025-01-01T00:00:00.000Z",
    };

    const profile1 = createMinimalProfile({ experiences: [exp1, exp2] });
    const profile2 = createMinimalProfile({ experiences: [exp2, exp1] });

    const result1 = normalizeProfile(profile1, TEST_OPTIONS);
    const result2 = normalizeProfile(profile2, TEST_OPTIONS);

    // Experiences should be sorted by start_date DESC
    expect(result1.experiences).toEqual(result2.experiences);
    expect(result1.experiences[0].title).toBe("Senior Dev"); // Most recent first
  });

  it("produces same output regardless of educations array order", () => {
    const edu1 = {
      id: "e1",
      institution: "MIT",
      degree: "PhD",
      field_of_study: "CS",
      start_date: "2020-01-01",
      end_date: "2024-05-01",
      created_at: "2025-01-01T00:00:00.000Z",
    };
    const edu2 = {
      id: "e2",
      institution: "Stanford",
      degree: "Bachelor",
      field_of_study: "CS",
      start_date: "2016-01-01",
      end_date: "2020-05-01",
      created_at: "2025-01-01T00:00:00.000Z",
    };

    const profile1 = createMinimalProfile({ educations: [edu1, edu2] });
    const profile2 = createMinimalProfile({ educations: [edu2, edu1] });

    const result1 = normalizeProfile(profile1, TEST_OPTIONS);
    const result2 = normalizeProfile(profile2, TEST_OPTIONS);

    expect(result1.educations).toEqual(result2.educations);
    expect(result1.highest_degree).toEqual(result2.highest_degree);
  });

  it("produces same output regardless of platforms array order", () => {
    const prefs1 = {
      platforms: ["linkedin" as const, "upwork" as const],
      currency: "USD",
      hourly_min: null,
      hourly_max: null,
      fixed_budget_min: null,
      project_types: ["short_gig" as const],
      tightness: 3,
      updated_at: "2025-01-01T00:00:00.000Z",
    };
    const prefs2 = {
      ...prefs1,
      platforms: ["upwork" as const, "linkedin" as const],
    };

    const profile1 = createMinimalProfile({ preferences: prefs1 });
    const profile2 = createMinimalProfile({ preferences: prefs2 });

    const result1 = normalizeProfile(profile1, TEST_OPTIONS);
    const result2 = normalizeProfile(profile2, TEST_OPTIONS);

    expect(result1.preferences.platforms).toEqual(result2.preferences.platforms);
  });
});

// ============================================================================
// SKILL NORMALIZATION TESTS
// ============================================================================

describe("normalizeProfile - Skill Normalization", () => {
  it("converts skill names to lowercase canonical form", () => {
    const profile = createMinimalProfile({
      skills: [
        { id: "s1", name: "TYPESCRIPT", level: 5, years: 3, created_at: "2025-01-01T00:00:00.000Z" },
        { id: "s2", name: "React.js", level: 4, years: 2, created_at: "2025-01-01T00:00:00.000Z" },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.primary_skills[0].canonical_name).toBe("typescript");
    expect(result.primary_skills[1].canonical_name).toBe("react");
  });

  it("resolves skill aliases to canonical names", () => {
    const profile = createMinimalProfile({
      skills: [
        { id: "s1", name: "Next.js", level: 5, years: null, created_at: "2025-01-01T00:00:00.000Z" },
        { id: "s2", name: "node", level: 4, years: null, created_at: "2025-01-01T00:00:00.000Z" },
        { id: "s3", name: "Postgres", level: 3, years: null, created_at: "2025-01-01T00:00:00.000Z" },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    const canonicals = result.primary_skills.map((s) => s.canonical_name);
    expect(canonicals).toContain("nextjs");
    expect(canonicals).toContain("nodejs");
    expect(canonicals).toContain("postgresql");
  });

  it("deduplicates skills by canonical name, keeping highest level", () => {
    const profile = createMinimalProfile({
      skills: [
        { id: "s1", name: "TypeScript", level: 3, years: 1, created_at: "2025-01-01T00:00:00.000Z" },
        { id: "s2", name: "typescript", level: 5, years: 3, created_at: "2025-01-01T00:00:00.000Z" },
        { id: "s3", name: "TS", level: 4, years: 2, created_at: "2025-01-01T00:00:00.000Z" },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    // Should only have one typescript entry with level 5
    const tsSkills = result.primary_skills.filter((s) => s.canonical_name === "typescript");
    expect(tsSkills).toHaveLength(1);
    expect(tsSkills[0].level).toBe(5);
    expect(tsSkills[0].years).toBe(3);
  });

  it("sorts skills by level DESC, years DESC, name ASC", () => {
    const profile = createMinimalProfile({
      skills: [
        { id: "s1", name: "Python", level: 3, years: 5, created_at: "2025-01-01T00:00:00.000Z" },
        { id: "s2", name: "TypeScript", level: 5, years: 3, created_at: "2025-01-01T00:00:00.000Z" },
        { id: "s3", name: "React", level: 5, years: 4, created_at: "2025-01-01T00:00:00.000Z" },
        { id: "s4", name: "Go", level: 5, years: 4, created_at: "2025-01-01T00:00:00.000Z" },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);
    const names = result.primary_skills.map((s) => s.canonical_name);

    // Level 5: Go (4yr), React (4yr), TypeScript (3yr) - sorted by years DESC, then name ASC
    // Level 3: Python (5yr)
    expect(names[0]).toBe("go"); // level 5, 4 years, "go" < "react"
    expect(names[1]).toBe("react"); // level 5, 4 years, "react" > "go"
    expect(names[2]).toBe("typescript"); // level 5, 3 years
    expect(names[3]).toBe("python"); // level 3
  });

  it("splits skills into primary (max 10) and secondary", () => {
    const manySkills = Array.from({ length: 15 }, (_, i) => ({
      id: `s${i}`,
      name: `Skill${i}`,
      level: 5 - Math.floor(i / 3),
      years: null,
      created_at: "2025-01-01T00:00:00.000Z",
    }));

    const profile = createMinimalProfile({ skills: manySkills });
    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.primary_skills.length).toBe(10);
    expect(result.secondary_skills.length).toBe(5);
  });

  it("extracts skill keywords from all skills", () => {
    const profile = createMinimalProfile({
      skills: [
        { id: "s1", name: "TypeScript", level: 5, years: null, created_at: "2025-01-01T00:00:00.000Z" },
        { id: "s2", name: "React", level: 4, years: null, created_at: "2025-01-01T00:00:00.000Z" },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.skill_keywords).toContain("typescript");
    expect(result.skill_keywords).toContain("react");
  });
});

// ============================================================================
// EXPERIENCE NORMALIZATION TESTS
// ============================================================================

describe("normalizeProfile - Experience Normalization", () => {
  it("computes duration in months correctly", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Developer",
          company: "Company",
          start_date: "2024-01-01", // 12+ months before reference date
          end_date: null, // Current
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    // From 2024-01-01 to 2026-01-21 = ~24 months
    expect(result.experiences[0].duration_months).toBe(24);
    expect(result.experiences[0].is_current).toBe(true);
  });

  it("computes duration for completed positions", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Developer",
          company: "Company",
          start_date: "2022-01-01",
          end_date: "2023-06-30", // 18 months
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.experiences[0].duration_months).toBe(17); // Jan 2022 to Jun 2023 = 17 months
    expect(result.experiences[0].is_current).toBe(false);
  });

  it("computes total experience months as sum of all experiences", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Senior Dev",
          company: "A",
          start_date: "2023-01-01",
          end_date: null, // ~24 months to reference date
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
        {
          id: "e2",
          title: "Junior Dev",
          company: "B",
          start_date: "2020-01-01",
          end_date: "2022-12-31", // 36 months
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    // ~24 + 35 = ~59 months
    expect(result.total_experience_months).toBeGreaterThanOrEqual(59);
  });

  it("splits highlights into array", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Developer",
          company: "Company",
          start_date: "2024-01-01",
          end_date: null,
          highlights: "Led team of 5. Built microservices architecture. Improved performance by 50%.",
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.experiences[0].highlights.length).toBeGreaterThanOrEqual(1);
    expect(result.experiences[0].highlights).toContain("Led team of 5");
  });

  it("extracts unique title keywords", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Senior Full Stack Developer",
          company: "A",
          start_date: "2023-01-01",
          end_date: null,
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
        {
          id: "e2",
          title: "Full Stack Developer",
          company: "B",
          start_date: "2020-01-01",
          end_date: "2022-12-31",
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.title_keywords).toContain("senior full stack developer");
    expect(result.title_keywords).toContain("full stack developer");
    // Keywords should be sorted
    expect(result.title_keywords).toEqual([...result.title_keywords].sort());
  });
});

// ============================================================================
// SENIORITY INFERENCE TESTS
// ============================================================================

describe("normalizeProfile - Seniority Inference", () => {
  it("infers entry level for 0-23 months experience", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Junior Dev",
          company: "A",
          start_date: "2025-06-01", // ~7 months before reference
          end_date: null,
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);
    expect(result.inferred_seniority).toBe("entry");
  });

  it("infers junior level for 24-47 months experience", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Developer",
          company: "A",
          start_date: "2023-06-01", // ~31 months before reference
          end_date: null,
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);
    expect(result.inferred_seniority).toBe("junior");
  });

  it("infers mid level for 48-71 months experience", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Developer",
          company: "A",
          start_date: "2021-06-01", // ~55 months before reference
          end_date: null,
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);
    expect(result.inferred_seniority).toBe("mid");
  });

  it("infers senior level for 72-119 months experience", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Developer",
          company: "A",
          start_date: "2018-06-01", // ~91 months before reference
          end_date: null,
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);
    expect(result.inferred_seniority).toBe("senior");
  });

  it("infers lead level for 120-179 months experience", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Developer",
          company: "A",
          start_date: "2014-01-01", // ~144 months before reference
          end_date: null,
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);
    expect(result.inferred_seniority).toBe("lead");
  });

  it("infers principal level for 180+ months experience", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Developer",
          company: "A",
          start_date: "2010-01-01", // ~192 months before reference
          end_date: null,
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);
    expect(result.inferred_seniority).toBe("principal");
  });

  it("defaults to entry for profile with no experience", () => {
    const profile = createMinimalProfile({ experiences: [] });
    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.total_experience_months).toBe(0);
    expect(result.inferred_seniority).toBe("entry");
  });
});

// ============================================================================
// EDUCATION NORMALIZATION TESTS
// ============================================================================

describe("normalizeProfile - Education Normalization", () => {
  it("extracts graduation year from end_date", () => {
    const profile = createMinimalProfile({
      educations: [
        {
          id: "e1",
          institution: "MIT",
          degree: "Bachelor",
          field_of_study: "CS",
          start_date: "2012-09-01",
          end_date: "2016-05-31",
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.educations[0].graduation_year).toBe(2016);
  });

  it("determines highest degree level correctly", () => {
    const profile = createMinimalProfile({
      educations: [
        {
          id: "e1",
          institution: "MIT",
          degree: "Bachelor of Science",
          field_of_study: "CS",
          start_date: "2012-09-01",
          end_date: "2016-05-31",
          created_at: "2025-01-01T00:00:00.000Z",
        },
        {
          id: "e2",
          institution: "Stanford",
          degree: "Master of Science",
          field_of_study: "AI",
          start_date: "2016-09-01",
          end_date: "2018-05-31",
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.highest_degree).toBe("Master of Science");
  });

  it("handles PhD as highest degree", () => {
    const profile = createMinimalProfile({
      educations: [
        {
          id: "e1",
          institution: "MIT",
          degree: "PhD in Computer Science",
          field_of_study: "ML",
          start_date: "2018-09-01",
          end_date: "2023-05-31",
          created_at: "2025-01-01T00:00:00.000Z",
        },
        {
          id: "e2",
          institution: "Stanford",
          degree: "Master",
          field_of_study: "CS",
          start_date: "2016-09-01",
          end_date: "2018-05-31",
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.highest_degree).toBe("PhD in Computer Science");
  });
});

// ============================================================================
// PREFERENCES NORMALIZATION TESTS
// ============================================================================

describe("normalizeProfile - Preferences Normalization", () => {
  it("provides defaults when preferences is null", () => {
    const profile = createMinimalProfile({ preferences: null });
    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.preferences.platforms).toEqual(["linkedin", "upwork"]);
    expect(result.preferences.tightness).toBe(3);
    expect(result.preferences.remote_preference).toBe("flexible");
    expect(result.preferences.contract_type).toBe("any");
  });

  it("preserves hourly rate range", () => {
    const profile = createMinimalProfile({
      preferences: {
        platforms: ["linkedin"],
        currency: "EUR",
        hourly_min: 50,
        hourly_max: 100,
        fixed_budget_min: null,
        project_types: ["short_gig"],
        tightness: 4,
        updated_at: "2025-01-01T00:00:00.000Z",
      },
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.preferences.hourly_rate.min).toBe(50);
    expect(result.preferences.hourly_rate.max).toBe(100);
    expect(result.preferences.hourly_rate.currency).toBe("EUR");
  });

  it("deduplicates and sorts platforms", () => {
    const profile = createMinimalProfile({
      preferences: {
        platforms: ["upwork", "linkedin", "upwork"], // Duplicate
        currency: "USD",
        hourly_min: null,
        hourly_max: null,
        fixed_budget_min: null,
        project_types: ["short_gig"],
        tightness: 3,
        updated_at: "2025-01-01T00:00:00.000Z",
      },
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.preferences.platforms).toEqual(["linkedin", "upwork"]); // Sorted, deduped
  });

  it("clamps tightness to 1-5 range", () => {
    const profileHigh = createMinimalProfile({
      preferences: {
        platforms: ["linkedin"],
        currency: "USD",
        hourly_min: null,
        hourly_max: null,
        fixed_budget_min: null,
        project_types: ["short_gig"],
        tightness: 10, // Too high
        updated_at: "2025-01-01T00:00:00.000Z",
      },
    });

    const resultHigh = normalizeProfile(profileHigh, TEST_OPTIONS);
    expect(resultHigh.preferences.tightness).toBe(5);
  });

  it("derives contract type from project types", () => {
    const profile = createMinimalProfile({
      preferences: {
        platforms: ["linkedin"],
        currency: "USD",
        hourly_min: null,
        hourly_max: null,
        fixed_budget_min: null,
        project_types: ["full_time"],
        tightness: 3,
        updated_at: "2025-01-01T00:00:00.000Z",
      },
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.preferences.contract_type).toBe("full_time");
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe("normalizeProfile - Edge Cases", () => {
  it("handles empty arrays gracefully", () => {
    const profile = createMinimalProfile({
      skills: [],
      experiences: [],
      educations: [],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.primary_skills).toEqual([]);
    expect(result.secondary_skills).toEqual([]);
    expect(result.skill_keywords).toEqual([]);
    expect(result.experiences).toEqual([]);
    expect(result.title_keywords).toEqual([]);
    expect(result.educations).toEqual([]);
    expect(result.highest_degree).toBeNull();
    expect(result.total_experience_months).toBe(0);
    expect(result.inferred_seniority).toBe("entry");
  });

  it("normalizes whitespace in display_name", () => {
    const profile = createMinimalProfile({
      display_name: "  John    Doe  ",
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.display_name).toBe("John Doe");
  });

  it("handles null display_name", () => {
    const profile = createMinimalProfile({
      display_name: null,
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.display_name).toBeNull();
  });

  it("handles experience with null start_date", () => {
    const profile = createMinimalProfile({
      experiences: [
        {
          id: "e1",
          title: "Developer",
          company: "Company",
          start_date: null, // Unknown start
          end_date: null,
          highlights: null,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    expect(result.experiences[0].duration_months).toBeNull();
    expect(result.total_experience_months).toBe(0); // Unknown durations contribute 0
  });

  it("handles unknown skills that are not in alias dictionary", () => {
    const profile = createMinimalProfile({
      skills: [
        {
          id: "s1",
          name: "My Custom Framework",
          level: 4,
          years: 2,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = normalizeProfile(profile, TEST_OPTIONS);

    // Should sanitize to lowercase alphanumeric
    expect(result.primary_skills[0].canonical_name).toBe("mycustomframework");
  });
});
