import type { InputGuardrail, OutputGuardrail } from "@openai/agents"

// ============================================================================
// Content Moderation Guardrail (Input)
// ============================================================================

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+a/i,
  /forget\s+(everything|all|your)\s+(you|instructions|rules)/i,
  /disregard\s+(all|your|the)\s+(previous|above|prior)/i,
  /new\s+instructions?\s*:/i,
  /system\s*prompt\s*:/i,
  /\bDAN\b.*\bmode\b/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if\s+you\s+(are|were)\s+(?!a\s+(junior|senior|mid|lead|entry))/i,
  /jailbreak/i,
]

export const contentModerationGuardrail: InputGuardrail = {
  name: "Content Moderation",
  async execute({ input }) {
    const inputText = typeof input === "string" ? input : JSON.stringify(input)
    const violations = INJECTION_PATTERNS.filter((p) => p.test(inputText))

    if (violations.length > 0) {
      console.warn(
        `[guardrail] Content moderation triggered: ${violations.length} pattern(s) matched`
      )
      return {
        outputInfo: `Detected ${violations.length} prompt injection pattern(s)`,
        tripwireTriggered: true,
      }
    }

    return {
      outputInfo: "Input passed content moderation",
      tripwireTriggered: false,
    }
  },
}

// ============================================================================
// Analysis Scope Guardrail (Output)
// ============================================================================

const OUT_OF_SCOPE_TERMS = [
  "portfolio",
  "github",
  "open source",
  "personal website",
  "case stud",
  "testimonial",
  "certification",
  "social proof",
  "linkedin profile quality",
  "upwork profile quality",
  "headshot",
  "blog post",
  "published article",
  "speaking engagement",
  "professional association",
  "link your github",
  "add a portfolio",
  "create a website",
  "build a portfolio",
]

export const analysisScopeGuardrail: OutputGuardrail = {
  name: "Analysis Scope",
  async execute({ agentOutput }) {
    const outputText =
      typeof agentOutput === "string" ? agentOutput : JSON.stringify(agentOutput)
    const lower = outputText.toLowerCase()

    const violations = OUT_OF_SCOPE_TERMS.filter((term) =>
      lower.includes(term)
    )

    if (violations.length >= 3) {
      console.warn(
        `[guardrail] Analysis scope triggered: ${violations.length} out-of-scope terms: ${violations.join(", ")}`
      )
      return {
        outputInfo: `Analysis contains ${violations.length} out-of-scope mentions: ${violations.join(", ")}`,
        tripwireTriggered: true,
      }
    }

    if (violations.length > 0) {
      console.info(
        `[guardrail] Analysis scope info: ${violations.length} borderline mention(s): ${violations.join(", ")}`
      )
    }

    return {
      outputInfo:
        violations.length > 0
          ? `${violations.length} borderline mention(s) found but within threshold`
          : "Output within scope",
      tripwireTriggered: false,
    }
  },
}

// ============================================================================
// Step Validator Guardrail (Output, informational only)
// ============================================================================

export function createStepValidatorGuardrail(
  nextStep: string
): OutputGuardrail {
  return {
    name: "Step Validator",
    async execute({ agentOutput }) {
      const outputText =
        typeof agentOutput === "string" ? agentOutput : JSON.stringify(agentOutput)

      const stepKeywords: Record<string, string[]> = {
        linkedinUrl: ["linkedin", "import"],
        experienceLevel: ["experience level", "junior", "mid", "senior", "lead"],
        skills: ["skill", "technolog", "framework", "language"],
        experiences: ["experience", "work history", "role", "position", "job"],
        educations: ["education", "school", "university", "degree"],
        engagementTypes: ["full-time", "part-time", "engagement", "availability"],
        currentRate: ["current rate", "charging", "current hourly"],
        dreamRate: ["dream rate", "target rate", "ideal rate", "dream hourly"],
      }

      const keywords = stepKeywords[nextStep] ?? []
      const lower = outputText.toLowerCase()
      const mentionsNextStep = keywords.some((kw) => lower.includes(kw))

      if (!mentionsNextStep && keywords.length > 0) {
        console.info(
          `[guardrail] Step validator: agent response may not be asking about expected next step "${nextStep}"`
        )
      }

      // Informational only — never trips
      return {
        outputInfo: mentionsNextStep
          ? `Agent appears to be asking about ${nextStep}`
          : `Agent may have skipped ${nextStep}`,
        tripwireTriggered: false,
      }
    },
  }
}
