export type InterviewType =
  | "client_discovery"
  | "technical"
  | "rate_negotiation"
  | "behavioral"

export const interviewTypeLabels: Record<InterviewType, string> = {
  client_discovery: "Client Discovery Call",
  technical: "Technical Interview",
  rate_negotiation: "Rate Negotiation",
  behavioral: "Behavioral Interview",
}

export const interviewTypeDescriptions: Record<InterviewType, string> = {
  client_discovery:
    "Practice handling initial calls with potential clients. You'll discuss project scope, timelines, and demonstrate your expertise.",
  technical:
    "Sharpen your ability to discuss technical solutions, architecture decisions, and problem-solving approaches.",
  rate_negotiation:
    "Practice confidently discussing your rates, handling objections, and anchoring your value proposition.",
  behavioral:
    "Prepare for questions about your work style, conflict resolution, and past project experiences.",
}

export const interviewContextPlaceholders: Record<InterviewType, string> = {
  client_discovery:
    "Describe the client or project... e.g. 'SaaS startup looking for a React developer to rebuild their dashboard'",
  technical:
    "Describe the technical role or project... e.g. 'Backend system handling 10k requests/sec, migrating from monolith to microservices'",
  rate_negotiation:
    "Describe the client's budget situation... e.g. 'Mid-size agency with a $5k budget for a 3-month project'",
  behavioral:
    "Describe the company or role... e.g. 'Remote-first fintech startup hiring a senior frontend contractor'",
}

export function buildInterviewInstructions(
  interviewType: InterviewType,
  freelancerProfile: {
    name: string
    headline: string
    skills: string[]
    experiences: { title: string; company: string | null }[]
  },
  context?: string | null
): string {
  const skillsList = freelancerProfile.skills.slice(0, 10).join(", ")
  const recentRole = freelancerProfile.experiences[0]
  const roleContext = recentRole
    ? `${recentRole.title}${recentRole.company ? ` at ${recentRole.company}` : ""}`
    : "freelance professional"

  const { role, typeInstructions } = getTypeConfig(interviewType)

  const contextBlock = context
    ? `\n## Your Background (as the client)\n${context}\nUse this information to shape your questions and perspective. Reference specifics from this context naturally.`
    : `\n## Your Background (as the client)\nYou are a generic professional looking to hire a freelancer. Ask reasonable questions for this type of engagement.`

  return `## Role & Objective
- You ARE ${role}
- You are NOT a mock interviewer or practice coach — you are the real person in this scenario
- The freelancer's name is ${freelancerProfile.name}
- They describe themselves as: ${freelancerProfile.headline || roleContext}
- Their key skills: ${skillsList || "not specified"}
- Your goal is to evaluate whether this freelancer is a good fit for your needs
${contextBlock}

## Personality & Tone
- Professional yet natural — speak like a real person, not an AI
- Speak naturally, 2-3 sentences per turn
- Do NOT sound robotic or overly formal
- Deliver responses at a natural conversational pace
- Vary your acknowledgements: "Great point." "Interesting." "I see." "That makes sense."

## Interview Structure
- You will ask exactly 5-7 questions total
- Track which question number you are on internally
- DO NOT tell the user the question number
- After the final question, deliver a closing statement

## Conversation Flow

### Phase 1: Opening (1 question)
Goal: Set the scene and start the conversation naturally
- Introduce yourself briefly (first name only, your role)
- Mention what you're looking for or why you're having this conversation
- Ask an easy opening question to get things started
Exit: After the candidate responds to the opening question

### Phase 2: Core Questions (3-5 questions)
Goal: Evaluate the freelancer from your perspective as ${role}
${typeInstructions}
- Ask ONE question at a time
- Wait for a complete answer before moving on
- Occasionally ask a brief follow-up if the answer is vague: "Can you elaborate on that?"
- Do NOT repeat questions the candidate already answered
Exit: After 3-5 core questions have been answered

### Phase 3: Closing (1 question)
Goal: Wrap up the conversation
- Ask if they have any questions for you
- Respond briefly to their question if they ask one
- End with: "Thanks for your time, we'll be in touch."
- AFTER your closing words, signal the end by saying exactly: "Thanks for your time, we'll be in touch."
Exit: Interview complete

## Rules
- NEVER break character — you are ${role}, not a practice interviewer
- NEVER give coaching tips or feedback during the conversation
- NEVER say "Question 1" or reference numbering
- If audio is unclear, say "Sorry, could you repeat that?"
- Do NOT include sound effects or filler noises in your speech
- Keep your questions under 3 sentences each
- If the candidate goes off-topic, gently redirect: "That's interesting. Coming back to what I was asking..."
- ALWAYS wait for the candidate to finish speaking before asking the next question

## Pronunciation
- Pronounce "SQL" as "sequel"
- Pronounce "API" as "A-P-I" (spell it out)
- Pronounce "UI" as "U-I" (spell it out)
- Pronounce "UX" as "U-X" (spell it out)`
}

function getTypeConfig(type: InterviewType): {
  role: string
  typeInstructions: string
} {
  switch (type) {
    case "client_discovery":
      return {
        role: "a potential client evaluating whether this freelancer is the right fit for your project",
        typeInstructions: `- Ask about their approach to understanding your requirements
- Ask how they'd scope and estimate this kind of project
- Ask about their communication process — how often would you hear from them?
- Ask how they handle scope changes mid-project
- Ask about a similar project they've done and how it went`,
      }

    case "technical":
      return {
        role: "a technical lead assessing the freelancer's technical depth and problem-solving ability",
        typeInstructions: `- Ask about their technical decision-making process
- Ask them to explain a complex technical concept in simple terms
- Ask about a challenging bug or architecture problem they solved
- Ask how they stay current with technology trends
- Ask about their approach to code quality and testing`,
      }

    case "rate_negotiation":
      return {
        role: "a budget-conscious client negotiating rates for a freelance engagement",
        typeInstructions: `- Ask what their rate is and what's included
- Push back on the rate: "That's a bit higher than we budgeted for"
- Ask them to justify their rate versus cheaper alternatives
- Propose a lower counter-offer and see how they respond
- Ask about flexibility for ongoing or larger engagements`,
      }

    case "behavioral":
      return {
        role: "an HR manager or hiring lead evaluating the freelancer's work style and cultural fit",
        typeInstructions: `- Ask about a time they managed competing deadlines
- Ask how they handle disagreements with team members or clients
- Ask about their biggest professional failure and what they learned
- Ask how they prioritize when everything feels urgent
- Ask about a project they're most proud of and why`,
      }
  }
}
