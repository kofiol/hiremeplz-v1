---
type: spec
title: API Reference
status: implemented
updated: 2026-01-31
context_for_agents: >
  All API routes live under /api/v1/. Every authenticated route calls
  verifyAuth() to get AuthContext. Responses are JSON except onboarding/chat
  which streams SSE. Routes: auth/bootstrap, me, onboarding (chat, progress),
  interview-prep (token, session, analyze, [sessionId]), teams, settings,
  health. Jobs routes exist but are suspended.
tags: [architecture, api, reference]
---

# API Reference

All routes are under `/api/v1/`. Authentication is via `Authorization: Bearer {jwt}` header. Every authenticated route calls `verifyAuth()` to extract `AuthContext`.

## Route Map

```mermaid
graph LR
  subgraph Public
    HEALTH[GET /health]
  end

  subgraph Auth
    BOOT[POST /auth/bootstrap]
  end

  subgraph Profile
    ME[GET/PUT /me]
    TEAMS[GET /teams]
    SETTINGS[GET/PUT /settings]
  end

  subgraph Onboarding
    CHAT[POST /onboarding/chat<br>SSE Stream]
    OB[GET/POST /onboarding]
    PROG[GET/POST /onboarding/progress]
  end

  subgraph Interview
    TOKEN[POST /interview-prep/token]
    SESS[POST /interview-prep/session]
    ANALYZE[POST /interview-prep/analyze]
    SESSID[GET /interview-prep/:sessionId]
  end

  subgraph Suspended
    JOBS[/api/v1/jobs/*<br>SUSPENDED]
  end
```

## Routes

### POST /api/v1/auth/bootstrap

First call after login. Creates team/profile/preferences if missing.

**Auth:** Required
**File:** `app/api/v1/auth/bootstrap/route.ts`

**Response:**
```typescript
{
  userId: string
  teamId: string
  role: "leader" | "member"
}
```

**Side effects:** Creates `teams`, `team_members`, `profiles`, `user_preferences` records via `ensureUserProfileAndTeam()`. See [[architecture/auth]].

---

### GET /api/v1/me

Fetch the authenticated user's full profile with related data.

**Auth:** Required
**File:** `app/api/v1/me/route.ts`

**Response:** Profile object with skills, experiences, education, preferences, completeness score.

---

### PUT /api/v1/me

Update profile fields.

**Auth:** Required

**Body:** Partial profile fields (display_name, headline, about, timezone, etc.)

---

### GET /api/v1/teams

Fetch the user's team and members.

**Auth:** Required
**File:** `app/api/v1/teams/route.ts`

---

### GET /api/v1/settings

Fetch user preferences (platforms, rates, tightness, project types).

**Auth:** Required
**File:** `app/api/v1/settings/route.ts`

### PUT /api/v1/settings

Update user preferences.

**Auth:** Required

**Body:** Partial preferences (platforms, currency, hourly_min/max, tightness, etc.)

---

### POST /api/v1/onboarding/chat

The main onboarding conversation endpoint. **Streams SSE** (Server-Sent Events).

**Auth:** Required
**File:** `app/api/v1/onboarding/chat/route.ts`

**Body:**
```typescript
{
  message: string            // User's message
  conversationHistory: Array<{
    role: "user" | "assistant"
    content: string
  }>
}
```

**Response:** SSE stream with events:
- `delta` - Text chunk from agent
- `tool_call` - Agent tool invocation (update_collected_data, linkedin_scrape)
- `tool_result` - Tool execution result
- `reasoning` - Extended reasoning chunk (profile analysis)
- `done` - Stream complete

**Agent tools available:**
- `update_collected_data` - Write profile data to DB
- `linkedin_scrape` - Trigger LinkedIn profile scraping

---

### GET /api/v1/onboarding

Fetch current onboarding state.

**Auth:** Required
**File:** `app/api/v1/onboarding/route.ts`

### POST /api/v1/onboarding

Update onboarding state (mark complete, etc.)

---

### GET /api/v1/onboarding/progress

Fetch persisted conversation progress from `user_agent_settings`.

**Auth:** Required
**File:** `app/api/v1/onboarding/progress/route.ts`

### POST /api/v1/onboarding/progress

Save conversation progress (message history, current step, collected data).

**Stored in:** `user_agent_settings` where `agent_type = 'profile_parser'`, field `settings_json.onboardingProgress`

---

### POST /api/v1/interview-prep/token

Generate an ephemeral OpenAI Realtime API token for voice interview.

**Auth:** Required
**File:** `app/api/v1/interview-prep/token/route.ts`

**Response:**
```typescript
{
  token: string       // Ephemeral Realtime API token
  expiresAt: string   // Token expiry timestamp
}
```

---

### POST /api/v1/interview-prep/session

Create a new interview session record.

**Auth:** Required
**File:** `app/api/v1/interview-prep/session/route.ts`

**Body:**
```typescript
{
  interviewType: "client_discovery" | "technical" | "rate_negotiation" | "behavioral"
}
```

**Response:**
```typescript
{
  sessionId: string
  status: "pending"
}
```

**Side effects:** Creates `interview_sessions` record and `agent_runs` record (type: `interview_prep`).

---

### POST /api/v1/interview-prep/analyze

Trigger post-session analysis on a completed interview.

**Auth:** Required
**File:** `app/api/v1/interview-prep/analyze/route.ts`

**Body:**
```typescript
{
  sessionId: string
  transcript: Array<{ role: string; content: string; timestamp?: string }>
}
```

**Response:** Analysis object with scores, strengths, improvements, key moments.

---

### GET /api/v1/interview-prep/:sessionId

Fetch a specific interview session with transcript, metrics, and analysis.

**Auth:** Required
**File:** `app/api/v1/interview-prep/[sessionId]/route.ts`

---

### GET /api/v1/health

Unauthenticated health check.

**Auth:** None
**File:** `app/api/v1/health/route.ts`

---

### POST /api/v1/test/linkedin-scraper

Dev-only endpoint for testing LinkedIn scraping.

**Auth:** Required
**File:** `app/api/v1/test/linkedin-scraper/route.ts`

---

### /api/v1/jobs/* (SUSPENDED)

Job scraping and matching APIs. Routes exist but are empty/non-functional. See [[roadmap#Phase 1]].

## Error Handling

All API routes follow this pattern:

```typescript
try {
  const auth = await verifyAuth(request.headers.get("authorization"))
  // ... route logic
  return Response.json(data)
} catch (error) {
  if (error.message === "Unauthorized") {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  return Response.json({ error: "Internal Server Error" }, { status: 500 })
}
```

## SSE Streaming Pattern

Used by the onboarding chat route:

```typescript
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder()
    const send = (event: string, data: object) => {
      controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
    }
    // ... agent execution with streaming callbacks
    send("done", {})
    controller.close()
  }
})

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  }
})
```
