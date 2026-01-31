---
type: spec
title: Authentication & Authorization
status: implemented
updated: 2026-01-31
context_for_agents: >
  JWT-based auth via Supabase. Two Supabase clients: admin (service role,
  bypasses RLS) and user-scoped (anon key + JWT). verifyAuth() extracts
  AuthContext{userId, teamId, role}. ensureUserProfileAndTeam() auto-creates
  team, profile, team_member, preferences on first login. All tables use
  RLS scoped by team_id. No middleware.ts file exists - auth happens in
  API route handlers via verifyAuth().
tags: [architecture, auth, security, implemented]
---

# Authentication & Authorization

## Overview

Authentication is JWT-based via Supabase Auth. Authorization is enforced at two levels:
1. **Application level** - `verifyAuth()` in API routes extracts and validates user context
2. **Database level** - Row-Level Security (RLS) policies on every table scope data to `team_id`

## Auth Flow

```mermaid
sequenceDiagram
  participant U as User
  participant B as Browser
  participant SA as Supabase Auth
  participant API as API Route
  participant DB as Supabase DB

  U->>B: Click "Sign In"
  B->>SA: OAuth / Email login
  SA-->>B: JWT access token + refresh token
  B->>API: POST /api/v1/auth/bootstrap<br>Authorization: Bearer {jwt}
  API->>SA: auth.getUser(token)
  SA-->>API: User object (id, email, metadata)
  API->>DB: Lookup profile (service role, bypasses RLS)
  alt First login
    API->>DB: Create team
    API->>DB: Create team_member (role: leader)
    API->>DB: Create profile
    API->>DB: Create user_preferences (defaults)
  end
  API-->>B: { userId, teamId, role }
  B->>B: Store context, redirect to /overview
```

## Supabase Clients

Two distinct clients exist for different trust levels:

### Admin Client (`getSupabaseAdmin()`)
- **Key:** `SUPABASE_SERVICE_ROLE_KEY`
- **RLS:** Bypassed (full access)
- **Use:** Bootstrap operations, cross-user queries, profile completeness updates
- **Location:** `lib/auth.server.ts:28`
- **Caching:** Singleton - created once per process lifetime

```typescript
// Bypasses RLS - use only in trusted server contexts
const supabaseAdmin = getSupabaseAdmin()
```

### User-Scoped Client (`createUserSupabaseClient(token)`)
- **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` + user's JWT
- **RLS:** Enforced (user sees only their team's data)
- **Use:** User-initiated data operations
- **Location:** `lib/auth.server.ts:45`

```typescript
// RLS-scoped to the user's team
const supabase = createUserSupabaseClient(accessToken)
```

## verifyAuth()

The core auth function called at the top of every authenticated API route.

**Location:** `lib/auth.server.ts:175`

**Returns:** `AuthContext { userId: string, teamId: string, role: "leader" | "member" }`

```mermaid
flowchart TD
  A[Request with Authorization header] --> B{Bearer token present?}
  B -- No --> ERR1[Throw: Missing Authorization]
  B -- Yes --> C[Extract JWT token]
  C --> D[supabase.auth.getUser token]
  D --> E{Valid user?}
  E -- No --> ERR2[Throw: Unauthorized]
  E -- Yes --> F[Lookup profile by user_id<br>using admin client]
  F --> G{Profile exists?}
  G -- Yes --> H[Get team_id from profile]
  G -- No --> I[ensureUserProfileAndTeam]
  I --> H
  H --> J[Lookup team_member<br>by team_id + user_id]
  J --> K{Active membership?}
  K -- Yes --> L[Return AuthContext]
  K -- No --> M[ensureUserProfileAndTeam retry]
  M --> N{Membership now?}
  N -- Yes --> L
  N -- No --> ERR3[Throw: No active team]
```

**Key behavior:**
- Self-healing: If profile or membership is missing, it auto-creates via `ensureUserProfileAndTeam()`
- Service role client used for lookups (bypasses RLS)
- User ID comes from the verified JWT, not from the request body (tamper-proof)

## ensureUserProfileAndTeam()

Auto-bootstrap function for first-time users. Creates the full account structure.

**Location:** `lib/auth.server.ts:67`

**Creates (in order):**
1. **Team** - Named `"{displayName} Team"` (if no existing team membership found)
2. **Team member** - Links user to team with `role: "leader"`, `status: "active"`
3. **Profile** - With email, display_name, `updated_at`
4. **User preferences** - With all defaults (USD, tightness=3, platforms=[upwork, linkedin])

**Idempotent:** Uses `upsert` with `onConflict` for all writes. Safe to call multiple times.

```mermaid
flowchart TD
  A[ensureUserProfileAndTeam<br>userId, email, displayName] --> B[Lookup existing profile]
  B --> C{Has team_id?}
  C -- Yes --> UPSERT
  C -- No --> D[Lookup team_members]
  D --> E{Has active membership?}
  E -- Yes --> F[Use that team_id]
  E -- No --> G[Create new team<br>owner: userId]
  G --> F
  F --> UPSERT[Upsert team_member<br>role: leader, status: active]
  UPSERT --> H[Upsert profile<br>email, display_name]
  H --> I[Upsert user_preferences<br>all defaults]
  I --> J[Return teamId]
```

## Row-Level Security (RLS)

Every table in the `public` schema has RLS enabled. Policies ensure:

| Rule | Effect |
|------|--------|
| All reads scoped by `team_id` | Users can only see their team's data |
| All writes scoped by `team_id` | Users can only modify their team's data |
| Service role bypasses RLS | Server-side admin operations work unrestricted |

**Invariant:** Every authenticated request resolves to a `(userId, teamId, role)` tuple. All subsequent queries use `team_id` for scoping.

## AuthContext Type

```typescript
type AuthContext = {
  userId: string   // Supabase auth user UUID
  teamId: string   // Team UUID (tenant isolation key)
  role: "leader" | "member"  // Team role
}
```

Used throughout the codebase as the standard auth payload. Passed to:
- Database query functions
- Agent context builders
- Profile completeness computation
- All API route handlers

## Security Considerations

1. **No middleware.ts** - Auth validation happens inside each API route handler via `verifyAuth()`. This is intentional - different routes may need different auth strategies in the future.
2. **Server-only imports** - `auth.server.ts` uses `import "server-only"` to prevent accidental client bundling of the service role key.
3. **Cached admin client** - The service role client is a singleton. This is safe because it's stateless (no user context attached).
4. **JWT expiry** - Handled by Supabase Auth client on the browser side. Refresh tokens auto-renew the access token.
5. **No secrets in client** - Only `NEXT_PUBLIC_*` vars reach the browser. Service role key stays server-side.
