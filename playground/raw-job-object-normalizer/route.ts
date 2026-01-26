import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

type RawJob = {
  url?: string;
  job_posting_id?: string;
  job_title?: string;
  company_name?: string;
  job_location?: string;
  job_summary?: string;
  job_seniority_level?: string;
  job_function?: string;
  job_industries?: string;
  company_url?: string;
  job_posted_time?: string;
  job_num_applicants?: number;
  discovery_input?: Record<string, unknown>;
  apply_link?: string | null;
  country_code?: string | null;
  title_id?: string | null;
  company_logo?: string | null;
  job_posted_date?: string | null;
  job_poster?: string | null;
  application_availability?: boolean;
  job_description_formatted?: string;
  base_salary?: unknown;
  salary_standards?: unknown;
  is_easy_apply?: boolean;
  timestamp?: string;
  input?: {
    url?: string;
    discovery_input?: Record<string, unknown>;
  };
  [key: string]: unknown;
};

type CanonicalJob = {
  team_id: string;
  platform: "linkedin" | "upwork";
  platform_job_id: string;
  company_name: string | null;
  company_logo_url: string | null;
  title: string;
  description: string;
  apply_url: string;
  posted_at: string | null;
  fetched_at: string | null;
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
  skills: string[];
  seniority: string | null;
  category: string | null;
  canonical_hash: string;
};

type NormalizeOptions = {
  teamId: string;
  platform: "linkedin" | "upwork";
};

function normalizeWhitespace(value: string | null | undefined) {
  if (!value) return null;
  return value.replace(/\s+/g, " ").replace(/\s+,/g, ",").trim() || null;
}

function truncateText(value: string | null | undefined, maxLength: number) {
  if (!value) return null;
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength);
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function inferClientCountry(raw: RawJob) {
  if (raw.country_code && typeof raw.country_code === "string") {
    return raw.country_code;
  }
  if (raw.job_location && typeof raw.job_location === "string") {
    const normalized = normalizeWhitespace(raw.job_location);
    if (!normalized) return null;
    const parts = normalized.split(",");
    const last = parts[parts.length - 1]?.trim();
    return last || null;
  }
  return null;
}

function buildDescription(raw: RawJob) {
  const title = normalizeWhitespace(raw.job_title);
  const company = normalizeWhitespace(raw.company_name);
  const location = normalizeWhitespace(raw.job_location);
  const summary = normalizeWhitespace(raw.job_summary);
  const formatted = normalizeWhitespace(raw.job_description_formatted);
  const segments: string[] = [];
  if (title) {
    segments.push(title);
  }
  if (company) {
    segments.push(`Company: ${company}`);
  }
  if (location) {
    segments.push(`Location: ${location}`);
  }
  if (summary && summary !== title) {
    segments.push(summary);
  }
  if (formatted && formatted !== summary) {
    segments.push(formatted);
  }
  const joined = segments.join("\n");
  const normalized = normalizeWhitespace(joined);
  if (!normalized) return "";
  return truncateText(normalized, 4000) ?? "";
}

const SKILL_DICTIONARY = [
  "react",
  "next.js",
  "nextjs",
  "typescript",
  "javascript",
  "node.js",
  "node",
  "tailwind",
  "tailwindcss",
  "supabase",
  "postgres",
  "postgresql",
  "sql",
  "aws",
  "gcp",
  "azure",
  "docker",
  "kubernetes",
];

function extractSkills(title: string, description: string) {
  const target = `${title} ${description}`.toLowerCase();
  const skills = new Set<string>();
  for (const rawSkill of SKILL_DICTIONARY) {
    const normalized = rawSkill.replace(/\./g, "");
    if (target.includes(normalized)) {
      if (normalized === "nextjs" || normalized === "nextjs") {
        skills.add("nextjs");
      } else if (normalized === "nodejs") {
        skills.add("nodejs");
      } else if (normalized === "tailwindcss" || normalized === "tailwind") {
        skills.add("tailwindcss");
      } else {
        skills.add(normalized);
      }
    }
  }
  return Array.from(skills).sort();
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function computeCanonicalHash(teamId: string, platform: string, platformJobId: string) {
  const input = `${teamId}${platform}${platformJobId}`;
  return createHash("sha256").update(input).digest("hex");
}

function normalizeRawJob(raw: RawJob, options: NormalizeOptions): CanonicalJob | null {
  const platformJobId =
    (typeof raw.job_posting_id === "string" && raw.job_posting_id.trim() !== ""
      ? raw.job_posting_id.trim()
      : null) ??
    null;

  if (!platformJobId) {
    return null;
  }

  const title =
    normalizeWhitespace(raw.job_title) ??
    normalizeWhitespace((raw as { title?: string }).title) ??
    "";

  if (!title) {
    return null;
  }

  const companyName = normalizeWhitespace(raw.company_name);
  const companyLogoUrl =
    raw.company_logo && typeof raw.company_logo === "string"
      ? normalizeWhitespace(raw.company_logo)
      : null;

  const applyUrl =
    (typeof raw.apply_link === "string" && raw.apply_link.trim() !== ""
      ? raw.apply_link.trim()
      : null) ??
    (typeof raw.url === "string" && raw.url.trim() !== "" ? raw.url.trim() : null) ??
    (raw.input && typeof raw.input.url === "string" && raw.input.url.trim() !== ""
      ? raw.input.url.trim()
      : null);

  if (!applyUrl) {
    return null;
  }

  const description = buildDescription(raw);
  const skills = extractSkills(title, description);
  const postedAt = parseDate(raw.job_posted_date ?? null);
  const fetchedAt = parseDate(raw.timestamp ?? null);

  const budgetType = "unknown";
  const currency = "USD";

  const clientCountry = inferClientCountry(raw);

  const seniority =
    normalizeWhitespace(raw.job_seniority_level) ??
    normalizeWhitespace((raw as { seniority?: string }).seniority);

  const jobFunction = normalizeWhitespace(raw.job_function);
  const jobIndustries = normalizeWhitespace(raw.job_industries);

  const category =
    jobFunction && jobIndustries
      ? `${jobFunction} | ${jobIndustries}`
      : jobFunction || jobIndustries || null;

  const canonicalHash = computeCanonicalHash(options.teamId, options.platform, platformJobId);

  return {
    team_id: options.teamId,
    platform: options.platform,
    platform_job_id: platformJobId,
    company_name: companyName,
    company_logo_url: companyLogoUrl,
    title,
    description,
    apply_url: applyUrl,
    posted_at: postedAt,
    fetched_at: fetchedAt,
    budget_type: budgetType,
    fixed_budget_min: null,
    fixed_budget_max: null,
    hourly_min: null,
    hourly_max: null,
    currency,
    client_country: clientCountry,
    client_rating: null,
    client_hires: null,
    client_payment_verified: null,
    skills,
    seniority: seniority ?? null,
    category,
    canonical_hash: canonicalHash,
  };
}

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "";
  const asString = String(value);
  if (asString === "") return "";
  if (/[",\n]/.test(asString)) {
    return `"${asString.replace(/"/g, '""')}"`;
  }
  return asString;
}

function toPgTextArray(values: string[]) {
  if (!values.length) return "{}";
  const escaped = values.map((v) => `"${v.replace(/"/g, '\\"')}"`);
  return `{${escaped.join(",")}}`;
}

function jobsToCsv(jobs: CanonicalJob[]) {
  const header = [
    "team_id",
    "platform",
    "platform_job_id",
    "company_name",
    "company_logo_url",
    "title",
    "description",
    "apply_url",
    "posted_at",
    "fetched_at",
    "budget_type",
    "fixed_budget_min",
    "fixed_budget_max",
    "hourly_min",
    "hourly_max",
    "currency",
    "client_country",
    "client_rating",
    "client_hires",
    "client_payment_verified",
    "skills",
    "seniority",
    "category",
    "canonical_hash",
  ];

  const lines = [header.join(",")];

  for (const job of jobs) {
    const row = [
      escapeCsvValue(job.team_id),
      escapeCsvValue(job.platform),
      escapeCsvValue(job.platform_job_id),
      escapeCsvValue(job.company_name),
      escapeCsvValue(job.company_logo_url),
      escapeCsvValue(job.title),
      escapeCsvValue(job.description),
      escapeCsvValue(job.apply_url),
      escapeCsvValue(job.posted_at),
      escapeCsvValue(job.fetched_at),
      escapeCsvValue(job.budget_type),
      escapeCsvValue(job.fixed_budget_min),
      escapeCsvValue(job.fixed_budget_max),
      escapeCsvValue(job.hourly_min),
      escapeCsvValue(job.hourly_max),
      escapeCsvValue(job.currency),
      escapeCsvValue(job.client_country),
      escapeCsvValue(job.client_rating),
      escapeCsvValue(job.client_hires),
      escapeCsvValue(job.client_payment_verified),
      escapeCsvValue(toPgTextArray(job.skills)),
      escapeCsvValue(job.seniority),
      escapeCsvValue(job.category),
      escapeCsvValue(job.canonical_hash),
    ];
    lines.push(row.join(","));
  }

  return lines.join("\n");
}

async function readRawJobsFromFile(path: string) {
  const content = (await readFile(path, "utf8")).trim();
  if (!content) return [];
  if (content.startsWith("[")) {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed as RawJob[];
    }
    if (parsed && typeof parsed === "object") {
      return [parsed as RawJob];
    }
    return [];
  }
  if (content.startsWith("{")) {
    return [JSON.parse(content) as RawJob];
  }
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const items: RawJob[] = [];
  for (const line of lines) {
    try {
      items.push(JSON.parse(line) as RawJob);
    } catch {
    }
  }
  return items;
}

function parseArgs(argv: string[]) {
  const result: {
    inputPath: string | null;
    outputPath: string | null;
    teamId: string | null;
    platform: "linkedin" | "upwork" | null;
  } = {
    inputPath: null,
    outputPath: null,
    teamId: null,
    platform: null,
  };

  const args = [...argv];
  while (args.length > 0) {
    const current = args.shift();
    if (!current) continue;
    if (current === "--input" || current === "-i") {
      const value = args.shift();
      if (value) result.inputPath = value;
    } else if (current === "--output" || current === "-o") {
      const value = args.shift();
      if (value) result.outputPath = value;
    } else if (current === "--team-id" || current === "-t") {
      const value = args.shift();
      if (value) result.teamId = value;
    } else if (current === "--platform" || current === "-p") {
      const value = args.shift();
      if (value === "linkedin" || value === "upwork") {
        result.platform = value;
      }
    } else if (!current.startsWith("-") && !result.inputPath) {
      result.inputPath = current;
    }
  }

  return result;
}

async function main() {
  const { inputPath, outputPath, teamId, platform } = parseArgs(process.argv.slice(2));

  if (!inputPath) {
    console.error(
      "Usage: tsx playground/raw-job-object-normalizer/route.ts --input <file> [--output <file>] [--team-id <uuid>] [--platform linkedin|upwork]",
    );
    process.exitCode = 1;
    return;
  }

  const resolvedTeamId = teamId ?? "00000000-0000-0000-0000-000000000000";
  const resolvedPlatform = platform ?? "linkedin";

  const rawJobs = await readRawJobsFromFile(inputPath);
  if (!rawJobs.length) {
    console.error("No raw jobs found in input file.");
    return;
  }

  const options: NormalizeOptions = {
    teamId: resolvedTeamId,
    platform: resolvedPlatform,
  };

  const normalized: CanonicalJob[] = [];
  const seenHashes = new Set<string>();

  for (const raw of rawJobs) {
    const job = normalizeRawJob(raw, options);
    if (!job) continue;
    if (seenHashes.has(job.canonical_hash)) continue;
    seenHashes.add(job.canonical_hash);
    normalized.push(job);
  }

  if (!normalized.length) {
    console.error("No jobs could be normalized from input.");
    return;
  }

  const csv = jobsToCsv(normalized);

  const defaultOutput =
    outputPath ??
    join(
      dirname(inputPath),
      `${basename(inputPath).replace(/\.[^/.]+$/, "") || "jobs"}.normalized.jobs.csv`,
    );

  await writeFile(defaultOutput, csv, "utf8");

  console.log(
    `Normalized ${normalized.length} jobs from ${rawJobs.length} raw records into ${defaultOutput}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
