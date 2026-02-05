import { Agent, run, tool } from "@openai/agents"
import { z } from "zod"

// Predefined suggestions for each question type
const SUGGESTION_OPTIONS = {
  linkedin: ["Add my LinkedIn", "Skip, enter manually"],
  experience_level: ["Junior", "Mid-level", "Senior", "Lead"],
  engagement: ["Full-time", "Part-time", "Both"],
  current_rate: ["$30-50/hr", "$50-80/hr", "$80-120/hr", "$120+/hr"],
  dream_rate: ["$50-80/hr", "$80-150/hr", "$150-250/hr", "$250+/hr"],
  none: [] as string[], // For open-ended questions like name, skills, experiences, education
}

type SuggestionType = keyof typeof SUGGESTION_OPTIONS

const SUGGESTIONS_AGENT_INSTRUCTIONS = `You analyze an assistant's message from an onboarding chat and decide what quick-reply suggestions to show the user.

Your job: Call emit_suggestions with the appropriate type based on what the assistant is asking.

Decision rules:
1. If asking about LinkedIn profile → "linkedin"
2. If asking about experience level (junior/mid/senior) → "experience_level"
3. If asking about engagement type (full-time/part-time) → "engagement"
4. If asking about current hourly rate → "current_rate"
5. If asking about dream/target/ideal rate → "dream_rate"
6. For EVERYTHING else → "none"

Use "none" for:
- Name questions
- Skills questions (even if asking about technologies)
- Work experience questions
- Education questions
- Any question asking for details, descriptions, or elaboration
- Any follow-up question

When in doubt, use "none" - it's better to let the user type than show wrong suggestions.

Always call emit_suggestions exactly once.`

// Run the suggestions agent and return suggestions
export async function getSuggestionsForMessage(assistantMessage: string): Promise<string[]> {
  // Use closure to capture the result from tool execution
  let capturedSuggestions: string[] = []

  const emitSuggestionsTool = tool({
    name: "emit_suggestions",
    description: `Emit quick-reply suggestions for the user based on the question type.

Choose the appropriate type:
- "linkedin": When asking about LinkedIn profile import
- "experience_level": When asking about junior/mid/senior/lead level
- "engagement": When asking about full-time/part-time work preferences
- "current_rate": When asking about current hourly rate
- "dream_rate": When asking about target/dream hourly rate
- "none": For open-ended questions that need typed answers (name, skills description, work experience details, education details, follow-up questions asking for more detail)

IMPORTANT: Use "none" for:
- Questions about the user's name
- Questions about skills (user should type or use skill selector)
- Questions asking for work experience details
- Questions asking for education details
- Any follow-up question asking for more information`,
    parameters: z.object({
      type: z.enum(["linkedin", "experience_level", "engagement", "current_rate", "dream_rate", "none"]),
      reason: z.string().describe("Brief reason for this choice"),
    }),
    execute: async (input) => {
      capturedSuggestions = SUGGESTION_OPTIONS[input.type as SuggestionType]
      return `Selected: ${input.type}`
    },
  })

  try {
    const agent = new Agent({
      name: "Suggestions Agent",
      instructions: SUGGESTIONS_AGENT_INSTRUCTIONS,
      model: "gpt-4.1-nano",
      tools: [emitSuggestionsTool],
    })

    await run(agent, `Assistant's message:\n"${assistantMessage}"`)
    return capturedSuggestions
  } catch (error) {
    console.error("Suggestions agent error:", error)
    return []
  }
}
