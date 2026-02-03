# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

hiremeplz.app is a personal AI agent for finding freelance work. It's a Next.js monorepo focused on onboarding, profile enrichment, and agent-driven opportunity discovery.

**Current Focus:**
- `/overview` agent development (context injection, tool usage, reasoning) 🚀
- Onboarding UX improvements 🚀
- LinkedIn profile scraping (fully working) ✅

**Architecture:** Single-user (one freelancer per account with team context for future expansion)

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
- **AI & Agents:** OpenAI Agents SDK
- **Workflows:** trigger.dev (background jobs)
- **Web Scraping:** Apify, Crawlee, Playwright, Bright Data
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
- `api/v1/auth/bootstrap` - Initial auth setup
- `api/v1/me` - User profile
- `api/v1/onboarding/` - Onboarding flow endpoints
- `api/v1/teams/` - Team management
- `api/v1/settings/` - User settings

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

FULL DOCS AVAILABLE AT APPS/DOCS - CONSULT CAREFULLY BEFORE CHANGES ALONGSIDE SKILLS/