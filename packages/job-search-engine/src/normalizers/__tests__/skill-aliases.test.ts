import { describe, it, expect } from "vitest";
import {
  toCanonicalSkillName,
  getSkillDisplayName,
  SKILL_ALIASES,
  ALIAS_TO_CANONICAL,
} from "../skill-aliases.js";

describe("toCanonicalSkillName", () => {
  describe("case normalization", () => {
    it("converts uppercase to lowercase", () => {
      expect(toCanonicalSkillName("TYPESCRIPT")).toBe("typescript");
      expect(toCanonicalSkillName("REACT")).toBe("react");
      expect(toCanonicalSkillName("PYTHON")).toBe("python");
    });

    it("converts mixed case to lowercase", () => {
      expect(toCanonicalSkillName("TypeScript")).toBe("typescript");
      expect(toCanonicalSkillName("JavaScript")).toBe("javascript");
      expect(toCanonicalSkillName("PostgreSQL")).toBe("postgresql");
    });
  });

  describe("alias resolution", () => {
    it("resolves Node.js variants to nodejs", () => {
      expect(toCanonicalSkillName("Node.js")).toBe("nodejs");
      expect(toCanonicalSkillName("node.js")).toBe("nodejs");
      expect(toCanonicalSkillName("Node JS")).toBe("nodejs");
      expect(toCanonicalSkillName("node js")).toBe("nodejs");
      expect(toCanonicalSkillName("nodejs")).toBe("nodejs");
      expect(toCanonicalSkillName("node")).toBe("nodejs");
    });

    it("resolves Next.js variants to nextjs", () => {
      expect(toCanonicalSkillName("Next.js")).toBe("nextjs");
      expect(toCanonicalSkillName("next.js")).toBe("nextjs");
      expect(toCanonicalSkillName("Next JS")).toBe("nextjs");
      expect(toCanonicalSkillName("nextjs")).toBe("nextjs");
      expect(toCanonicalSkillName("next")).toBe("nextjs");
    });

    it("resolves React variants to react", () => {
      expect(toCanonicalSkillName("React")).toBe("react");
      expect(toCanonicalSkillName("react")).toBe("react");
      expect(toCanonicalSkillName("ReactJS")).toBe("react");
      expect(toCanonicalSkillName("React.js")).toBe("react");
    });

    it("resolves PostgreSQL variants to postgresql", () => {
      expect(toCanonicalSkillName("PostgreSQL")).toBe("postgresql");
      expect(toCanonicalSkillName("postgres")).toBe("postgresql");
      expect(toCanonicalSkillName("pg")).toBe("postgresql");
      expect(toCanonicalSkillName("psql")).toBe("postgresql");
    });

    it("resolves JavaScript variants to javascript", () => {
      expect(toCanonicalSkillName("JavaScript")).toBe("javascript");
      expect(toCanonicalSkillName("JS")).toBe("javascript");
      expect(toCanonicalSkillName("js")).toBe("javascript");
      expect(toCanonicalSkillName("ECMAScript")).toBe("javascript");
      expect(toCanonicalSkillName("ES6")).toBe("javascript");
    });

    it("resolves cloud platform variants", () => {
      expect(toCanonicalSkillName("AWS")).toBe("aws");
      expect(toCanonicalSkillName("Amazon Web Services")).toBe("aws");
      expect(toCanonicalSkillName("GCP")).toBe("gcp");
      expect(toCanonicalSkillName("Google Cloud")).toBe("gcp");
      expect(toCanonicalSkillName("Azure")).toBe("azure");
      expect(toCanonicalSkillName("Microsoft Azure")).toBe("azure");
    });

    it("resolves Tailwind CSS variants", () => {
      expect(toCanonicalSkillName("Tailwind CSS")).toBe("tailwindcss");
      expect(toCanonicalSkillName("tailwindcss")).toBe("tailwindcss");
      expect(toCanonicalSkillName("tailwind")).toBe("tailwindcss");
    });
  });

  describe("unknown skills", () => {
    it("sanitizes unknown skills to lowercase alphanumeric", () => {
      expect(toCanonicalSkillName("My Custom Skill")).toBe("mycustomskill");
      expect(toCanonicalSkillName("Some-Framework 2.0")).toBe("someframework20");
      expect(toCanonicalSkillName("Special!@#Chars")).toBe("specialchars");
    });

    it("handles skills with only special characters", () => {
      expect(toCanonicalSkillName("!!!")).toBe("");
      expect(toCanonicalSkillName("@#$")).toBe("");
    });
  });

  describe("whitespace handling", () => {
    it("trims leading and trailing whitespace", () => {
      expect(toCanonicalSkillName("  TypeScript  ")).toBe("typescript");
      expect(toCanonicalSkillName("\tReact\n")).toBe("react");
    });

    it("handles internal whitespace in aliases", () => {
      expect(toCanonicalSkillName("Node JS")).toBe("nodejs");
      expect(toCanonicalSkillName("Vue.js")).toBe("vue");
    });
  });
});

describe("getSkillDisplayName", () => {
  it("returns properly capitalized display names for known skills", () => {
    expect(getSkillDisplayName("typescript")).toBe("TypeScript");
    expect(getSkillDisplayName("javascript")).toBe("JavaScript");
    expect(getSkillDisplayName("nodejs")).toBe("Node.js");
    expect(getSkillDisplayName("postgresql")).toBe("PostgreSQL");
    expect(getSkillDisplayName("mongodb")).toBe("MongoDB");
    expect(getSkillDisplayName("graphql")).toBe("GraphQL");
  });

  it("capitalizes first letter for unknown skills", () => {
    expect(getSkillDisplayName("mycustomskill")).toBe("Mycustomskill");
  });
});

describe("SKILL_ALIASES", () => {
  it("has all canonical names as lowercase", () => {
    for (const canonical of Object.keys(SKILL_ALIASES)) {
      expect(canonical).toBe(canonical.toLowerCase());
      expect(canonical).not.toContain(".");
      expect(canonical).not.toContain(" ");
    }
  });

  it("has no duplicate aliases across different canonical names", () => {
    const allAliases = new Map<string, string>();

    for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
      for (const alias of aliases) {
        const lower = alias.toLowerCase();
        const existing = allAliases.get(lower);
        if (existing && existing !== canonical) {
          throw new Error(
            `Duplicate alias "${alias}" found in both "${existing}" and "${canonical}"`,
          );
        }
        allAliases.set(lower, canonical);
      }
    }

    // If we get here, no duplicates found
    expect(true).toBe(true);
  });
});

describe("ALIAS_TO_CANONICAL", () => {
  it("is a valid reverse lookup map", () => {
    // Check that every alias maps back to its canonical
    for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
      for (const alias of aliases) {
        const mapped = ALIAS_TO_CANONICAL.get(alias.toLowerCase());
        expect(mapped).toBe(canonical);
      }
    }
  });
});

describe("determinism", () => {
  it("produces same result for same input every time", () => {
    const inputs = [
      "TypeScript",
      "TYPESCRIPT",
      "typescript",
      "Node.js",
      "Next JS",
      "PostgreSQL",
      "React Native",
    ];

    for (const input of inputs) {
      const result1 = toCanonicalSkillName(input);
      const result2 = toCanonicalSkillName(input);
      const result3 = toCanonicalSkillName(input);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    }
  });
});
