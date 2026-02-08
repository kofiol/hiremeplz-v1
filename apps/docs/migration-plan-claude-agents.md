# Migration Plan: OpenAI Agents SDK → Claude Agents SDK (Hybrid Architecture)

**Status:** Planning
**Target Completion:** 2-3 weeks
**Approach:** Hybrid - Claude for text agents, OpenAI for voice features
**Last Updated:** 2026-02-07

---

## Executive Summary

Migrate all text-based AI agents from OpenAI Agents SDK to Claude Agents SDK while preserving OpenAI's Realtime API (interview prep) and Whisper API (transcription) due to their irreplaceable voice capabilities.

**Benefits:**
- Better reasoning quality with Claude Sonnet 4.5/Opus 4.6
- Potential cost savings on text generation workloads
- Cleaner architecture with specialized services for their strengths
- Maintains best-in-class voice features

**Scope:**
- ✅ Migrate: 6 text-based agents (onboarding, overview, proposals, CV, analysis)
- ❌ Keep: OpenAI Realtime API (voice interviews)
- ❌ Keep: OpenAI Whisper API (audio transcription)

---

## Architecture Overview

### Before (Current)
```
┌─────────────────────────────────────────┐
│         OpenAI APIs                     │
├─────────────────────────────────────────┤
│ • Agents SDK (all text agents)          │
│ • Realtime API (voice interviews)       │
│ • Whisper API (transcription)           │
└─────────────────────────────────────────┘
```

### After (Target)
```
┌──────────────────────────┐  ┌──────────────────────────┐
│   Claude Agents SDK      │  │   OpenAI APIs            │
├──────────────────────────┤  ├──────────────────────────┤
│ • Onboarding agent       │  │ • Realtime API (voice)   │
│ • Overview copilot       │  │ • Whisper API (STT)      │
│ • Proposal writer        │  │                          │
│ • CV builder chat        │  │                          │
│ • Profile analysis       │  │                          │
│ • Interview analysis     │  │                          │
└──────────────────────────┘  └──────────────────────────┘
```

---

## Migration Inventory

### Text Agents to Migrate (6)

| Agent | File(s) | Complexity | Features Used | Est. Time |
|-------|---------|------------|---------------|-----------|
| **Overview Copilot** | `api/v1/overview/chat/route.ts` | 🟢 Low | Basic streaming | 2h |
| **Proposal Writer** | `api/v1/proposals/generate/route.ts` | 🟢 Low | Streaming, temperature | 2h |
| **CV Builder Chat** | `api/v1/cv-builder/chat/route.ts` | 🟡 Medium | Streaming, 5 tools | 4h |
| **Interview Analysis** | `lib/agents/analysis-agent.ts` | 🟡 Medium | Structured output (Zod) | 3h |
| **Profile Analysis** | `api/v1/profile/analysis/route.ts` | 🟡 Medium | Structured output, reasoning | 3h |
| **Onboarding Agent** | `api/v1/onboarding/chat/` | 🔴 High | 8 tools, guardrails, streaming, reasoning | 8h |

**Total Estimated Effort:** 22 hours (~3 days of focused work)

### Voice Features to Keep (2)

| Feature | File(s) | Why Keep OpenAI |
|---------|---------|-----------------|
| **Interview Prep (Realtime)** | `api/v1/interview-prep/token/route.ts`<br>`api/v1/interview-prep/session/route.ts`<br>`(app)/interview-prep/session/[sessionId]/page.tsx` | No Claude equivalent for real-time WebRTC voice |
| **Voice Transcription** | `api/v1/onboarding/transcribe/route.ts` | Whisper is best-in-class, cheap, accurate |

---

## Model Mapping

| Current Model | Use Case | New Model | Rationale |
|--------------|----------|-----------|-----------|
| `gpt-5-mini` | Onboarding conversational agent | `claude-sonnet-4-5` | Better reasoning, conversational quality |
| `gpt-4.1-mini` | Overview, proposals, CV chat | `claude-sonnet-4-5` | Cost-effective for chat, high quality |
| `gpt-4.1` | Profile analysis (extended reasoning) | `claude-opus-4-6` | Superior reasoning for complex analysis |
| `gpt-4.1-nano` | Onboarding filler agent | `claude-haiku-4-5` | Fastest, cheapest option |
| `gpt-realtime-mini` | Voice interviews | ⚠️ **Keep as-is** | No migration |
| `whisper-1` | Audio transcription | ⚠️ **Keep as-is** | No migration |

---

## Technical Implementation Guide

### Phase 0: Setup (Day 1 Morning)

**Install Dependencies:**
```bash
cd apps/web
pnpm add @anthropic-ai/sdk
```

**Environment Variables:**
Add to `.env.local` and Vercel:
```bash
# Anthropic (new)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (keep for voice features)
OPENAI_API_KEY=sk-...
```

**Create Shared Utilities:**
Create `apps/web/src/lib/claude-agent.server.ts`:
```typescript
import "server-only"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export function createClaudeAgent(config: {
  model: "claude-sonnet-4-5" | "claude-opus-4-6" | "claude-haiku-4-5"
  systemPrompt: string
  temperature?: number
  maxTokens?: number
}) {
  return {
    ...config,
    client,
  }
}

export { client as anthropic }
```

---

### Phase 1: Simple Agents (Day 1 Afternoon)

#### 1.1 Overview Copilot
**File:** `apps/web/src/app/api/v1/overview/chat/route.ts`

**Current Pattern:**
```typescript
import { Agent, run } from "@openai/agents"

const agent = new Agent({
  name: "HireMePlz Copilot",
  instructions: SYSTEM_PROMPT,
  model: "gpt-4.1-mini",
})

const result = await run(agent, userPrompt, { stream: true })
const textStream = result.toTextStream({ compatibleWithNodeStreams: false })

for await (const chunk of textStream) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`))
}
```

**New Pattern:**
```typescript
import { anthropic } from "@/lib/claude-agent.server"

const stream = await anthropic.messages.stream({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  system: SYSTEM_PROMPT,
  messages: [
    { role: "user", content: userPrompt }
  ],
})

for await (const chunk of stream) {
  if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
    controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ type: "text", content: chunk.delta.text })}\n\n`
      )
    )
  }
}
```

**Testing Checklist:**
- [ ] Streaming works end-to-end
- [ ] Context injection (profile data) works
- [ ] Rate limiting still applies
- [ ] Error handling works
- [ ] Frontend receives chunks correctly

---

#### 1.2 Proposal Writer
**File:** `apps/web/src/app/api/v1/proposals/generate/route.ts`

**Migration Notes:**
- Same pattern as Overview Copilot
- Preserve temperature setting from `aiPrefs.proposal_temperature`
- Map to Claude's temperature parameter (0-1 scale)

**Changes:**
```typescript
const stream = await anthropic.messages.stream({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  temperature: aiPrefs.proposal_temperature ?? 0.7,
  system: PROPOSAL_SYSTEM_PROMPT,
  messages: [{ role: "user", content: userPrompt }],
})
```

**Testing Checklist:**
- [ ] Temperature control works
- [ ] Tone (professional/casual/confident) affects output
- [ ] Platform-specific formatting preserved
- [ ] Conversation history works

---

### Phase 2: Structured Output Agents (Day 2)

#### 2.1 Interview Analysis Agent
**File:** `apps/web/src/lib/agents/analysis-agent.ts`

**Challenge:** OpenAI's `outputType: ZodSchema` → Claude doesn't have direct equivalent

**Current:**
```typescript
const analysisAgent = new Agent({
  name: "Interview Analyst",
  model: "gpt-4.1",
  instructions: `...`,
  outputType: AnalysisSchema, // Zod schema
})

const result = await run(analysisAgent, prompt)
return result.finalOutput as InterviewAnalysis
```

**New Approach (JSON Mode + Validation):**
```typescript
export async function analyzeInterview(input: AnalyzeInput): Promise<InterviewAnalysis> {
  const prompt = `${buildAnalysisPrompt(input)}

CRITICAL: You MUST return valid JSON matching this exact schema:
{
  "overallScore": <number 0-100>,
  "categories": { "communication": <0-100>, "confidence": <0-100>, ... },
  "strengths": ["<str1>", "<str2>", "<str3>"],
  "improvements": ["<imp1>", "<imp2>", "<imp3>"],
  "detailedFeedback": "<markdown text>"
}

Return ONLY the JSON object, no other text.`

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6", // Use Opus for complex analysis
    max_tokens: 4096,
    system: INTERVIEW_ANALYST_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  })

  const textContent = response.content.find(c => c.type === "text")
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude")
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("No JSON found in response")
  }

  const parsed = JSON.parse(jsonMatch[0])
  return AnalysisSchema.parse(parsed) // Validate with Zod
}
```

**Testing Checklist:**
- [ ] JSON parsing works reliably
- [ ] Zod validation catches malformed responses
- [ ] Scores are in valid ranges (0-100)
- [ ] Markdown formatting in detailedFeedback preserved
- [ ] All required fields present

---

#### 2.2 Profile Analysis
**File:** `apps/web/src/app/api/v1/profile/analysis/route.ts`

**Migration Notes:**
- Same JSON mode pattern as Interview Analysis
- Use Claude Opus 4.6 for extended reasoning
- Schema: `{ overallScore, categories, strengths, improvements, detailedFeedback }`

**Additional Consideration:**
- Current uses "extended reasoning" mode (`modelSettings: { reasoning: { effort: "low" } }`)
- Claude doesn't have explicit reasoning effort controls, but extended thinking is native
- Test if Opus 4.6 provides comparable depth without explicit settings

---

### Phase 3: Tool-Based Agents (Day 3)

#### 3.1 CV Builder Chat
**File:** `apps/web/src/app/api/v1/cv-builder/chat/route.ts`

**Challenge:** Migrate 5 tools from OpenAI SDK to Claude tool calling

**Current Tool Pattern:**
```typescript
const updateSummary = tool({
  name: "update_summary",
  description: "Set or rewrite the professional summary section of the CV.",
  parameters: updateSummaryParams, // Zod schema
  execute: async (_input: unknown) => {
    const args = _input as z.infer<typeof updateSummaryParams>
    toolCalls.push({ name: "update_summary", args })
    return "Summary updated."
  },
})

const agent = new Agent({
  tools: [updatePersonalInfo, updateSummary, updateExperience, ...],
  // ...
})
```

**New Pattern:**
```typescript
const tools: Anthropic.Tool[] = [
  {
    name: "update_summary",
    description: "Set or rewrite the professional summary section of the CV.",
    input_schema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "The new professional summary text"
        }
      },
      required: ["summary"]
    }
  },
  // ... other tools
]

const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = []

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  system: SYSTEM_PROMPT + feedbackSuffix,
  messages: [{ role: "user", content: userPrompt }],
  tools,
})

// Handle tool calls
for (const block of response.content) {
  if (block.type === "tool_use") {
    toolCalls.push({ name: block.name, args: block.input as Record<string, unknown> })
  }
}
```

**Streaming with Tools:**
```typescript
const stream = await anthropic.messages.stream({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: userPrompt }],
  tools,
})

for await (const chunk of stream) {
  if (chunk.type === "content_block_delta") {
    if (chunk.delta.type === "text_delta") {
      // Stream text
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: "text", content: chunk.delta.text })}\n\n`
      ))
    }
  } else if (chunk.type === "content_block_stop") {
    const block = stream.currentContentBlock
    if (block?.type === "tool_use") {
      toolCalls.push({ name: block.name, args: block.input as Record<string, unknown> })
    }
  }
}

// Emit tool calls after streaming completes
for (const tc of toolCalls) {
  controller.enqueue(encoder.encode(
    `data: ${JSON.stringify({ type: "tool_call", name: tc.name, args: tc.args })}\n\n`
  ))
}
```

**Testing Checklist:**
- [ ] All 5 tools work: updatePersonalInfo, updateSummary, updateExperience, updateEducation, updateSkills
- [ ] Tool calls stream correctly
- [ ] Frontend applies CV updates from tool calls
- [ ] Conversation history preserves tool call context

---

### Phase 4: Complex Agent (Onboarding) (Days 4-5)

#### 4.1 Onboarding Agent System
**Files:**
- `api/v1/onboarding/chat/agent.ts` - Agent factory
- `api/v1/onboarding/chat/route.ts` - Main handler
- `api/v1/onboarding/chat/tools.ts` - 8 tool definitions
- `api/v1/onboarding/chat/guardrails.ts` - Input/output validation
- `api/v1/onboarding/chat/streaming.ts` - Streaming utilities

**Migration Strategy:**

**Step 1: Migrate Tools (8 tools)**
Convert all tools from OpenAI SDK to Claude format:

Tools to migrate:
1. `save_profile_data`
2. `trigger_profile_analysis`
3. `set_input_hint`
4. (5 more based on your implementation)

**Example:**
```typescript
// Before (OpenAI)
export const saveProfileData = tool({
  name: "save_profile_data",
  description: "Save profile fields to the database. Call immediately when user provides info.",
  parameters: z.object({
    field: z.enum(["linkedinUrl", "experienceLevel", "skills", ...]),
    value: z.unknown(),
  }),
  execute: async ({ field, value }, { context }) => {
    const { userId, teamId } = context
    await updateProfileInDatabase(userId, teamId, field, value)
    return `Saved ${field}`
  },
})

// After (Claude)
const tools: Anthropic.Tool[] = [
  {
    name: "save_profile_data",
    description: "Save profile fields to the database. Call immediately when user provides info.",
    input_schema: {
      type: "object",
      properties: {
        field: {
          type: "string",
          enum: ["linkedinUrl", "experienceLevel", "skills", "experiences", ...],
          description: "The profile field to save"
        },
        value: {
          description: "The value to save (can be string, object, or array depending on field)"
        }
      },
      required: ["field", "value"]
    }
  }
]

// Tool execution happens in route handler
for (const block of response.content) {
  if (block.type === "tool_use") {
    if (block.name === "save_profile_data") {
      const { field, value } = block.input as { field: string; value: unknown }
      await updateProfileInDatabase(userId, teamId, field, value)
    }
    // ... handle other tools
  }
}
```

**Step 2: Reimplement Guardrails**
Claude SDK has no built-in guardrails → implement as middleware

Create `apps/web/src/lib/guardrails.server.ts`:
```typescript
import "server-only"

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+a/i,
  // ... (copy from guardrails.ts)
]

export async function validateInput(input: string): Promise<void> {
  const violations = INJECTION_PATTERNS.filter(p => p.test(input))
  if (violations.length > 0) {
    console.warn(`[guardrail] Content moderation triggered: ${violations.length} pattern(s)`)
    throw new Error("Invalid input detected")
  }
}

export async function validateOutput(output: string): Promise<void> {
  const OUT_OF_SCOPE_TERMS = ["portfolio", "github", "open source", ...]
  const lower = output.toLowerCase()
  const violations = OUT_OF_SCOPE_TERMS.filter(term => lower.includes(term))

  if (violations.length >= 3) {
    console.warn(`[guardrail] Analysis scope triggered: ${violations.length} terms`)
    throw new Error("Output contains too many out-of-scope mentions")
  }
}
```

**Usage in route:**
```typescript
// Before agent call
await validateInput(message)

const response = await anthropic.messages.create({ ... })

// After response
const textContent = response.content.find(c => c.type === "text")
if (textContent?.type === "text") {
  await validateOutput(textContent.text)
}
```

**Step 3: Migrate Conversation Handler**
Update `api/v1/onboarding/chat/route.ts`:

**Key changes:**
- Replace `Agent` and `run` imports with Claude SDK
- Convert multi-turn conversation history to Claude's message format
- Handle tool calls in streaming mode
- Apply guardrails before/after
- Preserve all existing business logic (progress tracking, data status, step validation)

**Step 4: Update Streaming Logic**
Adapt `streaming.ts` for Claude's streaming format:

```typescript
export async function streamOnboardingResponse(
  anthropic: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  tools: Anthropic.Tool[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const messages = [
    ...conversationHistory.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content
    })),
    { role: "user" as const, content: userPrompt }
  ]

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
    tools,
  })

  const toolCalls: Array<{ name: string; input: unknown }> = []

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: "text", content: chunk.delta.text })}\n\n`
      ))
    } else if (chunk.type === "content_block_stop") {
      const block = stream.currentContentBlock
      if (block?.type === "tool_use") {
        toolCalls.push({ name: block.name, input: block.input })
      }
    }
  }

  return toolCalls
}
```

**Testing Checklist:**
- [ ] All 8 steps of onboarding flow work
- [ ] LinkedIn import triggers correct tool
- [ ] Skills, experiences, educations save correctly
- [ ] Input hints update UI appropriately
- [ ] Guardrails block malicious input
- [ ] Guardrails block out-of-scope analysis suggestions
- [ ] Progress tracking works
- [ ] Conversation persistence works
- [ ] Multi-turn conversations maintain context
- [ ] trigger_profile_analysis fires at completion

---

### Phase 5: Testing & Validation (Day 6)

#### 5.1 Integration Tests

Create `apps/web/src/app/api/v1/__tests__/claude-agents.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import { anthropic } from "@/lib/claude-agent.server"

describe("Claude Agents Integration", () => {
  it("should stream basic responses", async () => {
    const stream = await anthropic.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say hello" }],
    })

    let fullText = ""
    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        fullText += chunk.delta.text
      }
    }

    expect(fullText.length).toBeGreaterThan(0)
  })

  it("should handle tool calls", async () => {
    const tools: Anthropic.Tool[] = [
      {
        name: "get_weather",
        description: "Get weather for a city",
        input_schema: {
          type: "object",
          properties: {
            city: { type: "string" }
          },
          required: ["city"]
        }
      }
    ]

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: "What's the weather in SF?" }],
      tools,
    })

    const toolUse = response.content.find(c => c.type === "tool_use")
    expect(toolUse).toBeDefined()
    expect(toolUse?.name).toBe("get_weather")
  })

  it("should validate JSON output", async () => {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: "You are a JSON-only API. Return only valid JSON.",
      messages: [{
        role: "user",
        content: "Return JSON with fields: score (number), feedback (string)"
      }],
    })

    const text = response.content.find(c => c.type === "text")?.text ?? ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    expect(jsonMatch).toBeDefined()

    const parsed = JSON.parse(jsonMatch![0])
    expect(typeof parsed.score).toBe("number")
    expect(typeof parsed.feedback).toBe("string")
  })
})
```

Run tests:
```bash
cd apps/web
pnpm test
```

#### 5.2 Manual Testing Checklist

**Overview Copilot:**
- [ ] Navigate to `/overview`
- [ ] Send message: "Help me improve my headline"
- [ ] Verify streaming response
- [ ] Verify profile context is injected
- [ ] Test markdown link generation ([Proposal Writer](/proposal-writer))

**Proposal Writer:**
- [ ] Navigate to `/proposal-writer`
- [ ] Paste job posting
- [ ] Select tone: professional, casual, confident
- [ ] Select length: short, medium, long
- [ ] Verify proposal quality matches tone/length
- [ ] Test conversation history (ask for revision)

**CV Builder:**
- [ ] Navigate to `/cv-builder`
- [ ] Generate CV from profile
- [ ] Chat: "Make my summary more technical"
- [ ] Verify tool call updates CV state
- [ ] Test multiple revisions in conversation

**Profile Analysis:**
- [ ] Complete onboarding OR edit profile
- [ ] Navigate to `/profile`
- [ ] Click "Analyze Profile"
- [ ] Verify JSON parsing works
- [ ] Verify scores displayed correctly
- [ ] Verify detailed feedback renders markdown

**Onboarding:**
- [ ] Logout and create new account
- [ ] Go through full onboarding flow (8 steps)
- [ ] Test LinkedIn import
- [ ] Test voice recording → transcription (should still use Whisper)
- [ ] Test skill selector hint
- [ ] Test progress persistence (refresh page mid-flow)
- [ ] Verify trigger_profile_analysis calls correctly
- [ ] Verify redirect to analysis page

**Interview Prep (No Changes):**
- [ ] Navigate to `/interview-prep`
- [ ] Start any interview type
- [ ] Verify Realtime API connection works
- [ ] Complete interview
- [ ] Verify analysis uses new Claude agent

---

### Phase 6: Deployment (Day 7)

#### 6.1 Environment Setup

**Vercel Environment Variables:**
1. Go to Vercel dashboard → hiremeplz project → Settings → Environment Variables
2. Add `ANTHROPIC_API_KEY` for both `dev` and `main` branches
3. Verify `OPENAI_API_KEY` is still present (needed for voice features)

**Local Testing:**
```bash
# Ensure .env.local has both keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Test locally
cd apps/web
pnpm dev

# Verify all features work
```

#### 6.2 Staged Rollout

**Step 1: Deploy to Dev Branch**
```bash
git start  # Sync dev with main
# ... make all migration changes
git add .
git commit -m "feat: migrate text agents to Claude SDK (hybrid architecture)

- Migrate 6 agents: onboarding, overview, proposals, CV, analysis
- Keep OpenAI Realtime API for voice interviews
- Keep OpenAI Whisper for transcription
- Add guardrails middleware
- Update tool calling patterns
- Preserve all existing business logic"
git push origin dev
```

**Test on preview deployment:**
- Vercel will auto-deploy to preview URL
- Run full manual testing checklist
- Monitor logs for errors

**Step 2: Monitor Preview for 24-48 Hours**
- Check error logs in Vercel
- Monitor Anthropic API usage dashboard
- Compare response quality vs OpenAI baseline
- Test edge cases

**Step 3: Merge to Main**
```bash
git ship "Migrate to Claude Agents SDK (hybrid architecture)"
```

#### 6.3 Monitoring

**Add Usage Tracking:**
Create `apps/web/src/lib/analytics/ai-usage.ts`:
```typescript
export function trackAIUsage(params: {
  provider: "anthropic" | "openai"
  model: string
  feature: string
  tokensUsed?: number
  latencyMs?: number
  error?: string
}) {
  console.log("[AI Usage]", JSON.stringify(params))
  // TODO: Send to analytics service (PostHog, Mixpanel, etc.)
}
```

**Usage in routes:**
```typescript
const startTime = Date.now()
try {
  const response = await anthropic.messages.create({ ... })
  trackAIUsage({
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    feature: "overview-copilot",
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    latencyMs: Date.now() - startTime,
  })
} catch (error) {
  trackAIUsage({
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    feature: "overview-copilot",
    latencyMs: Date.now() - startTime,
    error: error.message,
  })
  throw error
}
```

**Monitor for 1 Week:**
- Check error rates (should be <1%)
- Compare latency (Claude should be comparable or faster)
- Monitor token usage (calculate cost delta)
- Collect user feedback via feedback form

---

## Rollback Plan

**If migration fails or quality degrades:**

### Quick Rollback (Revert to Main)
```bash
# Revert dev branch to main
git checkout dev
git reset --hard origin/main
git push --force origin dev
```

Vercel will auto-deploy previous working version.

### Partial Rollback (Per-Agent)
Keep Claude for working agents, revert broken ones:

```typescript
// Example: Fallback for onboarding agent
const USE_CLAUDE_ONBOARDING = process.env.FEATURE_FLAG_CLAUDE_ONBOARDING === "true"

if (USE_CLAUDE_ONBOARDING) {
  // Claude implementation
} else {
  // OpenAI implementation (keep old code)
}
```

Set in Vercel env vars:
```bash
FEATURE_FLAG_CLAUDE_ONBOARDING=false  # Disable Claude for onboarding only
```

---

## Success Metrics

### Week 1 Post-Launch
- [ ] Zero critical errors in production
- [ ] Response quality rated ≥4/5 by users (via feedback form)
- [ ] Average latency <3s for all agents
- [ ] Cost per request ≤ OpenAI baseline (track with usage analytics)

### Month 1 Post-Launch
- [ ] User retention unchanged or improved
- [ ] Feature usage (onboarding, proposals, CV) unchanged or increased
- [ ] Customer support tickets related to AI quality: 0-2
- [ ] 20-30% cost savings on text generation (est.)

---

## Cost Analysis

### Before (All OpenAI)
| Feature | Model | Est. Monthly Cost |
|---------|-------|-------------------|
| Onboarding | gpt-5-mini | $40 |
| Overview | gpt-4.1-mini | $30 |
| Proposals | gpt-4.1-mini | $25 |
| CV Chat | gpt-4.1-mini | $20 |
| Analysis | gpt-4.1 | $60 |
| Interviews (voice) | gpt-realtime-mini | $50 |
| Transcription | whisper-1 | $10 |
| **Total** | | **$235/mo** |

### After (Hybrid: Claude + OpenAI Voice)
| Feature | Model | Est. Monthly Cost |
|---------|-------|-------------------|
| Onboarding | claude-sonnet-4-5 | $30 (-25%) |
| Overview | claude-sonnet-4-5 | $22 (-27%) |
| Proposals | claude-sonnet-4-5 | $18 (-28%) |
| CV Chat | claude-sonnet-4-5 | $15 (-25%) |
| Analysis | claude-opus-4-6 | $70 (+17%) |
| Interviews (voice) | gpt-realtime-mini | $50 (no change) |
| Transcription | whisper-1 | $10 (no change) |
| **Total** | | **$215/mo** |

**Estimated Savings:** ~$20/mo (~8.5%)

*Note: Opus is more expensive but provides superior reasoning for analysis. Overall savings from Sonnet migrations offset this.*

---

## Post-Migration Cleanup

### Remove OpenAI Agents SDK Dependency
**After 1 month of stable Claude operation:**

```bash
cd apps/web
pnpm remove @openai/agents
```

**Files to Update:**
- Remove unused OpenAI agent imports
- Keep OpenAI SDK for Realtime + Whisper:
  ```bash
  pnpm add openai  # If not already installed separately
  ```

**Update CLAUDE.md:**
```markdown
## AI Models
- **Text Agents:** Claude Sonnet 4.5 (chat), Claude Opus 4.6 (analysis), Claude Haiku 4.5 (fast responses)
- **Voice Interviews:** OpenAI Realtime API (gpt-realtime-mini)
- **Transcription:** OpenAI Whisper (whisper-1)
```

---

## Appendix

### A. Claude vs OpenAI Feature Comparison

| Feature | OpenAI Agents SDK | Claude Agents SDK | Migration Status |
|---------|-------------------|-------------------|------------------|
| Basic agent creation | ✅ Agent class | ✅ messages.create() | ✅ Equivalent |
| Streaming | ✅ toTextStream() | ✅ messages.stream() | ✅ Equivalent |
| Tool calling | ✅ tool() decorator | ✅ tools array | ✅ Equivalent (different syntax) |
| Multi-turn conversations | ✅ Built-in | ✅ Messages array | ✅ Equivalent |
| Guardrails | ✅ InputGuardrail, OutputGuardrail | ❌ Not built-in | ⚠️ Implement as middleware |
| Structured output | ✅ outputType: ZodSchema | ❌ Not built-in | ⚠️ JSON mode + validation |
| Reasoning control | ✅ modelSettings.reasoning.effort | ❌ Native only | ⚠️ Use Opus for complex tasks |
| Temperature | ✅ modelSettings.temperature | ✅ temperature param | ✅ Equivalent |
| Real-time voice | ✅ Realtime API | ❌ Not available | ❌ Keep OpenAI |
| Speech-to-text | ✅ Whisper | ❌ Not available | ❌ Keep OpenAI |

### B. Reference Links

**Claude Documentation:**
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Streaming Guide](https://platform.claude.com/docs/en/agent-sdk/streaming-output)
- [Tool Use Implementation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use)
- [API Reference](https://platform.claude.com/docs/en/api/reference)

**OpenAI (for voice features):**
- [Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Whisper API Docs](https://platform.openai.com/docs/guides/speech-to-text)

**Project Docs:**
- [Architecture Overview](./architecture-overview.md)
- [Agent Specifications](./agents/)
- [Onboarding Flow](./agents/onboarding-agent-spec.md)

### C. Team Communication

**Announcement Draft (Post-Migration):**
> **Update: Migrated to Claude Agents SDK** 🎉
>
> We've successfully migrated all text-based AI features to Claude's API:
> - Onboarding assistant
> - Overview copilot
> - Proposal writer
> - CV builder
> - Profile analysis
>
> **What changed:**
> - Improved reasoning quality for complex tasks
> - Faster response times for most features
> - ~8% cost reduction on AI spend
>
> **What stayed the same:**
> - Interview prep voice features (still using OpenAI Realtime API)
> - Audio transcription (still using Whisper)
> - All UI/UX — users won't notice any difference
>
> **Monitoring:**
> - Watch for any quality regressions
> - Report issues via feedback form
> - All features have rollback capability

---

## Timeline Summary

| Day | Phase | Tasks | Duration |
|-----|-------|-------|----------|
| 1 AM | Setup | Install SDK, env vars, utilities | 2h |
| 1 PM | Phase 1 | Overview copilot, proposal writer | 4h |
| 2 | Phase 2 | Interview analysis, profile analysis | 6h |
| 3 | Phase 3 | CV builder (5 tools) | 6h |
| 4-5 | Phase 4 | Onboarding agent (8 tools + guardrails) | 12h |
| 6 | Phase 5 | Testing, validation, bug fixes | 6h |
| 7 | Phase 6 | Deploy, monitor, verify | 4h |

**Total Effort:** ~40 hours (~1 week of focused work)

---

**Status Legend:**
- 🟢 Low complexity - straightforward migration
- 🟡 Medium complexity - requires adaptation
- 🔴 High complexity - significant work
- ❌ Not applicable - keep existing implementation
- ⚠️ Requires workaround - no direct equivalent

---

**Next Steps:**
1. Review this plan with team
2. Set up Anthropic API account and get API key
3. Begin Phase 0 (setup) when ready to start
4. Use this doc as implementation checklist

**Questions/Concerns:** Add comments or update this doc as needed during implementation.
