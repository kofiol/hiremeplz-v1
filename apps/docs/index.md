---
type: moc
title: hireMePlz Project Spec
version: 0.1.0
updated: 2026-01-31
status: living-document
audience: [agent, developer]
---

# hireMePlz - Project Spec

> A personal AI agent system that finds, evaluates, and acts on freelance opportunities so the freelancer can focus on delivery.

This is the **canonical source of truth** for what hireMePlz is, how it works, and where it's going. Written to be consumed by both AI agents (for context injection) and humans (for onboarding and decision-making).

## Map of Content

### Foundation
- [[vision]] - Why this exists, who it serves, business model
- [[architecture]] - System design, monorepo layout, tech stack
- [[data-model]] - Database schema, entity relationships, invariants

### Agent System
- [[agents/index]] - Agent philosophy, shared patterns, orchestration
- [[agents/onboarding-agent]] - Profile collection via conversational AI
- [[agents/job-search-agent]] - Source monitoring, ingestion, deduplication
- [[agents/ranking-agent]] - AI-powered match scoring
- [[agents/cover-letter-agent]] - Proposal generation tuned to freelancer voice
- [[agents/interview-prep-agent]] - Real-time voice practice with analysis
- [[agents/overview-copilot]] - Dashboard intelligence, daily briefings, nudges

### Data Pipelines
- [[pipelines/index]] - Pipeline design principles
- [[pipelines/job-ingestion]] - Source -> normalize -> dedupe -> store
- [[pipelines/profile-enrichment]] - LinkedIn, CV, manual -> unified profile
- [[pipelines/application-lifecycle]] - Shortlist -> apply -> track -> close

### Reference
- [[glossary]] - Terminology used across the system
- [[roadmap]] - Phased delivery plan

---

## Reading This Spec

**If you're an agent:** Start with [[vision]] for product context, then [[architecture]] for system boundaries. Load [[agents/index]] before executing any agent task. The `context_for_agents` frontmatter field in each doc tells you what's relevant to inject.

**If you're a developer:** Start with [[architecture]] and [[data-model]], then drill into the specific area you're working on.

**Conventions:**
- `[[wikilinks]]` connect related concepts
- Frontmatter `status` values: `implemented`, `in-progress`, `planned`, `speculative`
- Each agent doc includes a `tools` section listing available function calls
- SQL table names use `snake_case`, TypeScript uses `camelCase`
