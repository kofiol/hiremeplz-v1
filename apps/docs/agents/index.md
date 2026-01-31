---
type: spec
title: Agent System
status: in-progress
updated: 2026-01-31
context_for_agents: >
  All agents use OpenAI Agents SDK with gpt-4o. Agents are stateless
  per-invocation but persist state via agent_runs, agent_run_steps, and
  user_agent_settings tables. Every agent run is audited. Agents follow
  a "draft, don't send" philosophy for irreversible actions. The system
  uses structured outputs (Zod schemas) for all agent responses.
tags: [agents, ai, core]
---

# Agent System

hireMePlz is an **agent-first** application. The core value comes from AI agents that act autonomously on behalf of the freelancer. The UI exists primarily as a review/approval surface and a way to tune agent behavior.

## Philosophy

1. **Agents act, humans approve.** Agents should do the maximum amount of work possible without requiring user input. But irreversible actions (sending a proposal, accepting a contract) always require explicit approval.

2. **Every run is audited.** Every agent invocation creates an `agent_runs` record with inputs, outputs, status, and timing. Steps within a run are tracked in `agent_run_steps`. This enables debugging, billing, and trust-building with users.

3. **Structured outputs.** Agents return data conforming to Zod schemas, not free-form text. This makes downstream processing reliable and testable.

4. **Progressive context.** Agents receive only the context they need. Profile data, preferences, and relevant history are injected at invocation time, not stored in the agent's system prompt.

5. **Fail gracefully.** If an agent fails, the run is marked `failed` with `error_text`. The system notifies the user and can retry with backoff. No silent failures.

## SDK & Runtime

- **Framework:** OpenAI Agents SDK (`@openai/agents` v0.4.4)
- **Default model:** `gpt-4o`
- **Streaming:** SSE for real-time responses (onboarding, copilot)
- **Extended reasoning:** Used for profile analysis and complex scoring
- **Realtime API:** Used for voice interview practice
- **Background execution:** trigger.dev for long-running tasks (scraping, batch scoring)

## Agent Types

| Agent | Status | Trigger | Purpose |
|-------|--------|---------|---------|
| [[onboarding-agent]] | Implemented | User starts onboarding | Collect profile data conversationally |
| [[job-search-agent]] | Planned | Scheduled / manual | Monitor sources, ingest jobs |
| [[ranking-agent]] | Planned | After job ingestion | Score jobs against user profile |
| [[cover-letter-agent]] | Planned | User requests / auto-draft | Generate tailored proposals |
| [[interview-prep-agent]] | Implemented | User starts session | Real-time voice interview practice |
| [[overview-copilot]] | In Progress | User opens /overview | Daily briefings, nudges, insights |

## Shared Patterns

### Context Injection

Every agent receives a context object at invocation:

```typescript
interface AgentContext {
  user: {
    id: string
    displayName: string
    headline: string
    about: string
    experienceLevel: string
    location: string
  }
  skills: Array<{ name: string; level: number; years: number }>
  experiences: Array<{ title: string; company: string; highlights: string }>
  preferences: {
    platforms: string[]
    currency: string
    hourlyRange: [number, number]
    tightness: number
    projectTypes: string[]
  }
  // Agent-specific additions below
}
```

### Tool Pattern

Agents declare tools as functions with Zod input schemas:

```typescript
const myTool = {
  name: "tool_name",
  description: "What this tool does",
  parameters: z.object({ /* ... */ }),
  execute: async (input, context) => { /* ... */ }
}
```

Tools that modify state (database writes, external API calls) must log their execution in `agent_run_steps`.

### Run Lifecycle

```
1. Create agent_runs record (status: queued)
2. Build context (load profile, preferences, history)
3. Execute agent (status: running)
4. Stream response / collect structured output
5. Persist results (status: succeeded | failed)
6. Trigger downstream agents if applicable
```

### Agent Chaining

Agents can trigger other agents. The primary chains:

```
job-search-agent
  -> ranking-agent (score new jobs)
    -> overview-copilot (surface top matches)
      -> cover-letter-agent (draft for approved jobs)

onboarding-agent
  -> profile-parser (LinkedIn scrape)
    -> ranking-agent (initial job scoring with new profile)
```

## Observability

All agent activity is queryable via:
- `agent_runs` - High-level: what ran, when, success/failure
- `agent_run_steps` - Granular: each tool call, each reasoning step
- `usage_counters` - Daily aggregates for billing and rate limiting
- `events` - Audit log for significant state changes

## Future: Multi-Agent Orchestration

As the agent count grows, the system will need an orchestration layer:
- **Scheduler** - Cron-based triggers for periodic agents (job search every N hours)
- **Event bus** - Agents publish events, other agents subscribe (e.g., "new_jobs_ingested" triggers ranking)
- **Priority queue** - Rate-limit API calls across agents
- **Agent memory** - Cross-run context via embeddings (e.g., "user rejected jobs like X before")
