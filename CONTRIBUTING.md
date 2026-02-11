# Contributing to hiremeplz.app

## Branch Strategy

```
main ← (PR) ← dev ← (PR) ← feature/*
```

| Branch | Purpose | Deploys To |
|---|---|---|
| `main` | Production — protected, merge via PR only | hiremeplz.app (Vercel auto-deploy) |
| `dev` | Integration — all feature branches merge here | Vercel preview |
| `feature/*` | Individual work — one branch per task | Local only |

### Rules

1. **Never push directly to `main`.** All production changes go through a PR from `dev` → `main`, approved by Mark.
2. **Never push directly to `dev`.** Create a feature branch, open a PR into `dev`.
3. **Never force push.** If you need to fix history, ask first.
4. **One feature per branch.** Keep branches focused and short-lived.

## Workflow

### Starting Work

```bash
# Make sure you're up to date
git checkout dev
git pull origin dev

# Create a feature branch
git checkout -b feature/your-feature-name
```

### While Working

Commit often with clear messages:

```bash
git add <files>
git commit -m "feat(jobs): add BrightData job fetcher"
```

**Commit message format:** `type(scope): description`

| Type | When |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behavior change) |
| `docs` | Documentation only |
| `chore` | Config, deps, tooling |
| `test` | Adding or updating tests |

### Opening a PR

```bash
# Push your branch
git push -u origin feature/your-feature-name

# Create PR into dev (not main!)
gh pr create --base dev --title "feat(jobs): add BrightData job fetcher" --body "..."
```

**PR requirements:**
- Target branch is `dev` (never `main` directly)
- Title follows commit message format
- Description explains what and why
- All checks pass (`pnpm lint && pnpm check-types && pnpm test`)

### Deploying to Production

Only Mark ships to production:

```bash
# From dev branch, after all features are merged and tested
git ship "Description of what's shipping"
```

This creates a PR from `dev` → `main`, squash-merges, and syncs everything.

## Before Committing

Always run:

```bash
pnpm lint          # ESLint
pnpm check-types   # TypeScript
pnpm test          # Vitest
```

Fix any issues before pushing. CI will catch them anyway, but it's faster to catch locally.

## Code Style

- **Quotes:** Double quotes (`"`)
- **Semicolons:** None
- **Exports:** Named exports preferred over default
- **Components:** Follow shadcn/ui patterns — `cn()` utility, `cva` variants
- **Server files:** `.server.ts` suffix (e.g., `auth.server.ts`)
- **API routes:** Under `/api/v1/`
- **AI models:** Default to `gpt-4.1-mini` unless the task requires heavier reasoning

### Do

- Write small, pure, well-typed functions
- Use `"use server"` / `"use client"` directives appropriately
- Keep components focused — one responsibility per file
- Add types, not `any`

### Don't

- Log secrets or API keys
- Add comments that restate the code
- Over-engineer — solve the current problem, not hypothetical future ones
- Commit `.env.local` or any credential files

## Project Structure Quick Reference

```
apps/web/src/
  app/             # Pages + API routes (App Router)
    api/v1/        # All backend endpoints
  components/      # React components
  lib/             # Utilities, auth, state, agents
  hooks/           # Custom React hooks
  config/          # App configuration
  middleware.ts    # Auth + request logging
```

Key files:
- `lib/auth.server.ts` — JWT verification, Supabase admin client
- `lib/supabaseClient.ts` — Browser Supabase client
- `lib/state/` — Redux store + slices
- `lib/agents/` — AI agent definitions

## Using Claude Code

If you're contributing via Claude Code, it will automatically pick up `CLAUDE.md` for project context. The same rules apply — feature branches, PRs into `dev`, all checks passing.
