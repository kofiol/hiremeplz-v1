# hiremeplz.app

Your personal AI agent for finding freelance work. Monitors job platforms, ranks opportunities with AI, and helps you apply faster.

**Live:** [hiremeplz.app](https://hiremeplz.app)

## What It Does

- **Onboarding** — Conversational AI that builds your freelancer profile through chat + voice + LinkedIn import
- **Job Search Engine** — Monitors LinkedIn and Upwork, normalizes listings, ranks them by fit using AI
- **Interview Prep** — Real-time voice practice with AI interviewers (4 session types, post-session analysis)
- **CV Builder** — AI-generated CVs with chat-based refinement
- **Proposal Writer** — Job-specific proposals with tone/length controls
- **Overview Copilot** — Dashboard AI assistant with context injection

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Radix UI, Framer Motion |
| Database | Supabase PostgreSQL |
| AI | OpenAI Agents SDK (gpt-4.1-mini chat, gpt-4.1 analysis, Realtime API voice) |
| Background Jobs | trigger.dev |
| Scraping | Bright Data (LinkedIn, Upwork) |
| Email | React Email + Resend |
| State | Redux Toolkit |
| Deployment | Vercel (auto-deploy from `main`) |

## Monorepo Structure

```
apps/
  web/           # Next.js frontend + API routes
  docs/          # Architecture docs (Obsidian vault)
packages/
  db/            # PostgreSQL utilities
  trigger/       # trigger.dev task definitions
  ui/            # Shared component library
  eslint-config/ # Shared ESLint config
  typescript-config/ # Shared TS config
playground/      # Experiments and prototypes (not production)
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm 10.26.0
- Supabase project (or local via `supabase start`)

### Setup

```bash
# Clone and install
git clone https://github.com/kofiol/hiremeplz.git
cd hiremeplz
pnpm install

# Configure environment
cp apps/web/.env.example apps/web/.env.local
# Fill in: Supabase URL/keys, OpenAI key, BrightData key, Resend key

# Run dev server
pnpm dev           # All workspaces (Turbo TUI)
# OR
cd apps/web && pnpm dev   # Web app only (port 3000)
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `SUPABASE_JWT_SECRET` | Yes | JWT verification secret |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `BRIGHTDATA_API_KEY` | No | Bright Data API key (for scraping features) |
| `TRIGGER_SECRET_KEY` | No | trigger.dev secret key (for background jobs) |
| `RESEND_API_KEY` | No | Resend API key (for emails) |

## Common Commands

```bash
pnpm dev            # Start dev servers
pnpm build          # Build all workspaces
pnpm check-types    # Type-check monorepo
pnpm lint           # ESLint (flat config)
pnpm format         # Prettier
pnpm test           # Vitest
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the branching strategy, PR process, and code guidelines.

## License

Private repository. All rights reserved.
