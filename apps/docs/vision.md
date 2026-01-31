---
type: spec
title: Product Vision
status: living-document
updated: 2026-01-31
context_for_agents: >
  hireMePlz is a single-user AI agent system for freelancers. It monitors job
  sources, scores matches, and takes autonomous action (drafting proposals,
  alerting, tracking applications). The user is always a freelancer. The system
  operates with a "high autonomy, human-in-the-loop for irreversible actions"
  philosophy. Current focus: onboarding, profile enrichment, overview agent.
tags: [vision, business, product]
---

# Product Vision

## The Problem

Freelancers lose 1-3 hours daily to job hunting across fragmented platforms. The work is repetitive, emotionally draining, and produces inconsistent results. Most freelancers operate in a reactive cycle: finish project -> panic -> search -> underbid -> repeat.

**Pain points (ordered by severity):**
1. **Time sink** - Scanning Upwork, LinkedIn, email, Slack channels, job boards manually
2. **Signal-to-noise** - 80%+ of listings are irrelevant, scams, or below-rate
3. **Feast-or-famine** - No pipeline means income gaps between projects
4. **Proposal fatigue** - Writing personalized proposals for each opportunity
5. **Poor self-knowledge** - Freelancers undervalue skills or target wrong markets

## The Solution

hireMePlz is a **personal AI agent** that runs continuously in the background, doing the work a freelancer's ideal sales assistant would do:

1. **Monitor** - Watch multiple job sources 24/7 (Upwork, LinkedIn, RSS, email)
2. **Filter** - Remove noise: scams, low budgets, skill mismatches, bad clients
3. **Rank** - Score remaining opportunities by fit, budget, client quality, win probability
4. **Prepare** - Draft tailored cover letters and proposals in the freelancer's voice
5. **Alert** - Surface high-priority opportunities when response rates are highest
6. **Track** - Manage the application pipeline from shortlist to close
7. **Learn** - Improve scoring and recommendations from outcomes over time

### Design Principles

- **Agent-first** - The system should work without the user opening the app. Agents act, users review.
- **Human-in-the-loop for sends** - Agents can draft, rank, and recommend. They cannot send proposals or accept contracts without explicit approval.
- **Opinionated defaults, tunable knobs** - Ship with sensible defaults (tightness=3, professional tone). Let power users adjust.
- **Single-user architecture** - One freelancer per account. Team context exists for future agency/collective support but is not the primary use case.
- **Progressive disclosure** - Onboarding collects the minimum. The system gets smarter over time from usage, not upfront interrogation.

## Target User

**Primary:** Independent freelancers earning $50-200/hr, working on platforms like Upwork and LinkedIn. Typically software engineers, designers, writers, or consultants. They have marketable skills but hate the business development side.

**Secondary (future):** Small freelance teams/agencies (2-10 people) who need consistent project flow across team members.

**Anti-persona:** Enterprise recruiters, staffing agencies, job seekers looking for full-time employment.

## Business Model

| Tier | Price | Includes |
|------|-------|----------|
| Trial | Free | 15 min onboarding, profile analysis, limited job previews |
| Pro | ~$49-79/mo | Full monitoring, unlimited rankings, cover letter drafts, interview prep |
| Team | ~$99-149/mo | Multi-seat, shared pipeline, team-level analytics |

**Unit economics thesis:** If the agent saves 30+ hours/month of search time and helps win even one additional project per quarter, the ROI is 10-50x the subscription cost.

## Competitive Positioning

hireMePlz is **not** a job board. It doesn't aggregate listings for browsing. It's closer to a **virtual business development rep** that happens to use job boards as data sources.

| Dimension | Job boards (Upwork, LinkedIn) | Aggregators (Indeed, Otta) | hireMePlz |
|-----------|-------------------------------|---------------------------|-----------|
| Discovery | Manual search | Manual search + alerts | Autonomous agent |
| Filtering | Keyword-based | Keyword + basic ML | Profile-aware AI scoring |
| Action | User writes proposals | User applies | Agent drafts, user approves |
| Learning | None | Basic recommendations | Outcome-driven feedback loop |
| Pipeline | External tools needed | None | Built-in CRM |

## Success Metrics

**North star:** Hours saved per user per week (target: 5-10h).

**Leading indicators:**
- Profile completeness score > 80% within first session
- Job match precision (% of ranked jobs user finds relevant) > 70%
- Proposal draft acceptance rate (% of drafts sent without major edits) > 50%
- Time-to-first-shortlist < 24h after onboarding

**Lagging indicators:**
- Monthly active users
- Conversion trial -> paid
- Net revenue retention
- User-reported wins (projects landed via hireMePlz)
