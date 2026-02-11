import type { Job } from "./types"

const now = Date.now()
const hour = 3600000
const day = 86400000

export const MOCK_JOBS: Job[] = [
  {
    id: "j-001",
    platform: "upwork",
    platform_job_id: "uw-1829374",
    title: "Senior React/Next.js Developer for SaaS Dashboard",
    description: `We're looking for an experienced React developer to build a modern SaaS dashboard for our analytics platform.

**Requirements:**
- 5+ years with React and TypeScript
- Experience with Next.js App Router
- Familiarity with Tailwind CSS and component libraries (shadcn/ui preferred)
- Experience building data-heavy dashboards with charts, tables, and real-time updates
- Knowledge of REST APIs and WebSocket integration

**What you'll build:**
- Multi-tenant dashboard with role-based access
- Real-time analytics charts (Recharts or similar)
- Data table with sorting, filtering, and export
- Settings and configuration pages
- Notification system

This is a 3-month project with potential for ongoing work. We have Figma designs ready and a backend API built in Python/FastAPI.`,
    apply_url: "https://upwork.com/jobs/~01abc123",
    posted_at: new Date(now - 2 * day).toISOString(),
    budget_type: "hourly",
    hourly_min: 60,
    hourly_max: 85,
    fixed_budget_min: null,
    fixed_budget_max: null,
    currency: "USD",
    client_country: "United States",
    client_rating: 4.9,
    client_hires: 47,
    client_payment_verified: true,
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "REST APIs"],
    seniority: "Senior",
    category: "Web Development",
    company_name: "DataViz Analytics",
    company_logo_url: null,
    ai_summary: "High-budget SaaS dashboard build with your exact stack — Next.js, TypeScript, Tailwind, shadcn/ui. Verified client with 47 hires and 4.9 rating. 3-month engagement with extension potential.",
    is_bookmarked: true,
    ranking: {
      score: 92,
      tightness: 3,
      breakdown: { skill_match: 95, budget_fit: 88, client_quality: 96, scope_fit: 85, win_probability: 78 },
      reasoning: "Near-perfect skill alignment with your React/Next.js/TypeScript stack. Excellent client history.",
      created_at: new Date(now - 1 * hour).toISOString(),
    },
  },
  {
    id: "j-002",
    platform: "linkedin",
    platform_job_id: "li-9928374",
    title: "Full-Stack Engineer — AI Startup (Remote)",
    description: `Join our seed-stage AI startup building tools for content creators. We need a full-stack engineer who can own features end-to-end.

**Stack:** Next.js 15, TypeScript, Supabase, OpenAI API, Vercel
**Role:** You'll build new features, improve our AI pipeline, and help shape the product.

Requirements:
- Strong TypeScript and React skills
- Experience with Supabase or similar (Firebase, Prisma)
- Comfort working with LLM APIs (OpenAI, Anthropic)
- Ability to ship fast and iterate based on user feedback
- Bonus: experience with audio/video processing

Competitive salary + equity. Fully remote, async-first culture.`,
    apply_url: "https://linkedin.com/jobs/view/9928374",
    posted_at: new Date(now - 6 * hour).toISOString(),
    budget_type: "fixed",
    hourly_min: null,
    hourly_max: null,
    fixed_budget_min: 8000,
    fixed_budget_max: 12000,
    currency: "USD",
    client_country: "United States",
    client_rating: null,
    client_hires: null,
    client_payment_verified: null,
    skills: ["React", "TypeScript", "Next.js", "Supabase", "OpenAI", "Node.js"],
    seniority: "Mid",
    category: "Full-Stack Development",
    company_name: "CreatorAI",
    company_logo_url: "https://logo.clearbit.com/openai.com",
    ai_summary: "AI startup using your exact stack — Next.js, Supabase, OpenAI. Seed-stage with equity. Remote-first. Strong product-market fit for your skills.",
    is_bookmarked: false,
    ranking: {
      score: 87,
      tightness: 3,
      breakdown: { skill_match: 92, budget_fit: 75, client_quality: 70, scope_fit: 90, win_probability: 82 },
      reasoning: "Stack match is excellent. AI-native role aligns with your OpenAI experience. Budget slightly below your range.",
      created_at: new Date(now - 30 * 60000).toISOString(),
    },
  },
  {
    id: "j-003",
    platform: "upwork",
    platform_job_id: "uw-7782991",
    title: "WordPress Developer — E-commerce Site Redesign",
    description: `Looking for a WordPress developer to redesign our WooCommerce store. We need:
- New theme based on provided designs
- WooCommerce customization
- Performance optimization
- SEO improvements
- Mobile responsiveness

Timeline: 4 weeks. Budget is firm.`,
    apply_url: "https://upwork.com/jobs/~01def456",
    posted_at: new Date(now - 3 * day).toISOString(),
    budget_type: "fixed",
    hourly_min: null,
    hourly_max: null,
    fixed_budget_min: 1500,
    fixed_budget_max: 1500,
    currency: "USD",
    client_country: "United Kingdom",
    client_rating: 3.8,
    client_hires: 5,
    client_payment_verified: true,
    skills: ["WordPress", "WooCommerce", "PHP", "CSS", "SEO"],
    seniority: "Mid",
    category: "Web Development",
    company_name: "BritishGoods Ltd",
    company_logo_url: null,
    ai_summary: "WordPress/WooCommerce project — outside your primary stack. Low budget for the scope. Client has limited hire history.",
    is_bookmarked: false,
    ranking: {
      score: 23,
      tightness: 3,
      breakdown: { skill_match: 15, budget_fit: 20, client_quality: 45, scope_fit: 30, win_probability: 35 },
      reasoning: "Skill mismatch — WordPress/PHP is not in your stack. Low budget relative to scope.",
      created_at: new Date(now - 2 * hour).toISOString(),
    },
  },
  {
    id: "j-004",
    platform: "upwork",
    platform_job_id: "uw-5543218",
    title: "React Native Developer — Fitness App MVP",
    description: `We're building a fitness tracking app and need a React Native developer to build the MVP. Features include:
- Workout logging with timer
- Exercise library with animated demos
- Progress charts and stats
- Social features (friend challenges)
- Push notifications
- Integration with Apple HealthKit and Google Fit

We have wireframes and a backend API ready (Node.js/Express).`,
    apply_url: "https://upwork.com/jobs/~01ghi789",
    posted_at: new Date(now - 1 * day).toISOString(),
    budget_type: "hourly",
    hourly_min: 45,
    hourly_max: 65,
    fixed_budget_min: null,
    fixed_budget_max: null,
    currency: "USD",
    client_country: "Canada",
    client_rating: 4.7,
    client_hires: 23,
    client_payment_verified: true,
    skills: ["React Native", "TypeScript", "Node.js", "REST APIs", "Mobile Development"],
    seniority: "Mid",
    category: "Mobile Development",
    company_name: "FitTrack Inc",
    company_logo_url: "https://logo.clearbit.com/fitbit.com",
    ai_summary: "React Native MVP — related to your React skills but mobile-focused. Decent budget and good client. Requires HealthKit/Google Fit integration experience.",
    is_bookmarked: false,
    ranking: {
      score: 54,
      tightness: 3,
      breakdown: { skill_match: 55, budget_fit: 60, client_quality: 80, scope_fit: 45, win_probability: 40 },
      reasoning: "Partial skill overlap — React knowledge transfers but mobile-specific experience needed.",
      created_at: new Date(now - 3 * hour).toISOString(),
    },
  },
  {
    id: "j-005",
    platform: "linkedin",
    platform_job_id: "li-8827711",
    title: "Frontend Lead — Fintech Platform",
    description: `Series B fintech company looking for a frontend lead to own our customer-facing platform.

**Responsibilities:**
- Lead frontend architecture decisions
- Build and maintain React component library
- Implement complex financial data visualizations
- Mentor 2 junior developers
- Collaborate with product and design teams

**Requirements:**
- 6+ years frontend experience
- Expert React/TypeScript skills
- Experience with data visualization (D3.js, Recharts)
- Previous lead/senior experience
- Fintech or financial services background preferred

$130-160k/year + equity + benefits. Hybrid (NYC, 2 days/week).`,
    apply_url: "https://linkedin.com/jobs/view/8827711",
    posted_at: new Date(now - 4 * day).toISOString(),
    budget_type: "fixed",
    hourly_min: null,
    hourly_max: null,
    fixed_budget_min: 130000,
    fixed_budget_max: 160000,
    currency: "USD",
    client_country: "United States",
    client_rating: null,
    client_hires: null,
    client_payment_verified: null,
    skills: ["React", "TypeScript", "D3.js", "Recharts", "Component Libraries", "Team Leadership"],
    seniority: "Senior",
    category: "Frontend Development",
    company_name: "FinEdge Technologies",
    company_logo_url: "https://logo.clearbit.com/stripe.com",
    ai_summary: "Frontend lead role at Series B fintech. Strong React/TypeScript fit but requires NYC hybrid presence and team lead experience. High compensation.",
    is_bookmarked: true,
    ranking: {
      score: 71,
      tightness: 3,
      breakdown: { skill_match: 82, budget_fit: 90, client_quality: 75, scope_fit: 55, win_probability: 45 },
      reasoning: "Strong skill match but hybrid NYC requirement may be a blocker. Leadership role if you want to move up.",
      created_at: new Date(now - 4 * hour).toISOString(),
    },
  },
  {
    id: "j-006",
    platform: "upwork",
    platform_job_id: "uw-3321009",
    title: "Build a Chrome Extension for LinkedIn Automation",
    description: `Need a developer to build a Chrome extension that helps with LinkedIn outreach automation.

Features:
- Auto-connect with personalized messages
- Track connection requests and responses
- CRM-like dashboard for managing leads
- Export data to CSV
- Chrome side panel UI

Must be familiar with Chrome Extension Manifest V3 and LinkedIn DOM structure.`,
    apply_url: "https://upwork.com/jobs/~01jkl012",
    posted_at: new Date(now - 12 * hour).toISOString(),
    budget_type: "fixed",
    hourly_min: null,
    hourly_max: null,
    fixed_budget_min: 3000,
    fixed_budget_max: 5000,
    currency: "USD",
    client_country: "Germany",
    client_rating: 4.2,
    client_hires: 12,
    client_payment_verified: true,
    skills: ["Chrome Extensions", "JavaScript", "TypeScript", "React", "CSS"],
    seniority: "Mid",
    category: "Browser Extensions",
    company_name: null,
    company_logo_url: null,
    ai_summary: "Chrome extension project — uses React and TypeScript but requires extension-specific knowledge (Manifest V3). Niche skill set with decent budget.",
    is_bookmarked: false,
    ranking: {
      score: 48,
      tightness: 3,
      breakdown: { skill_match: 50, budget_fit: 55, client_quality: 65, scope_fit: 40, win_probability: 50 },
      reasoning: "Partial stack overlap. Chrome extension development is a niche skill you may not have deep experience with.",
      created_at: new Date(now - 5 * hour).toISOString(),
    },
  },
  {
    id: "j-007",
    platform: "upwork",
    platform_job_id: "uw-9918273",
    title: "Supabase + Next.js Backend Developer",
    description: `We need help building the backend for our project management tool. The frontend is built, we need someone to:

- Set up Supabase database schema (20+ tables)
- Implement Row Level Security policies
- Build API routes in Next.js
- Set up real-time subscriptions
- Implement file upload (Supabase Storage)
- Auth flow (Supabase Auth + Google OAuth)

You must have production Supabase experience. This is not a learn-on-the-job role.`,
    apply_url: "https://upwork.com/jobs/~01mno345",
    posted_at: new Date(now - 8 * hour).toISOString(),
    budget_type: "hourly",
    hourly_min: 55,
    hourly_max: 75,
    fixed_budget_min: null,
    fixed_budget_max: null,
    currency: "USD",
    client_country: "Australia",
    client_rating: 5.0,
    client_hires: 8,
    client_payment_verified: true,
    skills: ["Supabase", "Next.js", "TypeScript", "PostgreSQL", "Row Level Security", "Auth"],
    seniority: "Senior",
    category: "Backend Development",
    company_name: "TaskFlow Studio",
    company_logo_url: null,
    ai_summary: "Perfect backend match — Supabase, Next.js, RLS, Auth. Exactly what you've built for hiremeplz. 5-star client with verified payments.",
    is_bookmarked: true,
    ranking: {
      score: 89,
      tightness: 3,
      breakdown: { skill_match: 98, budget_fit: 78, client_quality: 95, scope_fit: 88, win_probability: 85 },
      reasoning: "Your Supabase production experience is exactly what they need. RLS, Auth, real-time — you've done all of this.",
      created_at: new Date(now - 6 * hour).toISOString(),
    },
  },
  {
    id: "j-008",
    platform: "linkedin",
    platform_job_id: "li-7723456",
    title: "Contract Developer — AI Chat Interface",
    description: `We're building an AI-powered customer support chatbot interface. Need a developer who can:

- Build a streaming chat UI (similar to ChatGPT)
- Integrate with OpenAI and Anthropic APIs
- Handle real-time message streaming (SSE)
- Build conversation history and management
- Implement file/image upload in chat
- Add admin panel for prompt management

3-month contract, remote. React + TypeScript required.`,
    apply_url: "https://linkedin.com/jobs/view/7723456",
    posted_at: new Date(now - 5 * hour).toISOString(),
    budget_type: "hourly",
    hourly_min: 70,
    hourly_max: 95,
    fixed_budget_min: null,
    fixed_budget_max: null,
    currency: "USD",
    client_country: "United States",
    client_rating: null,
    client_hires: null,
    client_payment_verified: null,
    skills: ["React", "TypeScript", "OpenAI API", "Streaming", "SSE", "Chat UI"],
    seniority: "Senior",
    category: "AI/ML",
    company_name: "SupportAI",
    company_logo_url: "https://logo.clearbit.com/intercom.com",
    ai_summary: "AI chat interface — you've literally built this for hiremeplz (onboarding chatbot, overview copilot). Streaming SSE, OpenAI, conversation history. Dream project.",
    is_bookmarked: false,
    ranking: {
      score: 95,
      tightness: 3,
      breakdown: { skill_match: 98, budget_fit: 92, client_quality: 80, scope_fit: 95, win_probability: 88 },
      reasoning: "Top match. You've built exactly this — streaming chat, OpenAI integration, conversation management. Portfolio piece ready.",
      created_at: new Date(now - 2 * hour).toISOString(),
    },
  },
  {
    id: "j-009",
    platform: "upwork",
    platform_job_id: "uw-1102938",
    title: "Python Data Pipeline Developer",
    description: `Need a Python developer to build ETL pipelines for our data warehouse.

- Extract data from 5+ APIs (Salesforce, HubSpot, Stripe, etc.)
- Transform and normalize into unified schema
- Load into Snowflake data warehouse
- Orchestration with Apache Airflow
- Monitoring and alerting

Requires strong Python, SQL, and data engineering experience.`,
    apply_url: "https://upwork.com/jobs/~01pqr678",
    posted_at: new Date(now - 5 * day).toISOString(),
    budget_type: "hourly",
    hourly_min: 80,
    hourly_max: 120,
    fixed_budget_min: null,
    fixed_budget_max: null,
    currency: "USD",
    client_country: "United States",
    client_rating: 4.6,
    client_hires: 31,
    client_payment_verified: true,
    skills: ["Python", "SQL", "Snowflake", "Apache Airflow", "ETL", "Data Engineering"],
    seniority: "Senior",
    category: "Data Engineering",
    company_name: "DataStack Corp",
    company_logo_url: null,
    ai_summary: "Python/Data Engineering role — not your stack. High budget but requires Snowflake, Airflow, and ETL experience you likely don't have.",
    is_bookmarked: false,
    ranking: {
      score: 18,
      tightness: 3,
      breakdown: { skill_match: 10, budget_fit: 95, client_quality: 82, scope_fit: 5, win_probability: 8 },
      reasoning: "Complete stack mismatch. Python data engineering is outside your TypeScript/React domain.",
      created_at: new Date(now - 5 * hour).toISOString(),
    },
  },
  {
    id: "j-010",
    platform: "upwork",
    platform_job_id: "uw-6654321",
    title: "Next.js Developer — Landing Page + Blog",
    description: `We need a developer to build our marketing website:
- Landing page with animations (Framer Motion)
- Blog with MDX content
- Contact form
- SEO optimization
- Dark/light mode

Design is in Figma. Simple project, should take 1-2 weeks.`,
    apply_url: "https://upwork.com/jobs/~01stu901",
    posted_at: new Date(now - 18 * hour).toISOString(),
    budget_type: "fixed",
    hourly_min: null,
    hourly_max: null,
    fixed_budget_min: 800,
    fixed_budget_max: 1200,
    currency: "USD",
    client_country: "India",
    client_rating: 4.1,
    client_hires: 3,
    client_payment_verified: false,
    skills: ["Next.js", "React", "Tailwind CSS", "Framer Motion", "MDX", "SEO"],
    seniority: "Junior",
    category: "Web Development",
    company_name: "NovaTech Solutions",
    company_logo_url: null,
    ai_summary: "Simple landing page — matches your stack but very low budget for the work involved. Unverified payment. Low-value opportunity.",
    is_bookmarked: false,
    ranking: {
      score: 35,
      tightness: 3,
      breakdown: { skill_match: 78, budget_fit: 12, client_quality: 20, scope_fit: 35, win_probability: 60 },
      reasoning: "Good skill match but budget is too low and client hasn't verified payment.",
      created_at: new Date(now - 10 * hour).toISOString(),
    },
  },
  {
    id: "j-011",
    platform: "linkedin",
    platform_job_id: "li-5567890",
    title: "TypeScript API Developer — E-commerce Platform",
    description: `We're building a headless e-commerce platform and need a TypeScript developer for our API layer.

**Tech stack:** Node.js, TypeScript, PostgreSQL, Redis, Docker
**What you'll do:**
- Design and implement RESTful APIs
- Build payment integration (Stripe)
- Implement inventory management system
- Set up caching layer with Redis
- Write comprehensive tests
- Document API endpoints

Fully remote, 6-month contract with possibility of full-time conversion.`,
    apply_url: "https://linkedin.com/jobs/view/5567890",
    posted_at: new Date(now - 2 * day - 6 * hour).toISOString(),
    budget_type: "hourly",
    hourly_min: 50,
    hourly_max: 70,
    fixed_budget_min: null,
    fixed_budget_max: null,
    currency: "USD",
    client_country: "Netherlands",
    client_rating: null,
    client_hires: null,
    client_payment_verified: null,
    skills: ["TypeScript", "Node.js", "PostgreSQL", "Redis", "Docker", "REST APIs", "Stripe"],
    seniority: "Mid",
    category: "Backend Development",
    company_name: "CartEngine",
    company_logo_url: "https://logo.clearbit.com/shopify.com",
    ai_summary: "TypeScript backend role — Node.js, PostgreSQL, Stripe. Overlaps with your backend skills. 6-month contract with full-time option. Remote from Netherlands.",
    is_bookmarked: false,
    ranking: {
      score: 65,
      tightness: 3,
      breakdown: { skill_match: 70, budget_fit: 62, client_quality: 60, scope_fit: 68, win_probability: 55 },
      reasoning: "Good TypeScript/PostgreSQL overlap. Backend-focused role that leverages your Supabase experience differently.",
      created_at: new Date(now - 8 * hour).toISOString(),
    },
  },
  {
    id: "j-012",
    platform: "upwork",
    platform_job_id: "uw-4432198",
    title: "Fix Bugs in React Dashboard (Quick Job)",
    description: `We have a React admin dashboard with several bugs that need fixing:
1. Data table sorting not working on certain columns
2. Chart not updating when filters change
3. Sidebar collapse animation glitching
4. Form validation not triggering on submit
5. Dark mode colors broken on settings page

Should be 5-10 hours of work. Codebase is clean, well-documented.`,
    apply_url: "https://upwork.com/jobs/~01vwx234",
    posted_at: new Date(now - 4 * hour).toISOString(),
    budget_type: "hourly",
    hourly_min: 40,
    hourly_max: 55,
    fixed_budget_min: null,
    fixed_budget_max: null,
    currency: "USD",
    client_country: "United States",
    client_rating: 4.8,
    client_hires: 67,
    client_payment_verified: true,
    skills: ["React", "TypeScript", "CSS", "Debugging", "Tailwind CSS"],
    seniority: "Mid",
    category: "Bug Fixes",
    company_name: null,
    company_logo_url: null,
    ai_summary: "Quick bug-fix job in a React dashboard. Easy money for 5-10 hours. Great client with 67 hires. Below your target rate but low commitment.",
    is_bookmarked: false,
    ranking: {
      score: 58,
      tightness: 3,
      breakdown: { skill_match: 85, budget_fit: 40, client_quality: 90, scope_fit: 30, win_probability: 75 },
      reasoning: "Easy win — skills match perfectly. Budget is below target but it's quick work with an excellent client.",
      created_at: new Date(now - 1 * hour).toISOString(),
    },
  },
]
