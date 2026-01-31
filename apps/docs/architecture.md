---
type: spec
title: System Architecture
status: implemented
updated: 2026-01-31
context_for_agents: >
  Turbo+pnpm monorepo. apps/web is Next.js 16 (App Router). Database is
  Supabase Postgres with RLS. AI agents use OpenAI Agents SDK. Background
  jobs run on trigger.dev. State management via Redux Toolkit. UI is
  shadcn/ui + Tailwind CSS 4 + Framer Motion. Auth is JWT via Supabase.
tags: [architecture, technical]
---

# System Architecture

## Monorepo Layout

```
hiremeplz-v1/
  apps/
    web/                    # Next.js 16 - frontend + API routes
    docs/                   # This spec (Obsidian vault)
  packages/
    db/                     # Raw Postgres utilities (pg client)
    trigger/                # trigger.dev workflow definitions
    ui/                     # Shared React component library
    eslint-config/          # Shared ESLint config
    typescript-config/      # Shared TypeScript config
  supabase/
    migrations/             # SQL migration files
```

**Build system:** Turborepo with pnpm 10.x workspaces.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16, React 19, TypeScript | App Router, RSC where possible |
| Styling | Tailwind CSS 4, shadcn/ui, Radix UI | Glass morphism design language |
| Animation | Framer Motion | Conversation UI, transitions |
| State | Redux Toolkit | Onboarding slice, future: pipeline slice |
| Tables | TanStack Table | Job listings, application tracking |
| Database | Supabase PostgreSQL | RLS enabled on all tables |
| Auth | Supabase Auth (JWT) | Server-side verification via `lib/auth.server.ts` |
| AI Agents | OpenAI Agents SDK (`@openai/agents`) | gpt-4o, structured outputs, streaming |
| AI Realtime | OpenAI Realtime API | Voice interview practice |
| Background Jobs | trigger.dev | LinkedIn scraping, future: scheduled monitors |
| Scraping | BrightData datasets, Apify | LinkedIn profiles, job listings |
| Embeddings | pgvector extension | Prepared, not yet active |
| Hosting | Vercel (web), Supabase (db) | Edge functions for future use |

## Request Flow

```
Browser
  |
  v
Next.js Middleware (auth check, request logging)
  |
  v
App Router
  ├── Pages (RSC + Client components)
  └── API Routes (api/v1/*)
        |
        ├── Supabase SDK (reads/writes)
        ├── OpenAI Agents SDK (AI operations)
        └── trigger.dev SDK (async job dispatch)
              |
              v
          trigger.dev Worker
              |
              v
          BrightData / Apify (external scraping)
```

## Key Directories (apps/web)

```
src/
  app/
    (marketing)/          # Landing page, public routes
    (app)/                # Authenticated app shell
      overview/           # Main dashboard (agent hub)
      interview-practice/ # Voice interview prep
      settings/           # User preferences
    api/v1/
      auth/               # Bootstrap, session management
      me/                 # Profile CRUD
      onboarding/         # Chat-based onboarding
      teams/              # Team management
      settings/           # Preference endpoints
      jobs/               # [suspended] Job scraping APIs
  components/
    ai/                   # Chain-of-thought, tool call display
    ai-elements/          # Conversation primitives
    onboarding/           # Onboarding-specific UI
    ui/                   # shadcn/ui components (30+)
  lib/
    agents/               # Agent definitions (interview, analysis)
    state/                # Redux store + slices
    auth.server.ts        # JWT verification
    supabaseClient.ts     # Supabase browser client
    profile-completeness.server.ts
  config/
    site.ts               # App metadata
  hooks/                  # Custom React hooks
  middleware.ts           # Auth + logging middleware
```

## Authentication

JWT-based via Supabase Auth. Flow:

1. User logs in via Supabase Auth UI
2. `api/v1/auth/bootstrap` creates team, profile, preferences, team_member records
3. Middleware validates JWT on every authenticated request
4. Server utilities in `lib/auth.server.ts` extract user/team context

**Invariant:** Every authenticated request has a `user_id` and `team_id`. All data queries are scoped to `team_id` (RLS enforced at DB level).

## Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase admin access |
| `SUPABASE_JWT_SECRET` | Server | JWT verification |
| `OPENAI_API_KEY` | Server | AI agent operations |
| `TRIGGER_SECRET_KEY` | Server | trigger.dev authentication |
| `BRIGHTDATA_API_KEY` | Server | LinkedIn scraping |
| `DATABASE_URL` | Server | Direct Postgres connection |
| `NEXT_PUBLIC_APP_URL` | Public | Canonical app URL |

## Conventions

- **Quotes:** Double quotes everywhere
- **Semicolons:** Omitted
- **Exports:** Named exports preferred
- **Components:** Follow shadcn/ui patterns (`cn()` utility, `cva` variants, `data-*` attributes)
- **Server/Client boundary:** Explicit `"use server"` / `"use client"` directives
- **Functions:** Small, pure, well-typed. Avoid over-engineering.
