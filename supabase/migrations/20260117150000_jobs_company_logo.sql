alter table public.jobs
  add column if not exists company_name text,
  add column if not exists company_logo_url text;

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
      team_id, platform, platform_job_id, company_name, company_logo_url, title, description, apply_url, posted_at, fetched_at,
      budget_type, fixed_budget_min, fixed_budget_max, hourly_min, hourly_max, currency,
      client_country, client_rating, client_hires, client_payment_verified,
      skills, seniority, category, canonical_hash, source_raw
    )
    select
      j.team_id,
      j.platform,
      j.platform_job_id,
      j.company_name,
      j.company_logo_url,
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
      company_name text,
      company_logo_url text,
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
      company_name = excluded.company_name,
      company_logo_url = excluded.company_logo_url,
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

