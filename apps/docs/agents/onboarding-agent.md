---
type: spec
title: Onboarding Agent
status: implemented
updated: 2026-01-31
context_for_agents: >
  Conversational agent that collects freelancer profile data via chat.
  Uses gpt-4o with streaming SSE. Has two tools: update_collected_data
  (writes to DB) and linkedin_scrape (triggers BrightData via trigger.dev).
  Ends with a profile analysis using extended reasoning that scores the
  profile across 4 dimensions. State persisted in user_agent_settings.
tags: [agents, onboarding, implemented]
---

# Onboarding Agent

The first agent every user interacts with. Guides the freelancer through profile setup via a natural conversation, then analyzes their competitive positioning.

## Purpose

Collect the minimum viable profile to enable job matching:
- Identity (name, headline, location)
- Skills with proficiency levels
- Work experience
- Education
- Rate expectations (current + target)
- Platform preferences
- Engagement type preferences

## Implementation

**Route:** `api/v1/onboarding/chat`
**Agent file:** Uses OpenAI Agents SDK inline in the route handler
**Model:** gpt-4o with streaming
**UI:** `components/onboarding-chatbot.tsx` (~1350 lines)

### Tools

#### update_collected_data
Persists profile fields to the database as the conversation progresses. Called incrementally - doesn't wait for the end of the conversation.

**Writes to:** `profiles`, `user_skills`, `user_experiences`, `user_educations`, `user_preferences`

#### linkedin_scrape
Dispatches a trigger.dev task to scrape a LinkedIn profile via BrightData.

**Flow:**
1. User provides LinkedIn URL
2. Agent calls `linkedin_scrape` tool
3. trigger.dev worker hits BrightData dataset API
4. Polls for completion (max 5 min, 5s intervals)
5. Returns distilled profile: skills, experiences, education, headline, level inference
6. Agent merges scraped data with `update_collected_data`

**UI feedback:** Live elapsed-time indicator while scraping runs.

### Conversation Flow

```
1. Welcome + team mode (solo/team)
2. Profile path (LinkedIn import / manual)
3. [If LinkedIn] Scrape and confirm extracted data
4. Name + experience level
5. Skills with proficiency
6. Work history
7. Education
8. Current hourly rate
9. Target/dream hourly rate
10. Engagement types (full-time, part-time, both)
11. Platform preferences
12. Profile analysis (extended reasoning)
```

### Profile Analysis

At conversation end, a separate analysis pass runs with extended reasoning:

**Output schema:**
```typescript
{
  overallScore: number          // 0-100
  categories: {
    skillsBreadth: number       // 0-100
    experienceQuality: number   // 0-100
    ratePositioning: number     // 0-100
    marketReadiness: number     // 0-100
  }
  strengths: string[]           // Top 3
  improvements: string[]        // Top 3
  detailedFeedback: string      // Markdown
}
```

The chain-of-thought reasoning is streamed to the UI in a collapsible panel (`components/ai/chain-of-thought.tsx`).

### State Persistence

Conversation state is saved to `user_agent_settings` (agent_type: `profile_parser`) as JSON in `settings_json.onboardingProgress`. This enables:
- Resume after browser close
- Message editing and conversation replay
- Progress tracking across sessions

### Quick Replies

Context-aware suggestion chips appear based on conversation state:
- "Solo" / "Team" (team mode step)
- "Import from LinkedIn" / "Enter manually" (profile path)
- Rate range suggestions based on experience level
- Platform toggles

## Invariants

- Profile completeness score is recomputed after every `update_collected_data` call
- Users with completeness < 80% are redirected to onboarding from `/overview`
- LinkedIn scrape results are stored as `user_profile_snapshots` for audit
- The agent never fabricates profile data - it only structures what the user provides
