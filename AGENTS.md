# Agents Guide • hiremeplz.app

## Tech Stack
- Next.js 16 (App Router) and React 19
- TypeScript 5, ESM modules
- pnpm + Turborepo monorepo
- Tailwind CSS v4, shadcn/ui, Radix UI
- Redux Toolkit, TanStack Table
- Supabase JS v2 client
- OpenAI Agents SDK, trigger.dev
- Vitest, ESLint (flat config), Prettier
- Bright Data SDK (playground integration)

## Repository Layout
- App: apps/web (Next.js app)
- Packages: packages/* (db, ui, eslint-config, typescript-config, trigger)
- Infra: supabase/migrations, trigger.config.ts
- Docs: .trae/documents
- Skills: skills/* (best practices and agent skills)

## Access Skills & Best Practices
- React performance and reliability rules: [react-best-practices/SKILL.md](file:///c:/Users/psyhik1769/hiremeplz-v1/skills/react-best-practices/SKILL.md)
- Detailed rule set: [rules](file:///c:/Users/psyhik1769/hiremeplz-v1/skills/react-best-practices/rules/_sections.md)
- Web design guidelines: [web-design-guidelines/SKILL.md](file:///c:/Users/psyhik1769/hiremeplz-v1/skills/web-design-guidelines/SKILL.md)
- Project docs: [.trae/documents](file:///c:/Users/psyhik1769/hiremeplz-v1/.trae/documents)
- Always consult these before coding and follow them strictly.

## Dev Environment Tips
- Jump to a package: pnpm dlx turbo run where <project_name>
- Add a package to the workspace: pnpm install --filter <project_name>
- Create a new React+Vite package: pnpm create vite@latest <project_name> -- --template react-ts
- Confirm the package name in each package's package.json (not the root).
- Next.js app dev: from apps/web run pnpm dev or from repo root pnpm dev.

## Testing & CI
- CI plan: [.github/workflows/ci.yml](file:///c:/Users/psyhik1769/hiremeplz-v1/.github/workflows/ci.yml)
- Run all tests: pnpm turbo run test
- Run tests for one package: pnpm turbo run test --filter <project_name>
- From a package root: pnpm test
- Focus one test: pnpm vitest run -t "<test name>"
- Type checks: pnpm check-types (root) or pnpm check-types (package)
- Lint: pnpm lint (root) or pnpm lint --filter <project_name>
- Ensure the whole suite is green before merging; update/add tests for all changes.

## Lint, Format, Types
- ESLint flat config with Next/Web rules: [apps/web/eslint.config.mjs](file:///c:/Users/psyhik1769/hiremeplz-v1/apps/web/eslint.config.mjs) and [packages/eslint-config/next.js](file:///c:/Users/psyhik1769/hiremeplz-v1/packages/eslint-config/next.js)
- Prettier is used for formatting; run pnpm format to format *.ts, *.tsx, *.md
- TypeScript strict usage; no implicit any; keep accurate types.

## Code Style (Follow Precisely)
- Do not write comments when editing files.
- Semicolons omitted; use double quotes consistently.
- Prefer named exports; avoid default exports.
- Keep functions small, pure, and typed; avoid side effects.
- Follow shadcn/ui patterns: cn util, cva variants, data-* attributes.
- Separate server/client concerns; use server-only when appropriate.
- Use async/await with clear error handling; never log secrets.

## Supabase Docs
- Client: [supabaseClient.ts](file:///c:/Users/psyhik1769/hiremeplz-v1/apps/web/src/lib/supabaseClient.ts). Env vars required in production: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.
- Migrations live in: [supabase/migrations](file:///c:/Users/psyhik1769/hiremeplz-v1/supabase/migrations). Keep schema changes here; do not commit secrets.
- Multi-tenant model keyed by teams.id. Most user content rows carry team_id foreign keys.
- Core relationships:
  - team_members.team_id → teams.id
  - profiles.team_id → teams.id
  - user_cv_files.team_id → teams.id
  - user_profile_snapshots.team_id → teams.id
  - user_skills.team_id → teams.id
  - user_experiences.team_id → teams.id
  - user_educations.team_id → teams.id
  - user_preferences.team_id → teams.id
  - job_sources.team_id → teams.id
  - jobs.team_id → teams.id
  - job_rankings.team_id → teams.id
  - job_rankings.job_id → jobs.id
  - applications.team_id → teams.id
  - applications.job_id → jobs.id
  - cover_letters.team_id → teams.id
  - cover_letters.job_id → jobs.id
  - messages.team_id → teams.id
  - feedback.team_id → teams.id
  - feedback.application_id → applications.id
  - feedback.message_id → messages.id
  - earnings.team_id → teams.id
  - agent_runs.team_id → teams.id
  - agent_run_steps.team_id → teams.id
  - agent_run_steps.agent_run_id → agent_runs.id
  - embeddings.team_id → teams.id
  - team_settings.team_id → teams.id
  - user_agent_settings.team_id → teams.id
  - usage_counters.team_id → teams.id
  - events.team_id → teams.id
  - notifications.team_id → teams.id
  - apply_sessions.team_id → teams.id
  - apply_sessions.job_id → jobs.id
  - apply_sessions.cover_letter_id → cover_letters.id
- Query guidance:
  - Always filter by team_id to enforce tenancy boundaries.
  - Join job_rankings ↔ jobs via job_id; applications ↔ jobs via job_id; feedback ↔ applications/messages via their FKs.
  - For apply_sessions, hydrate job and cover letter via the provided FKs.
  - Respect RLS; implement policies per team membership; never bypass on the client.

## Trigger.dev & Agents
- Trigger config: [trigger.config.ts](file:///c:/Users/psyhik1769/hiremeplz-v1/trigger.config.ts). Use this for background orchestration.
- Playground examples: [playground](file:///c:/Users/psyhik1769/hiremeplz-v1/playground). Review before building new agents.
- When authoring agent code, prefer deterministic, tested steps; keep secrets in environment.

## PR Instructions
- Title format: [<project_name>] <Title>
- Before committing: pnpm lint and pnpm test (root or filtered)
- Include tests for all changes; keep code comment-free; do not commit secrets or keys.

## Quick Commands
- Start web: cd apps/web && pnpm dev
- Build all: pnpm build
- Lint all: pnpm lint
- Type-check all: pnpm check-types
- Test all: pnpm test

## Continue in This Style
- Follow existing file organization, naming, and UI patterns.
- If you improve style, do so slightly and consistently with these rules.
