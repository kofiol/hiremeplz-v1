create table if not exists public.job_rankings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  agent_run_id uuid,
  tightness int not null default 3,
  score numeric not null default 0,
  breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_rankings_job_id_created_at
  on public.job_rankings(job_id, created_at desc);

create index if not exists idx_job_rankings_job_id_tightness_created_at
  on public.job_rankings(job_id, tightness, created_at desc);

create or replace view public.job_rankings_latest as
select distinct on (job_id, tightness)
  job_id,
  tightness,
  score,
  breakdown,
  created_at
from public.job_rankings
order by job_id, tightness, created_at desc;

