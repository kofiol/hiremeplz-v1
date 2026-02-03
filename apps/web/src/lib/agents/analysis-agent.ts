import "server-only"
import { Agent, run } from "@openai/agents"
import { z } from "zod"

const AnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  categories: z.object({
    communication: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    contentQuality: z.number().min(0).max(100),
    responsiveness: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()).min(1).max(3),
  improvements: z.array(z.string()).min(1).max(3),
  detailedFeedback: z.string(),
})

export type InterviewAnalysis = z.infer<typeof AnalysisSchema>

interface TranscriptEntry {
  role: "user" | "assistant"
  text: string
  timestamp?: string
}

interface AnalyzeInput {
  interviewType: string
  transcript: TranscriptEntry[]
  metrics: {
    thinkingPauses?: number[]
    responseDurations?: number[]
    fillerWordCount?: number
    totalDuration?: number
  }
  freelancerProfile: {
    name: string
    headline: string
    about: string
    location: string
    skills: string[]
    experiences: { title: string; company: string | null; highlights: string | null }[]
  }
  context?: string | null
}

export async function analyzeInterview(input: AnalyzeInput): Promise<InterviewAnalysis> {
  const { interviewType, transcript, metrics, freelancerProfile, context } = input

  const transcriptText = transcript
    .map((t) => `[${t.role === "user" ? "Candidate" : "Interviewer"}]: ${t.text}`)
    .join("\n\n")

  const avgThinkingPause = metrics.thinkingPauses?.length
    ? Math.round(
        metrics.thinkingPauses.reduce((a, b) => a + b, 0) /
          metrics.thinkingPauses.length
      )
    : null

  const avgResponseDuration = metrics.responseDurations?.length
    ? Math.round(
        metrics.responseDurations.reduce((a, b) => a + b, 0) /
          metrics.responseDurations.length
      )
    : null

  const metricsContext = [
    avgThinkingPause !== null
      ? `Average thinking pause before answering: ${avgThinkingPause}ms (2-5s pauses are normal and expected)`
      : null,
    avgResponseDuration !== null
      ? `Average response duration: ${avgResponseDuration}ms`
      : null,
    metrics.fillerWordCount !== undefined
      ? `Filler words used: ${metrics.fillerWordCount}`
      : null,
    metrics.totalDuration
      ? `Total interview duration: ${Math.round(metrics.totalDuration / 1000)}s`
      : null,
  ]
    .filter(Boolean)
    .join("\n")

  const contextBlock = context
    ? `\n## Interview Context\n${context}\n`
    : ""

  const prompt = `Analyze this ${interviewType.replace(/_/g, " ")} interview for a freelancer.

## Freelancer Profile
- Name: ${freelancerProfile.name}
- Headline: ${freelancerProfile.headline}
- About: ${freelancerProfile.about}
- Location: ${freelancerProfile.location}
- Skills: ${freelancerProfile.skills.join(", ")}
- Recent experiences: ${freelancerProfile.experiences.map((e) => `${e.title} at ${e.company}`).join("; ")}
${contextBlock}
## Performance Metrics
${metricsContext || "No metrics available"}

## Full Transcript
${transcriptText}

## Scoring Guide (be harsh — most first-timers land 40-65)
- Communication (0-100): Clarity, articulation, conciseness, storytelling. Penalize rambling, filler words, vague language.
- Confidence (0-100): Assertiveness, composure, conviction. Penalize hedging ("I guess", "maybe", "kind of"), backtracking, and nervous qualifiers.
- Content Quality (0-100): Relevance, depth, specificity of examples, concrete outcomes. Penalize generic answers that lack numbers, results, or real stories.
- Responsiveness (0-100): Quality of engagement — how well the candidate listened, addressed the actual question asked, and handled follow-ups. Thinking pauses of 2-5 seconds are normal and should NOT be penalized. Only penalize pauses of 8+ seconds or if the candidate seemed lost/confused.

Provide an overall score (weighted average favoring content quality and communication), exactly 3 strengths (only genuinely impressive moments), exactly 3 areas for improvement (specific and actionable), and a detailed feedback summary in markdown format. Address ${freelancerProfile.name} directly by name. Quote their actual words when pointing out issues.`

  const analysisAgent = new Agent({
    name: "Interview Analyst",
    model: "gpt-4.1",
    instructions: `You are a brutally honest senior interview coach who analyzes interview transcripts for freelancers. You do NOT sugarcoat. Your job is to make the candidate better, not to make them feel good. Address them directly by name throughout your feedback.

Scoring principles:
- A score of 70+ means genuinely strong performance. Most candidates should score 40-65 on their first attempts.
- Do NOT inflate scores. If the candidate gave vague, generic answers, score them low regardless of how "nice" they sounded.
- A perfect 100 is essentially impossible in a practice session.
- Short, shallow answers = low content quality. Filler words and hesitation = low confidence.
- Responsiveness measures engagement quality: did they actually answer the question asked? Did they pick up on cues? Did they handle follow-ups well? Thinking pauses of 2-5 seconds are completely normal. Only penalize pauses of 8+ seconds or if the candidate seemed genuinely lost.
- If the candidate failed to give specific examples, numbers, or concrete outcomes, call it out explicitly.

Feedback principles:
- Address the candidate by their first name. Make it personal — this is YOUR feedback to THEM.
- Name specific weak moments: quote the candidate's actual words when they fumbled.
- Improvements should be concrete and actionable, not vague ("be more confident" is useless; "${freelancerProfile.name}, when asked about rates, state your number first without hedging" is useful).
- Strengths should only highlight genuinely impressive moments, not participation trophies.
- The detailed feedback should read like honest coaching from someone who wants the candidate to win their next real interview.

Formatting for detailedFeedback (use markdown):
- Use ### headings to structure sections (e.g., "### The Bottom Line", "### What Went Wrong", "### What You Need to Fix")
- Use **bold** for emphasis on key points
- Use \`inline code\` when quoting the candidate's exact words
- Use bullet points or numbered lists for actionable items
- Start with a direct overall assessment addressing them by name under "### The Bottom Line"

Output valid JSON matching the schema.`,
    outputType: AnalysisSchema,
  })

  const result = await run(analysisAgent, prompt)
  return result.finalOutput as InterviewAnalysis
}
