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
  See sub-docs for deep dives: auth, api-reference, frontend, infrastructure.
tags: [architecture, technical]
---

# System Architecture

## Sub-documents

- [[architecture/auth]] - Authentication flow, JWT verification, RLS, bootstrap
- [[architecture/api-reference]] - All API routes with request/response shapes
- [[architecture/frontend]] - Design system, component library, hooks, state management
- [[architecture/infrastructure]] - Build system, deployment, env config, trigger.dev

## High-Level System Diagram

```mermaid
graph TB
  subgraph Client ["Browser (React 19)"]
    UI[UI Components<br>shadcn/ui + Framer Motion]
    Redux[Redux Toolkit<br>State Management]
    SupaAuth[Supabase Auth Client]
  end

  subgraph NextJS ["Next.js 16 (Vercel)"]
    Pages[App Router Pages<br>RSC + Client]
    API[API Routes<br>/api/v1/*]
    MW[Middleware<br>Auth + Logging]
  end

  subgraph Services ["External Services"]
    Supabase[(Supabase PostgreSQL<br>+ RLS + pgvector)]
    OpenAI[OpenAI API<br>gpt-4o + Realtime]
    Trigger[trigger.dev<br>Background Jobs]
    BrightData[BrightData<br>Web Scraping]
  end

  UI --> Pages
  UI --> API
  SupaAuth --> Supabase
  Redux --> UI

  MW --> Pages
  MW --> API
  API --> Supabase
  API --> OpenAI
  API --> Trigger
  Trigger --> BrightData
  Trigger --> Supabase
```

## Monorepo Layout

```
hiremeplz-v1/
  apps/
    web/                    # Next.js 16 - frontend + API routes
    docs/                   # This spec (Obsidian vault)
  packages/
    db/                     # Raw Postgres utilities (pg client)
    trigger/                # trigger.dev workflow definitions
    ui/                     # Shared React component library (button, card, code)
    eslint-config/          # Shared ESLint config
    typescript-config/      # Shared TypeScript config
  supabase/
    migrations/             # SQL migration files (3 migrations)
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

## Request Lifecycle

```mermaid
sequenceDiagram
  participant B as Browser
  participant M as Middleware
  participant R as App Router
  participant A as API Route
  participant S as Supabase
  participant AI as OpenAI
  participant T as trigger.dev

  B->>M: HTTP Request + JWT
  M->>M: Validate auth token
  alt Page request
    M->>R: Forward to page
    R->>S: Fetch data (RLS-scoped)
    S-->>R: Data
    R-->>B: RSC/HTML
  else API request
    M->>A: Forward to /api/v1/*
    A->>A: verifyAuth(header)
    A->>S: Query with team_id scope
    opt AI operation
      A->>AI: Agent invocation
      AI-->>A: Structured output / stream
    end
    opt Background job
      A->>T: Dispatch task
      T-->>A: Task ID
    end
    A-->>B: JSON response / SSE stream
  end
```

## Data Flow Overview

```mermaid
flowchart LR
  subgraph Sources ["Data Sources"]
    UP[Upwork]
    LI[LinkedIn]
    CV[CV Upload]
    MAN[Manual Entry]
  end

  subgraph Processing ["Processing Layer"]
    ING[Job Ingestion<br>Pipeline]
    ENR[Profile Enrichment<br>Pipeline]
    RNK[Ranking Agent]
    CL[Cover Letter<br>Agent]
  end

  subgraph Storage ["Supabase"]
    JOBS[(jobs)]
    PROF[(profiles +<br>skills + experiences)]
    RANK[(job_rankings)]
    APP[(applications)]
  end

  subgraph UI ["User Interface"]
    OV[/overview Dashboard/]
    FEED[Job Feed]
    PIPE[Pipeline Tracker]
  end

  UP --> ING
  LI --> ING
  ING --> JOBS
  JOBS --> RNK

  LI --> ENR
  CV --> ENR
  MAN --> ENR
  ENR --> PROF
  PROF --> RNK

  RNK --> RANK
  RANK --> OV
  RANK --> FEED

  FEED --> CL
  CL --> APP
  APP --> PIPE
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
    api/v1/               # See [[architecture/api-reference]]
      auth/bootstrap/     # First-login team/profile creation
      me/                 # Profile CRUD
      onboarding/         # Chat SSE + progress persistence
      interview-prep/     # Token, session, analysis
      teams/              # Team management
      settings/           # Preference endpoints
      health/             # Health check
      jobs/               # [suspended] Job APIs
      test/               # Dev-only test endpoints
  components/             # See [[architecture/frontend]]
    ai/                   # Chain-of-thought, tool call display
    ai-elements/          # Conversation primitives
    onboarding/           # Onboarding-specific UI
    ui/                   # shadcn/ui components (40+)
  lib/
    agents/               # Agent definitions (interview, analysis)
    state/                # Redux store + slices
    auth.server.ts        # See [[architecture/auth]]
    supabaseClient.ts     # Supabase browser client
    profile-completeness.server.ts
    linkedin-scraper.server.ts
  config/
    site.ts               # App metadata
  hooks/                  # See [[architecture/frontend#hooks]]
```

## Conventions

- **Quotes:** Double quotes everywhere
- **Semicolons:** Omitted
- **Exports:** Named exports preferred
- **Components:** Follow shadcn/ui patterns (`cn()` utility, `cva` variants, `data-*` attributes)
- **Server/Client boundary:** Explicit `"use server"` / `"use client"` directives
- **Functions:** Small, pure, well-typed. Avoid over-engineering.
- **File naming:** `kebab-case.ts` for utilities, `kebab-case.tsx` for components
- **Server-only imports:** Use `import "server-only"` to prevent accidental client bundling of secrets
