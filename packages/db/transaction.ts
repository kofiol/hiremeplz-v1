import { randomUUID } from "node:crypto";

import { Pool } from "pg";

export type JobSearchBatchWriteInput = {
  teamId: string;
  agentRunId: string;
  jobSources: unknown[];
  jobs: unknown[];
  rankings: unknown[];
};

export type JobSearchBatchWriteResult = {
  jobSourcesUpserted: number;
  jobsUpserted: number;
  rankingsWritten: number;
};

type JobSourceRecord = {
  team_id: string;
  platform: string;
  platform_job_id: string;
  url: string | null;
  fetched_at: string;
  raw_json?: unknown;
};

type JobRecord = {
  team_id: string;
  platform: string;
  platform_job_id: string;
  company_name: string | null;
  company_logo_url: string | null;
  title: string;
  description: string;
  apply_url: string;
  posted_at: string | null;
  fetched_at: string;
  budget_type: string;
  fixed_budget_min: number | null;
  fixed_budget_max: number | null;
  hourly_min: number | null;
  hourly_max: number | null;
  currency: string;
  client_country: string | null;
  client_rating: number | null;
  client_hires: number | null;
  client_payment_verified: boolean | null;
  skills: string[] | null;
  seniority: string | null;
  category: string | null;
  canonical_hash: string;
  source_raw: unknown;
};

type JobRankingRecord = {
  canonical_hash: string;
  tightness: number;
  score: number;
  breakdown: unknown;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

let poolOverride: Pool | null = null;

export function setPgPoolForTests(next: Pool | null) {
  poolOverride = next;
}

export async function withPgTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await (poolOverride ?? pool).connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function writeJobSearchBatch(input: JobSearchBatchWriteInput): Promise<JobSearchBatchWriteResult> {
  return withPgTransaction(async (client) => {
    let jobSourcesUpserted = 0;

    if (Array.isArray(input.jobSources) && input.jobSources.length > 0) {
      try {
        const res = await client.query(
          `
            with ins as (
              insert into public.job_sources(team_id, platform, platform_job_id, url, fetched_at, raw_json)
              select
                x.team_id,
                x.platform,
                x.platform_job_id,
                x.url,
                x.fetched_at,
                x.raw_json
              from jsonb_to_recordset($1::jsonb) as x(
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
                raw_json = excluded.raw_json
              returning 1
            )
            select count(*)::int as count from ins
          `,
          [JSON.stringify(input.jobSources)],
        );
        jobSourcesUpserted = Number(res.rows?.[0]?.count ?? 0);
      } catch {
        jobSourcesUpserted = await upsertJobSourcesFallback(client, input.jobSources as JobSourceRecord[]);
      }
    }

    try {
      const res = await client.query(
        `
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
            from jsonb_to_recordset($1::jsonb) as j(
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
          ),
          deleted as (
            delete from public.job_rankings where team_id = $2::uuid and agent_run_id = $3::uuid
          ),
          inserted as (
            insert into public.job_rankings(team_id, job_id, agent_run_id, tightness, score, breakdown)
            select
              $2::uuid,
              u.id,
              $3::uuid,
              r.tightness,
              r.score,
              r.breakdown
            from jsonb_to_recordset($4::jsonb) as r(canonical_hash text, tightness int, score numeric, breakdown jsonb)
            join public.jobs u on u.team_id = $2::uuid and u.canonical_hash = r.canonical_hash
            returning 1
          )
          select
            (select count(*)::int from upserted) as jobs_upserted,
            (select count(*)::int from inserted) as rankings_written
        `,
        [JSON.stringify(input.jobs), input.teamId, input.agentRunId, JSON.stringify(input.rankings)],
      );

      return {
        jobSourcesUpserted,
        jobsUpserted: Number(res.rows?.[0]?.jobs_upserted ?? 0),
        rankingsWritten: Number(res.rows?.[0]?.rankings_written ?? 0),
      };
    } catch {
      const fallback = await upsertJobsAndRankingsFallback(
        client,
        input.teamId,
        input.agentRunId,
        input.jobs as JobRecord[],
        input.rankings as JobRankingRecord[],
      );
      return {
        jobSourcesUpserted,
        jobsUpserted: fallback.jobsUpserted,
        rankingsWritten: fallback.rankingsWritten,
      };
    }
  });
}

async function upsertJobSourcesFallback(client: import("pg").PoolClient, jobSources: JobSourceRecord[]) {
  let count = 0;
  for (const s of jobSources) {
    await client.query(
      `
        insert into public.job_sources(id, team_id, platform, platform_job_id, url, fetched_at, raw_json)
        values ($1::uuid, $2::uuid, $3::public.platform, $4, $5, $6::timestamptz, $7::jsonb)
        on conflict (team_id, platform, platform_job_id)
        do update set url = excluded.url, fetched_at = excluded.fetched_at, raw_json = excluded.raw_json
      `,
      [randomUUID(), s.team_id, s.platform, s.platform_job_id, s.url, s.fetched_at, JSON.stringify(s.raw_json ?? null)],
    );
    count += 1;
  }
  return count;
}

async function upsertJobsAndRankingsFallback(
  client: import("pg").PoolClient,
  teamId: string,
  agentRunId: string,
  jobs: JobRecord[],
  rankings: JobRankingRecord[],
) {
  let jobsUpserted = 0;
  for (const j of jobs) {
    await client.query(
      `
        insert into public.jobs(
          id, team_id, platform, platform_job_id, company_name, company_logo_url, title, description, apply_url, posted_at, fetched_at,
          budget_type, fixed_budget_min, fixed_budget_max, hourly_min, hourly_max, currency,
          client_country, client_rating, client_hires, client_payment_verified,
          skills, seniority, category, canonical_hash, source_raw
        ) values (
          $1::uuid, $2::uuid, $3::public.platform, $4, $5, $6, $7, $8, $9, $10::timestamptz, $11::timestamptz,
          $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21,
          $22::text[], $23, $24, $25, $26::jsonb
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
      `,
      [
        randomUUID(),
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
        j.skills ?? [],
        j.seniority,
        j.category,
        j.canonical_hash,
        JSON.stringify(j.source_raw ?? null),
      ],
    );
    jobsUpserted += 1;
  }

  await client.query("delete from public.job_rankings where team_id=$1::uuid and agent_run_id=$2::uuid", [teamId, agentRunId]);

  let rankingsWritten = 0;
  for (const r of rankings) {
    const { rows } = await client.query("select id from public.jobs where team_id=$1::uuid and canonical_hash=$2 limit 1", [
      teamId,
      r.canonical_hash,
    ]);
    const jobId = rows?.[0]?.id;
    if (!jobId) continue;
    await client.query(
      "insert into public.job_rankings(id, team_id, job_id, agent_run_id, tightness, score, breakdown) values ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7::jsonb)",
      [randomUUID(), teamId, jobId, agentRunId, r.tightness, r.score, JSON.stringify(r.breakdown ?? {})],
    );
    rankingsWritten += 1;
  }

  return { jobsUpserted, rankingsWritten };
}
