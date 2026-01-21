import { describe, it, expect } from "vitest";
import {
  inferSeniorityLevel,
  getSeniorityThreshold,
  monthsToYears,
  yearsToMonths,
  SENIORITY_THRESHOLDS,
} from "../seniority-mapping.js";

describe("inferSeniorityLevel", () => {
  describe("entry level (0-23 months)", () => {
    it("returns entry for 0 months", () => {
      expect(inferSeniorityLevel(0)).toBe("entry");
    });

    it("returns entry for 12 months (1 year)", () => {
      expect(inferSeniorityLevel(12)).toBe("entry");
    });

    it("returns entry for 23 months", () => {
      expect(inferSeniorityLevel(23)).toBe("entry");
    });
  });

  describe("junior level (24-47 months)", () => {
    it("returns junior for 24 months (2 years)", () => {
      expect(inferSeniorityLevel(24)).toBe("junior");
    });

    it("returns junior for 36 months (3 years)", () => {
      expect(inferSeniorityLevel(36)).toBe("junior");
    });

    it("returns junior for 47 months", () => {
      expect(inferSeniorityLevel(47)).toBe("junior");
    });
  });

  describe("mid level (48-71 months)", () => {
    it("returns mid for 48 months (4 years)", () => {
      expect(inferSeniorityLevel(48)).toBe("mid");
    });

    it("returns mid for 60 months (5 years)", () => {
      expect(inferSeniorityLevel(60)).toBe("mid");
    });

    it("returns mid for 71 months", () => {
      expect(inferSeniorityLevel(71)).toBe("mid");
    });
  });

  describe("senior level (72-119 months)", () => {
    it("returns senior for 72 months (6 years)", () => {
      expect(inferSeniorityLevel(72)).toBe("senior");
    });

    it("returns senior for 96 months (8 years)", () => {
      expect(inferSeniorityLevel(96)).toBe("senior");
    });

    it("returns senior for 119 months", () => {
      expect(inferSeniorityLevel(119)).toBe("senior");
    });
  });

  describe("lead level (120-179 months)", () => {
    it("returns lead for 120 months (10 years)", () => {
      expect(inferSeniorityLevel(120)).toBe("lead");
    });

    it("returns lead for 150 months (12.5 years)", () => {
      expect(inferSeniorityLevel(150)).toBe("lead");
    });

    it("returns lead for 179 months", () => {
      expect(inferSeniorityLevel(179)).toBe("lead");
    });
  });

  describe("principal level (180+ months)", () => {
    it("returns principal for 180 months (15 years)", () => {
      expect(inferSeniorityLevel(180)).toBe("principal");
    });

    it("returns principal for 240 months (20 years)", () => {
      expect(inferSeniorityLevel(240)).toBe("principal");
    });

    it("returns principal for 600 months (50 years)", () => {
      expect(inferSeniorityLevel(600)).toBe("principal");
    });
  });

  describe("edge cases", () => {
    it("handles negative input by clamping to 0", () => {
      expect(inferSeniorityLevel(-10)).toBe("entry");
      expect(inferSeniorityLevel(-1)).toBe("entry");
    });

    it("handles decimal input by flooring", () => {
      expect(inferSeniorityLevel(23.9)).toBe("entry");
      expect(inferSeniorityLevel(24.1)).toBe("junior");
    });

    it("handles NaN by treating as 0", () => {
      expect(inferSeniorityLevel(NaN)).toBe("entry");
    });
  });

  describe("boundary testing", () => {
    const boundaries = [
      { months: 23, expected: "entry" },
      { months: 24, expected: "junior" },
      { months: 47, expected: "junior" },
      { months: 48, expected: "mid" },
      { months: 71, expected: "mid" },
      { months: 72, expected: "senior" },
      { months: 119, expected: "senior" },
      { months: 120, expected: "lead" },
      { months: 179, expected: "lead" },
      { months: 180, expected: "principal" },
    ];

    for (const { months, expected } of boundaries) {
      it(`returns ${expected} for ${months} months`, () => {
        expect(inferSeniorityLevel(months)).toBe(expected);
      });
    }
  });
});

describe("getSeniorityThreshold", () => {
  it("returns correct threshold for entry", () => {
    const threshold = getSeniorityThreshold("entry");
    expect(threshold.minMonths).toBe(0);
    expect(threshold.maxMonths).toBe(24);
  });

  it("returns correct threshold for junior", () => {
    const threshold = getSeniorityThreshold("junior");
    expect(threshold.minMonths).toBe(24);
    expect(threshold.maxMonths).toBe(48);
  });

  it("returns correct threshold for mid", () => {
    const threshold = getSeniorityThreshold("mid");
    expect(threshold.minMonths).toBe(48);
    expect(threshold.maxMonths).toBe(72);
  });

  it("returns correct threshold for senior", () => {
    const threshold = getSeniorityThreshold("senior");
    expect(threshold.minMonths).toBe(72);
    expect(threshold.maxMonths).toBe(120);
  });

  it("returns correct threshold for lead", () => {
    const threshold = getSeniorityThreshold("lead");
    expect(threshold.minMonths).toBe(120);
    expect(threshold.maxMonths).toBe(180);
  });

  it("returns correct threshold for principal", () => {
    const threshold = getSeniorityThreshold("principal");
    expect(threshold.minMonths).toBe(180);
    expect(threshold.maxMonths).toBe(Infinity);
  });
});

describe("monthsToYears", () => {
  it("converts months to years with one decimal", () => {
    expect(monthsToYears(12)).toBe(1);
    expect(monthsToYears(24)).toBe(2);
    expect(monthsToYears(18)).toBe(1.5);
    expect(monthsToYears(30)).toBe(2.5);
  });

  it("handles zero", () => {
    expect(monthsToYears(0)).toBe(0);
  });

  it("rounds to one decimal place", () => {
    expect(monthsToYears(7)).toBe(0.6); // 7/12 = 0.583...
    expect(monthsToYears(13)).toBe(1.1); // 13/12 = 1.083...
  });
});

describe("yearsToMonths", () => {
  it("converts years to months as integer", () => {
    expect(yearsToMonths(1)).toBe(12);
    expect(yearsToMonths(2)).toBe(24);
    expect(yearsToMonths(5)).toBe(60);
  });

  it("handles fractional years by flooring", () => {
    expect(yearsToMonths(1.5)).toBe(18);
    expect(yearsToMonths(2.5)).toBe(30);
    expect(yearsToMonths(0.5)).toBe(6);
  });

  it("handles zero", () => {
    expect(yearsToMonths(0)).toBe(0);
  });
});

describe("SENIORITY_THRESHOLDS", () => {
  it("has contiguous, non-overlapping ranges", () => {
    for (let i = 0; i < SENIORITY_THRESHOLDS.length - 1; i++) {
      const current = SENIORITY_THRESHOLDS[i];
      const next = SENIORITY_THRESHOLDS[i + 1];

      // Current maxMonths should equal next minMonths
      expect(current.maxMonths).toBe(next.minMonths);
    }
  });

  it("starts at 0", () => {
    expect(SENIORITY_THRESHOLDS[0].minMonths).toBe(0);
  });

  it("ends at Infinity", () => {
    expect(SENIORITY_THRESHOLDS[SENIORITY_THRESHOLDS.length - 1].maxMonths).toBe(Infinity);
  });

  it("covers all seniority levels", () => {
    const levels = SENIORITY_THRESHOLDS.map((t) => t.level);
    expect(levels).toContain("entry");
    expect(levels).toContain("junior");
    expect(levels).toContain("mid");
    expect(levels).toContain("senior");
    expect(levels).toContain("lead");
    expect(levels).toContain("principal");
  });
});

describe("determinism", () => {
  it("produces same result for same input every time", () => {
    const inputs = [0, 12, 24, 48, 72, 120, 180, 240];

    for (const input of inputs) {
      const result1 = inferSeniorityLevel(input);
      const result2 = inferSeniorityLevel(input);
      const result3 = inferSeniorityLevel(input);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    }
  });
});
