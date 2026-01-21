import { describe, it, expect } from "vitest";
import {
  SearchSpecLLMOutputSchema,
  LLMWeightedKeywordSchema,
  LLMLocationSchema,
  LLMSeniorityLevelSchema,
  LLMRemotePreferenceSchema,
  LLMContractTypeSchema,
  validateLLMOutput,
  safeValidateLLMOutput,
} from "../schema.js";

// ============================================================================
// VALID EXAMPLES
// ============================================================================

const VALID_LLM_OUTPUT = {
  title_keywords: [
    { keyword: "Full Stack Developer", weight: 10 },
    { keyword: "Senior Software Engineer", weight: 8 },
    { keyword: "TypeScript Developer", weight: 7 },
  ],
  skill_keywords: [
    { keyword: "typescript", weight: 10 },
    { keyword: "react", weight: 9 },
    { keyword: "nodejs", weight: 8 },
    { keyword: "postgresql", weight: 7 },
  ],
  negative_keywords: ["unpaid", "internship", "equity only"],
  locations: [{ country_code: "US", city: null, region: null }],
  seniority_levels: ["mid", "senior"],
  remote_preference: "flexible",
  contract_types: ["freelance", "contract"],
  hourly_min: 75,
  hourly_max: 150,
  fixed_budget_min: 5000,
};

const VALID_MINIMAL_OUTPUT = {
  title_keywords: [{ keyword: "Developer", weight: 5 }],
  skill_keywords: [{ keyword: "javascript", weight: 5 }],
  negative_keywords: [],
  locations: [],
  seniority_levels: [],
  remote_preference: "remote_only",
  contract_types: ["freelance"],
  hourly_min: null,
  hourly_max: null,
  fixed_budget_min: null,
};

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe("SearchSpecLLMOutputSchema", () => {
  describe("valid outputs", () => {
    it("accepts a complete valid output", () => {
      const result = SearchSpecLLMOutputSchema.safeParse(VALID_LLM_OUTPUT);
      expect(result.success).toBe(true);
    });

    it("accepts minimal valid output", () => {
      const result = SearchSpecLLMOutputSchema.safeParse(VALID_MINIMAL_OUTPUT);
      expect(result.success).toBe(true);
    });

    it("accepts all remote preferences", () => {
      const preferences = ["remote_only", "hybrid", "onsite", "flexible"];
      for (const pref of preferences) {
        const output = { ...VALID_MINIMAL_OUTPUT, remote_preference: pref };
        const result = SearchSpecLLMOutputSchema.safeParse(output);
        expect(result.success).toBe(true);
      }
    });

    it("accepts all contract types", () => {
      const types = ["freelance", "contract", "full_time", "part_time"];
      for (const type of types) {
        const output = { ...VALID_MINIMAL_OUTPUT, contract_types: [type] };
        const result = SearchSpecLLMOutputSchema.safeParse(output);
        expect(result.success).toBe(true);
      }
    });

    it("accepts all seniority levels", () => {
      const levels = ["entry", "junior", "mid", "senior", "lead", "principal"];
      const output = { ...VALID_MINIMAL_OUTPUT, seniority_levels: levels };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid outputs", () => {
    it("rejects empty title_keywords", () => {
      const output = { ...VALID_LLM_OUTPUT, title_keywords: [] };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    it("rejects more than 10 title_keywords", () => {
      const manyKeywords = Array.from({ length: 11 }, (_, i) => ({
        keyword: `Title ${i}`,
        weight: 5,
      }));
      const output = { ...VALID_LLM_OUTPUT, title_keywords: manyKeywords };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    it("rejects empty skill_keywords", () => {
      const output = { ...VALID_LLM_OUTPUT, skill_keywords: [] };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    it("rejects more than 20 skill_keywords", () => {
      const manyKeywords = Array.from({ length: 21 }, (_, i) => ({
        keyword: `skill${i}`,
        weight: 5,
      }));
      const output = { ...VALID_LLM_OUTPUT, skill_keywords: manyKeywords };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    it("rejects more than 10 negative_keywords", () => {
      const manyKeywords = Array.from({ length: 11 }, (_, i) => `negative${i}`);
      const output = { ...VALID_LLM_OUTPUT, negative_keywords: manyKeywords };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    it("rejects more than 5 locations", () => {
      const manyLocations = Array.from({ length: 6 }, () => ({
        country_code: "US",
        city: null,
        region: null,
      }));
      const output = { ...VALID_LLM_OUTPUT, locations: manyLocations };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    it("rejects empty contract_types", () => {
      const output = { ...VALID_LLM_OUTPUT, contract_types: [] };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    it("rejects invalid remote_preference", () => {
      const output = { ...VALID_LLM_OUTPUT, remote_preference: "invalid" };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    it("rejects invalid seniority_level", () => {
      const output = {
        ...VALID_LLM_OUTPUT,
        seniority_levels: ["invalid_level"],
      };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    it("rejects negative hourly_min", () => {
      const output = { ...VALID_LLM_OUTPUT, hourly_min: -10 };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    it("rejects negative hourly_max", () => {
      const output = { ...VALID_LLM_OUTPUT, hourly_max: -10 };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    it("rejects negative fixed_budget_min", () => {
      const output = { ...VALID_LLM_OUTPUT, fixed_budget_min: -10 };
      const result = SearchSpecLLMOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });
  });
});

describe("LLMWeightedKeywordSchema", () => {
  it("accepts valid keyword", () => {
    const result = LLMWeightedKeywordSchema.safeParse({
      keyword: "React Developer",
      weight: 8,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty keyword", () => {
    const result = LLMWeightedKeywordSchema.safeParse({
      keyword: "",
      weight: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects keyword over 100 chars", () => {
    const result = LLMWeightedKeywordSchema.safeParse({
      keyword: "a".repeat(101),
      weight: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight below 1", () => {
    const result = LLMWeightedKeywordSchema.safeParse({
      keyword: "test",
      weight: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight above 10", () => {
    const result = LLMWeightedKeywordSchema.safeParse({
      keyword: "test",
      weight: 11,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer weight", () => {
    const result = LLMWeightedKeywordSchema.safeParse({
      keyword: "test",
      weight: 5.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("LLMLocationSchema", () => {
  it("accepts valid location with all fields", () => {
    const result = LLMLocationSchema.safeParse({
      country_code: "US",
      city: "New York",
      region: "NY",
    });
    expect(result.success).toBe(true);
  });

  it("accepts location with null fields", () => {
    const result = LLMLocationSchema.safeParse({
      country_code: "US",
      city: null,
      region: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts location with all null fields", () => {
    const result = LLMLocationSchema.safeParse({
      country_code: null,
      city: null,
      region: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects country_code with wrong length", () => {
    const result = LLMLocationSchema.safeParse({
      country_code: "USA",
      city: null,
      region: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects city over 100 chars", () => {
    const result = LLMLocationSchema.safeParse({
      country_code: "US",
      city: "a".repeat(101),
      region: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("validateLLMOutput", () => {
  it("returns parsed data for valid input", () => {
    const result = validateLLMOutput(VALID_LLM_OUTPUT);
    expect(result.title_keywords).toHaveLength(3);
    expect(result.skill_keywords).toHaveLength(4);
  });

  it("throws for invalid input", () => {
    const invalid = { ...VALID_LLM_OUTPUT, title_keywords: [] };
    expect(() => validateLLMOutput(invalid)).toThrow();
  });
});

describe("safeValidateLLMOutput", () => {
  it("returns success: true for valid input", () => {
    const result = safeValidateLLMOutput(VALID_LLM_OUTPUT);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it("returns success: false for invalid input", () => {
    const invalid = { ...VALID_LLM_OUTPUT, title_keywords: [] };
    const result = safeValidateLLMOutput(invalid);
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });
});

describe("enum schemas", () => {
  describe("LLMSeniorityLevelSchema", () => {
    const validLevels = ["entry", "junior", "mid", "senior", "lead", "principal"];

    for (const level of validLevels) {
      it(`accepts "${level}"`, () => {
        const result = LLMSeniorityLevelSchema.safeParse(level);
        expect(result.success).toBe(true);
      });
    }

    it("rejects invalid level", () => {
      const result = LLMSeniorityLevelSchema.safeParse("expert");
      expect(result.success).toBe(false);
    });
  });

  describe("LLMRemotePreferenceSchema", () => {
    const validPrefs = ["remote_only", "hybrid", "onsite", "flexible"];

    for (const pref of validPrefs) {
      it(`accepts "${pref}"`, () => {
        const result = LLMRemotePreferenceSchema.safeParse(pref);
        expect(result.success).toBe(true);
      });
    }

    it("rejects invalid preference", () => {
      const result = LLMRemotePreferenceSchema.safeParse("remote");
      expect(result.success).toBe(false);
    });
  });

  describe("LLMContractTypeSchema", () => {
    const validTypes = ["freelance", "contract", "full_time", "part_time"];

    for (const type of validTypes) {
      it(`accepts "${type}"`, () => {
        const result = LLMContractTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    }

    it("rejects invalid type", () => {
      const result = LLMContractTypeSchema.safeParse("permanent");
      expect(result.success).toBe(false);
    });
  });
});
