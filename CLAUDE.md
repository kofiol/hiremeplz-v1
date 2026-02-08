# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

hiremeplz.app is a personal AI agent for finding freelance work. It's a Next.js monorepo focused on onboarding, profile enrichment, and agent-driven opportunity discovery.

**Architecture:** Single-user (one freelancer per account with team context for future expansion)

### Feature Status

**Phase 0 - Foundation (Complete):**
- Authentication (Supabase JWT + Google OAuth) ✅
- Team/profile bootstrap flow ✅
- Onboarding chatbot (conversational AI, voice recording, LinkedIn quick-fill) ✅
- LinkedIn profile scraping (trigger.dev + BrightData) ✅
- Profile completeness scoring ✅
- Profile analysis with extended reasoning ✅
- Interview prep (WebRTC voice, 4 types, post-session AI analysis) ✅
- CV builder (AI generation, chat refinement, save/load) ✅
- Proposal writer (job-specific generation, tone/length controls) ✅
- Email system (React Email + Resend, launch announcements) ✅
- Settings page + user preferences ✅
- Feedback collection (bug/feature/review) ✅
- Landing page + UI component library ✅
- Redux state management ✅

**Phase 1 - Intelligence Layer (In Progress):**
- Overview copilot (basic streaming chat with context injection) ✅ done
- Daily briefing generation from real data 🚀 in progress
- Action items with deep links 🚀 in progress
- Agent activity feed 📋 todo
- Context injection architecture (reusable) 🚀 in progress
- Rate limiting (basic implementation exists) ✅ done
- Job engine restart (fetchers, normalizer, ranking) 📋 todo
- Notification system (in-app + email) 📋 todo
- Agent orchestration (event-driven chaining) 📋 todo

**Suspended:**
- Job scraping (Apify, BrightData job datasets) - resuming soon
- Job matching & ranking logic
- Application pipeline tracking

## Git Workflow

This project uses a **clean two-branch workflow** with custom Git aliases. **Always use these aliases instead of manual Git commands.**

### Branch Structure
- `main` - Production (deployed to hiremeplz.app via Vercel)
- `dev` - Development (where all work happens)

### Custom Git Commands

**Starting work:**
```bash
git start  # Syncs dev with main before starting work
```

**Saving progress:**
```bash
git save  # Quick commit + push with "WIP" message
# OR use regular commits:
git add .
git commit -m "Descriptive message"
git push origin dev
```

**Deploying to production:**
```bash
git ship "Week 3 features: proposals + CV builder"
# Creates PR, merges (squash), syncs everything automatically
```

**Emergency reset:**
```bash
git reset-dev  # Nukes dev and recreates from main
```

**Shortcuts:**
- `git st` - Status
- `git br` - List branches  
- `git visual` - Pretty branch graph
- `git last` - Show last commit

### Important Git Rules

1. **NEVER commit directly to `main`** - Always work on `dev`
2. **NEVER force push** - Use `git ship` workflow instead
3. **Always `git start` before work** - Ensures dev syncs with main
4. **Use `git ship` for deploys** - Maintains clean PR history for rollbacks

### When Helping with Git

- Always suggest the custom aliases (`git start`, `git save`, `git ship`)
- Verify Mark is on `dev` branch before suggesting commits
- For deployment questions → point to `git ship`
- If workflow is broken → suggest `git reset-dev`
- Never suggest force pushing or direct merging to main

## Monorepo Structure

**Turbo + pnpm monorepo** with the following layout:

```
apps/
  web/                 # Main Next.js 16 frontend + backend
  docs/                # Project documentation (Obsidian vault)
packages/
  db/                  # PostgreSQL utilities (pg client)
  trigger/             # trigger.dev workflow definitions
  ui/                  # Shared React component library
  eslint-config/       # Shared ESLint config
  typescript-config/   # Shared TypeScript config
```

Use Turbo filters to run tasks on specific packages: `pnpm turbo run <task> --filter <package_name>`

## Tech Stack

- **Frontend & Backend:** Next.js 16 (App Router), React 19, TypeScript
- **UI & Styling:** Tailwind CSS 4, shadcn/ui, Radix UI, Framer Motion
- **State Management:** Redux Toolkit, TanStack Table
- **Database:** Supabase PostgreSQL
- **API Client:** Supabase JS SDK
- **AI & Agents:** OpenAI Agents SDK (gpt-4.1-mini for chat, gpt-4.1 for analysis, gpt-realtime-mini for voice)
- **Workflows:** trigger.dev (background jobs)
- **Web Scraping:** Bright Data (active - LinkedIn), Apify/Crawlee/Playwright (suspended - job scraping)
- **Email:** React Email + Resend
- **Testing:** Vitest (db package), Prettier, ESLint (flat config)
- **Package Manager:** pnpm 10.26.0 | **Node:** >=18

## Common Commands

**Development:**
```bash
pnpm dev                      # Start all dev servers (uses Turbo TUI)
cd apps/web && pnpm dev       # Start web app only (port 3000)
```

**Building & Type Checking:**
```bash
pnpm build                    # Build all workspaces
pnpm check-types              # Type-check entire monorepo
pnpm lint                     # Lint all files (ESLint flat config)
pnpm format                   # Format with Prettier (ts, tsx, md)
```

**Testing:**
```bash
pnpm test                     # Run all tests (Vitest)
pnpm turbo run test --filter db    # Run db package tests only
```

**Package-Specific Tasks:**
```bash
pnpm turbo run <task> --filter <package_name>
```

## Code Architecture

### Web App (`apps/web`)

**Directory structure:**
- `src/app/` - Next.js pages and API routes (App Router)
  - `api/v1/` - Backend API endpoints
  - Page components and layouts
- `src/components/` - React components (mostly client-side with shadcn/ui patterns)
- `src/lib/`
  - `auth.server.ts` - JWT/session-based authentication (server-side utilities)
  - `supabaseClient.ts` - Supabase JS client
  - `state/` - Redux store and slices
  - `utils.ts` - Helper functions (cn, date utils, etc.)
- `src/config/` - App configuration
- `src/hooks/` - Custom React hooks
- `src/middleware.ts` - Next.js middleware (auth, request logging)

**Key API Routes:**
- `api/v1/auth/bootstrap` - Initial auth setup (creates team + profile)
- `api/v1/me` - User profile + metadata
- `api/v1/onboarding/` - Onboarding flow (chat, progress, transcribe, save)
- `api/v1/overview/chat` - Overview copilot (streaming, OpenAI Agents)
- `api/v1/interview-prep/` - Interview sessions, analysis, history, Realtime API tokens
- `api/v1/cv-builder/` - Generate, chat, save, load CV data
- `api/v1/proposals/generate` - Proposal generation from job postings
- `api/v1/profile/analysis` - AI profile scoring
- `api/v1/feedback` - User feedback submission
- `api/v1/teams/` - Team management
- `api/v1/settings/` - User settings
- `api/v1/health` - Health check

**Authentication:** JWT-based via Supabase. Server-side verification using `lib/auth.server.ts`.

### Database (`packages/db`)

Raw PostgreSQL utilities using `pg` client. Contains:
- `src/fetch-profile.ts` - Database query functions
- Integration and unit tests (Vitest)

Access Supabase TypeScript types via `mcp__supabase__generate_typescript_types`.

### Workflows (`packages/trigger`)

Contains trigger.dev job definitions for background work (scraping, notifications, etc.).

## Code Style & Best Practices

- **Quotes:** Double quotes; **Semicolons:** Omitted
- **Exports:** Named exports preferred
- **Component patterns:** Follow shadcn/ui patterns (`cn` utility, `cva` variants, `data-*` attributes)
- **Server/Client:** Use "use server" and "use client" directives; never log secrets
- **Function design:** Small, pure, well-typed functions
- Consult `skills/react-best-practices` and `skills/web-design-guidelines` before major React changes

## Environment Setup

Copy `.env.example` to `.env.local` and configure:
- **Supabase:** `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **OpenAI:** `OPENAI_API_KEY`
- **trigger.dev:** `TRIGGER_API_KEY`, `TRIGGER_SECRET_KEY`
- **Bright Data:** `BRIGHTDATA_API_KEY`, dataset IDs
- **Database:** `DATABASE_URL` (PostgreSQL connection string)

For local development: Supabase runs on `http://localhost:54321`.

### Deployment Configuration

**Vercel:**
- `main` branch → Production (`hiremeplz.app`)
- `dev` branch → Preview deployments
- Environment variables set per branch

**Supabase:**
- Single project for both dev and prod
- Multiple auth redirect URLs configured:
  - `http://localhost:3000/auth/callback`
  - `https://hiremeplz.app/auth/callback`
  - Vercel preview URLs

## Abandoned Features

**Do NOT include these in context injections or code reviews:**

- Job scraping (Apify, BrightData job datasets) - `/apps/web/src/app/api/v1/jobs/`
- Job matching logic - related playground code
- These will be resumed soon, but are currently suspended

See `/apps/web/src/app/api/v1/jobs/README.md` and `/playground/README.md` for details.

## Before Committing

Run these checks:
```bash
pnpm lint
pnpm check-types
pnpm test
```

Add or update tests for any code changes. PR title format: `[<project_name>] <Title>`

**Then deploy:**
```bash
git ship "Description of changes"
```

### Rules

After completing a task that involves tool use, provide a quick summary of the work you've done

By default, implement changes rather than only suggesting them. If the user's intent is unclear, infer the most useful likely action and proceed, using tools to discover any missing details instead of guessing. Try to infer the user's intent about whether a tool call (e.g. file edit or read) is intended or not, and act accordingly.

If you intend to call multiple tools and there are no dependencies between the tool calls, make all of the independent tool calls in parallel. Prioritize calling tools simultaneously whenever the actions can be done in parallel rather than sequentially. For example, when reading 3 files, run 3 tool calls in parallel to read all 3 files into context at the same time. Maximize use of parallel tool calls where possible to increase speed and efficiency.

However, if some tool calls depend on previous calls to inform dependent values like the parameters, do not call these tools in parallel and instead call them sequentially. Never use placeholders or guess missing parameters in tool calls.

Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers. If the user asks you to use web search to retrieve information, always do so before providing any answers.

When an LLM is needed, please default to ChatGPT 4.1 mini, unless the user requests otherwise. The exact model string for ChatGPT 4.1 mini is gpt-4.1-mini.

Please write high-quality, general-purpose solutions using the standard tools available. Do not create helper scripts or workarounds to accomplish tasks more efficiently. Implement solutions that work correctly for all valid inputs, not just the test cases. Do not hard-code values or create solutions that only work for specific test inputs. Instead, implement the actual logic that solves the problems generally.

Focus on understanding the problem requirements and implementing the correct algorithm. Tests are there to verify correctness, not to define the solution. Provide a principled implementation that follows best practices and software design principles.

If the task is unreasonable or infeasible, or if any of the tests are incorrect, please inform me rather than working around them. The solution should be robust, maintainable, and extendable.

When I specify an architecture or SDK to use (e.g., 'use a handoff agent', 'use OpenAI Agents SDK'), implement EXACTLY that pattern. Do not substitute with a simpler alternative. If unclear, ask for clarification before coding.
After implementing a feature, re-read the original request and verify every stated requirement is addressed before reporting completion. Create a mental checklist of all explicit requirements.