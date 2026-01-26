create extension if not exists pgcrypto;
create extension if not exists vector;

do $$ begin
  create type public.team_role as enum ('leader', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.platform as enum ('upwork', 'linkedin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.application_status as enum (
    'shortlisted',
    'ready_to_apply',
    'applied',
    'in_conversation',
    'interviewing',
    'won',
    'lost',
    'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.agent_type as enum (
    'job_search',
    'cover_letter',
    'dashboard_copilot',
    'upwork_profile_optimizer',
    'interview_prep',
    'profile_parser',
    'email_ingest'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.run_status as enum ('queued', 'running', 'succeeded', 'failed', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.feedback_status as enum ('action_required', 'resolved');
exception when duplicate_object then null; end $$;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  role public.team_role not null,
  status text not null default 'active',
  invited_email text,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists idx_team_members_user_id on public.team_members(user_id);

create table if not exists public.profiles (
  user_id uuid primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  email text,
  display_name text,
  timezone text not null default 'UTC',
  plan text not null default 'trial',
  plan_ends_at timestamptz,
  profile_completeness_score numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date_of_birth date
);

create index if not exists idx_profiles_team_id on public.profiles(team_id);

create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  level int not null default 3,
  years numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_skills_team_user on public.user_skills(team_id, user_id);

create table if not exists public.user_experiences (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  title text not null,
  company text,
  start_date date,
  end_date date,
  highlights text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  platforms text[] not null default array['upwork','linkedin'],
  currency text not null default 'USD',
  hourly_min numeric,
  hourly_max numeric,
  fixed_budget_min numeric,
  project_types text[] not null default array['short_gig','medium_project'],
  tightness int not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_sources (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  platform public.platform not null,
  platform_job_id text not null,
  url text,
  fetched_at timestamptz not null default now(),
  raw_json jsonb,
  unique(team_id, platform, platform_job_id)
);

create index if not exists idx_job_sources_team_platform on public.job_sources(team_id, platform);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  platform public.platform not null,
  platform_job_id text not null,
  title text not null,
  description text not null,
  apply_url text not null,
  posted_at timestamptz,
  fetched_at timestamptz not null default now(),
  budget_type text not null default 'unknown',
  fixed_budget_min numeric,
  fixed_budget_max numeric,
  hourly_min numeric,
  hourly_max numeric,
  currency text not null default 'USD',
  client_country text,
  client_rating numeric,
  client_hires int,
  client_payment_verified boolean,
  skills text[] not null default array[]::text[],
  seniority text,
  category text,
  canonical_hash text not null,
  source_raw jsonb,
  created_at timestamptz not null default now(),
  unique(team_id, canonical_hash)
);

create index if not exists idx_jobs_team_platform on public.jobs(team_id, platform);
create index if not exists idx_jobs_team_created_at on public.jobs(team_id, created_at desc);
create index if not exists idx_jobs_skills_gin on public.jobs using gin (skills);

create table if not exists public.job_rankings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  agent_run_id uuid,
  tightness int not null,
  score numeric not null,
  breakdown jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_rankings_job_id_created_at on public.job_rankings(job_id, created_at desc);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid,
  agent_type public.agent_type not null,
  trigger text not null,
  status public.run_status not null default 'queued',
  inputs jsonb,
  outputs jsonb,
  error_text text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_runs_team_created_at on public.agent_runs(team_id, created_at desc);
create index if not exists idx_agent_runs_inputs_trigger_run on public.agent_runs(team_id, ((inputs->>'trigger_run_id'))) where (inputs ? 'trigger_run_id');

create table if not exists public.agent_run_steps (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  step_name text not null,
  status public.run_status not null default 'running',
  meta jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_run_steps_run_id on public.agent_run_steps(agent_run_id, created_at asc);

create or replace function public.upsert_jobs_and_rankings(
  p_team_id uuid,
  p_agent_run_id uuid,
  p_job_sources jsonb,
  p_jobs jsonb,
  p_rankings jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  jobs_upserted_count int := 0;
  rankings_written_count int := 0;
begin
  if jsonb_typeof(p_job_sources) = 'array' and jsonb_array_length(p_job_sources) > 0 then
    insert into public.job_sources(team_id, platform, platform_job_id, url, fetched_at, raw_json)
    select
      x.team_id,
      x.platform,
      x.platform_job_id,
      x.url,
      x.fetched_at,
      x.raw_json
    from jsonb_to_recordset(p_job_sources) as x(
      team_id uuid,
      platform public.platform,
      platform_job_id text,
      url text,
      fetched_at timestamptz,
      raw_json jsonb
    )
    on conflict (team_id, platform, platform_job_id)
    do update set
      url = excluded.url,
      fetched_at = excluded.fetched_at,
      raw_json = excluded.raw_json;
  end if;

  with upserted as (
    insert into public.jobs(
      team_id, platform, platform_job_id, title, description, apply_url, posted_at, fetched_at,
      budget_type, fixed_budget_min, fixed_budget_max, hourly_min, hourly_max, currency,
      client_country, client_rating, client_hires, client_payment_verified,
      skills, seniority, category, canonical_hash, source_raw
    )
    select
      j.team_id,
      j.platform,
      j.platform_job_id,
      j.title,
      j.description,
      j.apply_url,
      j.posted_at,
      j.fetched_at,
      j.budget_type,
      j.fixed_budget_min,
      j.fixed_budget_max,
      j.hourly_min,
      j.hourly_max,
      j.currency,
      j.client_country,
      j.client_rating,
      j.client_hires,
      j.client_payment_verified,
      coalesce(j.skills, array[]::text[]),
      j.seniority,
      j.category,
      j.canonical_hash,
      j.source_raw
    from jsonb_to_recordset(p_jobs) as j(
      team_id uuid,
      platform public.platform,
      platform_job_id text,
      title text,
      description text,
      apply_url text,
      posted_at timestamptz,
      fetched_at timestamptz,
      budget_type text,
      fixed_budget_min numeric,
      fixed_budget_max numeric,
      hourly_min numeric,
      hourly_max numeric,
      currency text,
      client_country text,
      client_rating numeric,
      client_hires int,
      client_payment_verified boolean,
      skills text[],
      seniority text,
      category text,
      canonical_hash text,
      source_raw jsonb
    )
    on conflict (team_id, canonical_hash)
    do update set
      platform_job_id = excluded.platform_job_id,
      title = excluded.title,
      description = excluded.description,
      apply_url = excluded.apply_url,
      posted_at = excluded.posted_at,
      fetched_at = excluded.fetched_at,
      budget_type = excluded.budget_type,
      fixed_budget_min = excluded.fixed_budget_min,
      fixed_budget_max = excluded.fixed_budget_max,
      hourly_min = excluded.hourly_min,
      hourly_max = excluded.hourly_max,
      currency = excluded.currency,
      client_country = excluded.client_country,
      client_rating = excluded.client_rating,
      client_hires = excluded.client_hires,
      client_payment_verified = excluded.client_payment_verified,
      skills = excluded.skills,
      seniority = excluded.seniority,
      category = excluded.category,
      source_raw = excluded.source_raw
    returning id, canonical_hash
  )
  select count(*) into jobs_upserted_count from upserted;

  delete from public.job_rankings where team_id = p_team_id and agent_run_id = p_agent_run_id;

  if jsonb_typeof(p_rankings) = 'array' and jsonb_array_length(p_rankings) > 0 then
    with upserted as (
      select id, canonical_hash from public.jobs where team_id = p_team_id and canonical_hash in (
        select r.canonical_hash from jsonb_to_recordset(p_rankings) as r(canonical_hash text, tightness int, score numeric, breakdown jsonb)
      )
    ), inserted as (
      insert into public.job_rankings(team_id, job_id, agent_run_id, tightness, score, breakdown)
      select
        p_team_id,
        u.id,
        p_agent_run_id,
        r.tightness,
        r.score,
        r.breakdown
      from jsonb_to_recordset(p_rankings) as r(canonical_hash text, tightness int, score numeric, breakdown jsonb)
      join upserted u on u.canonical_hash = r.canonical_hash
      returning 1
    )
    select count(*) into rankings_written_count from inserted;
  end if;

  return jsonb_build_object(
    'jobs_upserted', jobs_upserted_count,
    'rankings_written', rankings_written_count
  );
end;
$$;
