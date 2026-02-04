import { z } from "zod"

// ============================================================================
// Sub-schemas
// ============================================================================

export const SkillSchema = z.object({
  name: z.string(),
})

export const ExperienceSchema = z.object({
  title: z.string(),
  company: z.union([z.string(), z.null()]),
  startDate: z.union([z.string(), z.null()]),
  endDate: z.union([z.string(), z.null()]),
  highlights: z.union([z.string(), z.null()]),
})

export const EducationSchema = z.object({
  school: z.string(),
  degree: z.union([z.string(), z.null()]),
  field: z.union([z.string(), z.null()]),
  startYear: z.union([z.string(), z.null()]),
  endYear: z.union([z.string(), z.null()]),
})

// ============================================================================
// Enum schemas
// ============================================================================

export const ExperienceLevelSchema = z.enum([
  "intern_new_grad",
  "entry",
  "mid",
  "senior",
  "lead",
  "director",
])

export const CurrencySchema = z.enum(["USD", "EUR", "GBP", "CAD", "AUD"])

export const EngagementTypeSchema = z.enum(["full_time", "part_time"])

export const TeamModeSchema = z.enum(["solo", "team"])

export const ProfilePathSchema = z.enum(["linkedin", "manual"])

// ============================================================================
// CollectedData — single source of truth
// ============================================================================

export const CollectedDataSchema = z.object({
  fullName: z.union([z.string(), z.null()]),
  teamMode: z.union([TeamModeSchema, z.null()]),
  profilePath: z.union([ProfilePathSchema, z.null()]),
  linkedinUrl: z.union([z.string(), z.null()]),
  experienceLevel: z.union([ExperienceLevelSchema, z.null()]),
  skills: z.union([z.array(SkillSchema), z.null()]),
  experiences: z.union([z.array(ExperienceSchema), z.null()]),
  educations: z.union([z.array(EducationSchema), z.null()]),
  currentRateMin: z.union([z.number(), z.null()]),
  currentRateMax: z.union([z.number(), z.null()]),
  dreamRateMin: z.union([z.number(), z.null()]),
  dreamRateMax: z.union([z.number(), z.null()]),
  currency: z.union([CurrencySchema, z.null()]),
  engagementTypes: z.union([z.array(EngagementTypeSchema), z.null()]),
})

export type CollectedData = z.infer<typeof CollectedDataSchema>

export const INITIAL_COLLECTED_DATA: CollectedData = {
  fullName: null,
  teamMode: "solo",
  profilePath: "manual",
  linkedinUrl: null,
  experienceLevel: null,
  skills: null,
  experiences: null,
  educations: null,
  currentRateMin: null,
  currentRateMax: null,
  dreamRateMin: null,
  dreamRateMax: null,
  currency: null,
  engagementTypes: null,
}

// ============================================================================
// Profile Analysis
// ============================================================================

export const ProfileAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  categories: z.object({
    skillsBreadth: z.number().min(0).max(100),
    experienceQuality: z.number().min(0).max(100),
    ratePositioning: z.number().min(0).max(100),
    marketReadiness: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()).min(1).max(3),
  improvements: z.array(z.string()).min(1).max(3),
  detailedFeedback: z.string(),
})

export type ProfileAnalysis = z.infer<typeof ProfileAnalysisSchema>

export const ProfileAnalysisJsonSchema = {
  type: "json_schema" as const,
  name: "ProfileAnalysisResponse",
  strict: true,
  schema: {
    type: "object" as const,
    additionalProperties: false,
    required: [
      "overallScore",
      "categories",
      "strengths",
      "improvements",
      "detailedFeedback",
    ],
    properties: {
      overallScore: { type: "number" },
      categories: {
        type: "object" as const,
        additionalProperties: false,
        required: [
          "skillsBreadth",
          "experienceQuality",
          "ratePositioning",
          "marketReadiness",
        ],
        properties: {
          skillsBreadth: { type: "number" },
          experienceQuality: { type: "number" },
          ratePositioning: { type: "number" },
          marketReadiness: { type: "number" },
        },
      },
      strengths: { type: "array", items: { type: "string" } },
      improvements: { type: "array", items: { type: "string" } },
      detailedFeedback: { type: "string" },
    },
  },
}

// ============================================================================
// Chat types
// ============================================================================

export type ToolCallInfo = {
  name: string
  status: "completed" | "failed" | "aborted"
  elapsed?: number
}

export type ReasoningInfo = {
  content: string
  duration?: number
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  toolCall?: ToolCallInfo
  profileAnalysis?: ProfileAnalysis & {
    // Legacy fields from old saved progress
    score?: number
    title?: string
    summary?: string
    analysis?: string
  }
  reasoning?: ReasoningInfo
  voiceOrigin?: boolean
}

export type SSEEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string; status: "started" | "completed" | "failed" }
  | { type: "tool_status"; elapsed: number }
  | { type: "final"; collectedData: Partial<CollectedData>; isComplete: boolean }
  | { type: "analysis_started" }
  | { type: "reasoning_started" }
  | { type: "reasoning_chunk"; content: string }
  | { type: "reasoning_evaluating" }
  | { type: "reasoning_completed"; duration: number }
  | { type: "profile_analysis" } & ProfileAnalysis
  | { type: "analysis_error"; message: string }
  | { type: "error"; message: string }

// ============================================================================
// Request schema
// ============================================================================

export const ChatRequestSchema = z.object({
  message: z.string(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  collectedData: CollectedDataSchema.partial(),
  stream: z.boolean().optional().default(false),
})

// ============================================================================
// Save profile data tool params (nullable for OpenAI strict mode)
// ============================================================================

export const SaveProfileDataParamsSchema = z.object({
  fullName: z.string().nullable(),
  teamMode: TeamModeSchema.nullable(),
  profilePath: ProfilePathSchema.nullable(),
  linkedinUrl: z.string().nullable(),
  experienceLevel: ExperienceLevelSchema.nullable(),
  skills: z.array(SkillSchema).nullable(),
  experiences: z.array(ExperienceSchema).nullable(),
  educations: z.array(EducationSchema).nullable(),
  currentRateMin: z.number().nullable(),
  currentRateMax: z.number().nullable(),
  dreamRateMin: z.number().nullable(),
  dreamRateMax: z.number().nullable(),
  currency: CurrencySchema.nullable(),
  engagementTypes: z.array(EngagementTypeSchema).nullable(),
})

export type SaveProfileDataInput = z.infer<typeof SaveProfileDataParamsSchema>
