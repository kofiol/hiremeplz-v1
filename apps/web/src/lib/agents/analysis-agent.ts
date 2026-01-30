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
    reactionTimes?: number[]
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
}

export async function analyzeInterview(input: AnalyzeInput): Promise<InterviewAnalysis> {
  const { interviewType, transcript, metrics, freelancerProfile } = input

  const transcriptText = transcript
    .map((t) => `[${t.role === "user" ? "Candidate" : "Interviewer"}]: ${t.text}`)
    .join("\n\n")

  const avgReactionTime = metrics.reactionTimes?.length
    ? Math.round(
        metrics.reactionTimes.reduce((a, b) => a + b, 0) /
          metrics.reactionTimes.length
      )
    : null

  const avgResponseDuration = metrics.responseDurations?.length
    ? Math.round(
        metrics.responseDurations.reduce((a, b) => a + b, 0) /
          metrics.responseDurations.length
      )
    : null

  const metricsContext = [
    avgReactionTime !== null ? `Average reaction time: ${avgReactionTime}ms` : null,
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

  const prompt = `Analyze this mock ${interviewType.replace(/_/g, " ")} interview for a freelancer.

## Freelancer Profile
- Name: ${freelancerProfile.name}
- Headline: ${freelancerProfile.headline}
- About: ${freelancerProfile.about}
- Location: ${freelancerProfile.location}
- Skills: ${freelancerProfile.skills.join(", ")}
- Recent experiences: ${freelancerProfile.experiences.map((e) => `${e.title} at ${e.company}`).join("; ")}

## Performance Metrics
${metricsContext || "No metrics available"}

## Full Transcript
${transcriptText}

## Scoring Guide
- Communication (0-100): Clarity, articulation, conciseness, storytelling ability
- Confidence (0-100): Assertiveness, composure, conviction in answers, handling of pushback
- Content Quality (0-100): Relevance, depth, specificity of examples, technical accuracy
- Responsiveness (0-100): Speed of response, ability to think on feet, handling of follow-ups

Provide an overall score (weighted average favoring content quality and communication), exactly 3 strengths, exactly 3 areas for improvement, and a 2-3 paragraph detailed feedback summary. Be specific and reference actual moments from the transcript.`

  const analysisAgent = new Agent({
    name: "Interview Analyst",
    model: "gpt-4.1",
    instructions:
      "You are an expert interview coach who analyzes mock interview transcripts for freelancers. Be constructive, specific, and actionable. Reference exact moments from the transcript in your feedback. Output valid JSON matching the schema.",
    outputType: AnalysisSchema,
  })

  const result = await run(analysisAgent, prompt)
  return result.finalOutput as InterviewAnalysis
}
