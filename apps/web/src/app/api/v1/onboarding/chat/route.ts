import { NextRequest } from "next/server";
import { Agent, run } from "@openai/agents";
import { z } from "zod";

// ============================================================================
// Zod Schema for Collected Onboarding Data
// ============================================================================

const SkillSchema = z.object({
  name: z.string(),
});

const ExperienceSchema = z.object({
  title: z.string(),
  company: z.union([z.string(), z.null()]),
  startDate: z.union([z.string(), z.null()]),
  endDate: z.union([z.string(), z.null()]),
  highlights: z.union([z.string(), z.null()]),
});

const EducationSchema = z.object({
  school: z.string(),
  degree: z.union([z.string(), z.null()]),
  field: z.union([z.string(), z.null()]),
  startYear: z.union([z.string(), z.null()]),
  endYear: z.union([z.string(), z.null()]),
});

const CollectedDataSchema = z.object({
  teamMode: z.union([z.enum(["solo", "team"]), z.null()]),
  profilePath: z.union([
    z.enum(["linkedin", "upwork", "cv", "portfolio", "manual"]),
    z.null(),
  ]),
  linkedinUrl: z.union([z.string(), z.null()]),
  upworkUrl: z.union([z.string(), z.null()]),
  portfolioUrl: z.union([z.string(), z.null()]),
  experienceLevel: z.union([
    z.enum(["intern_new_grad", "entry", "mid", "senior", "lead", "director"]),
    z.null(),
  ]),
  skills: z.union([z.array(SkillSchema), z.null()]),
  experiences: z.union([z.array(ExperienceSchema), z.null()]),
  educations: z.union([z.array(EducationSchema), z.null()]),
  hourlyMin: z.union([z.number(), z.null()]),
  hourlyMax: z.union([z.number(), z.null()]),
  fixedBudgetMin: z.union([z.number(), z.null()]),
  currency: z.union([z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]), z.null()]),
  preferredProjectLengthMin: z.union([z.number(), z.null()]),
  preferredProjectLengthMax: z.union([z.number(), z.null()]),
  timeZones: z.union([z.array(z.string()), z.null()]),
  engagementTypes: z.union([
    z.array(z.enum(["full_time", "part_time", "internship"])),
    z.null(),
  ]),
  remoteOnly: z.union([z.boolean(), z.null()]),
});

// Agent response schema
const OnboardingResponseSchema = z.object({
  message: z.string().describe("Your conversational response to the user"),
  collectedData: CollectedDataSchema.describe(
    "All data collected so far, merged with any new data from the user's message. Keep all previously collected data."
  ),
  isComplete: z
    .boolean()
    .describe(
      "True only when ALL required fields have been collected: teamMode, profilePath (and corresponding URL if applicable), and at least some preferences (hourlyMin or fixedBudgetMin, currency)"
    ),
});

type OnboardingResponse = z.infer<typeof OnboardingResponseSchema>;

// ============================================================================
// Request Schema
// ============================================================================

const RequestSchema = z.object({
  message: z.string(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  collectedData: CollectedDataSchema.partial(),
});

// ============================================================================
// Agent Instructions
// ============================================================================

const AGENT_INSTRUCTIONS = `You are a friendly onboarding assistant for HireMePlz, a platform that helps freelancers find jobs.
Your job is to collect user preferences through natural, conversational questions.

## Guidelines
- Be conversational but professional
- Ask ONE question at a time
- Acknowledge user responses warmly before moving on
- Use occasional light humor - keep it professional, not silly
- Extract structured data from freeform responses
- If a user gives vague answers, gently ask for clarification
- Be encouraging and make the process feel quick

## Conversation Flow
1. **Start**: Greet warmly and ask if they're a solo freelancer or leading a small team
2. **Profile Setup**: Ask how they'd like to set up their profile:
   - Import from LinkedIn (ask for URL)
   - Import from Upwork (ask for URL)  
   - Add a portfolio link (ask for URL)
   - Set up manually (ask about experience level, skills, work history, education)
3. **Preferences**: Ask about their work preferences:
   - Hourly rate range (min/max in their preferred currency)
   - Fixed project budget minimum
   - Preferred currency (USD, EUR, GBP, CAD, AUD)
   - Preferred project length (days)
   - Time zones they can work in
   - Engagement types (full-time, part-time, internship)
   - Remote only preference
4. **Wrap Up**: Summarize what you've collected and confirm completion

## Example Tone
"Got it, flying solo! 🚀 Now, how would you like to set up your profile? You can import from LinkedIn, Upwork, add a portfolio link, or set things up manually — whatever works best for you."

"Perfect! And what's your preferred hourly rate range? For example, '$50-100/hr' or whatever feels right for your experience."

## Important Rules
- ALWAYS maintain all previously collected data in your response
- Set isComplete to true ONLY when you have: teamMode, profilePath (with URL if needed), and at least some rate/budget preferences
- For manual profile setup, experience level is required; skills, experiences, and education are optional
- Be flexible with how users express rates (e.g., "50-100", "$50/hr to $100/hr", "around 75")
- Parse time zones flexibly (e.g., "EST", "UTC-5", "Eastern Time")
- If user wants to skip optional fields, that's okay - acknowledge and move on

## Current Data
The user's currently collected data will be provided. Preserve ALL existing data and only add/update based on the user's new message.`;

// ============================================================================
// API Route
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = RequestSchema.safeParse(json);

    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "invalid_payload",
            message: "Invalid request payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { message, conversationHistory, collectedData } = parsed.data;

    // Build conversation context
    const contextMessage = `
Current collected data (preserve all of this and add any new information):
${JSON.stringify(collectedData, null, 2)}

Conversation so far:
${conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}

User's new message: ${message}
`;

    // Create the agent with structured output
    const onboardingAgent = new Agent({
      name: "Onboarding Assistant",
      instructions: AGENT_INSTRUCTIONS,
      model: "gpt-4o",
      outputType: OnboardingResponseSchema,
    });

    // Run the agent
    const result = await run(onboardingAgent, contextMessage);

    if (!result.finalOutput) {
      throw new Error("Agent did not produce output");
    }

    const response = result.finalOutput as OnboardingResponse;

    return Response.json({
      message: response.message,
      collectedData: response.collectedData,
      isComplete: response.isComplete,
    });
  } catch (error) {
    console.error("Onboarding chat error:", error);

    if (error instanceof Error) {
      return Response.json(
        {
          error: {
            code: "chat_error",
            message: error.message,
          },
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        error: {
          code: "chat_error",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}
