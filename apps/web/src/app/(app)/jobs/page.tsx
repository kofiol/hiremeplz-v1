"use client";

import { useEffect, useId, useState } from "react";
import { useSession } from "../../auth/session-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Job = {
  id: string;
  platform: "linkedin" | "upwork";
  platform_job_id: string;
  title: string;
  description: string;
  apply_url: string;
  posted_at: string | null;
  fetched_at: string | null;
  created_at: string | null;
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
  company_name: string | null;
  company_logo_url: string | null;
  ranking: {
    score: number;
    breakdown: unknown;
    created_at: string | null;
  } | null;
};

type JobsResponse = {
  jobs?: Job[];
  tightness?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatMoney(amount: number | null, currency: string) {
  if (amount === null || !Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(time);
  } catch {
    return new Date(time).toLocaleDateString();
  }
}

function getPaginationModel(currentPage: number, totalPages: number) {
  const page = clamp(currentPage, 1, Math.max(totalPages, 1));
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: Array<number | "ellipsis"> = [];
  pages.push(1);

  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);

  if (left > 2) pages.push("ellipsis");
  for (let p = left; p <= right; p += 1) pages.push(p);
  if (right < totalPages - 1) pages.push("ellipsis");

  pages.push(totalPages);
  return pages;
}

function ScoreMeter({
  score,
  size = 56,
  strokeWidth = 8,
}: {
  score: number | null;
  size?: number;
  strokeWidth?: number;
}) {
  const reactId = useId();
  const id = `score-gradient-${reactId.replace(/:/g, "")}`;

  const normalized = typeof score === "number" && Number.isFinite(score) ? clamp(score, 0, 100) : 0;
  
  // Gauge calculations for a semi-circle (180 degrees)
  const radius = (size - strokeWidth) / 2;
  const arcLength = Math.PI * radius; // Length of the semi-circle
  const filledLength = (normalized / 100) * arcLength;
  
  // Height is half the size plus half the stroke width (to account for the stroke cap)
  const height = (size / 2) + (strokeWidth / 2);

  // Text scaling based on size
  const labelSize = Math.max(8, Math.round(size * 0.18));
  const valueSize = Math.max(12, Math.round(size * 0.35));

  return (
    <div 
      className="relative inline-flex flex-col items-center justify-end"
      style={{ width: size, height }}
    >
      <svg 
        width={size} 
        height={height} 
        viewBox={`0 0 ${size} ${height}`}
        className="absolute top-0 left-0"
      >
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" /> {/* Red */}
            <stop offset="50%" stopColor="#eab308" /> {/* Yellow/Orange */}
            <stop offset="100%" stopColor="#22c55e" /> {/* Green */}
          </linearGradient>
        </defs>
        {/* Background Track (Grey) */}
        <path
          d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value Bar (Gradient) */}
        <path
          d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${arcLength * 2}`} // Gap needs to be large enough
        />
      </svg>
      
      <div className="z-10 flex flex-col items-center justify-end leading-none pb-[5%]">
        <div 
          className="text-muted-foreground font-medium mb-1"
          style={{ fontSize: labelSize }}
        >
          Score
        </div>
        <div 
          className="font-bold tabular-nums text-foreground"
          style={{ fontSize: valueSize }}
        >
          {typeof score === "number" ? `${Math.round(normalized)}%` : "—"}
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const { session, isLoading } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!session) return;

    const accessToken = session.access_token;

    async function loadJobs() {
      setIsFetching(true);
      try {
        const response = await fetch("/api/v1/jobs?limit=200", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as JobsResponse;
        setJobs(Array.isArray(payload.jobs) ? payload.jobs : []);
      } finally {
        setIsFetching(false);
      }
    }

    loadJobs();
  }, [isLoading, session]);

  const hasJobs = jobs.length > 0;
  const totalPages = Math.max(1, Math.ceil(jobs.length / pageSize));
  const currentPage = clamp(page, 1, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageJobs = jobs.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginationModel = getPaginationModel(currentPage, totalPages);

  const breakdown =
    selectedJob?.ranking?.breakdown && typeof selectedJob.ranking.breakdown === "object"
      ? (selectedJob.ranking.breakdown as Record<string, unknown>)
      : null;
  const breakdownNotes = Array.isArray(breakdown?.notes)
    ? (breakdown?.notes as unknown[]).filter((note) => typeof note === "string")
    : [];

  return (
    <Drawer
      direction="right"
      open={drawerOpen}
      onOpenChange={(open) => {
        setDrawerOpen(open);
        if (!open) setSelectedJob(null);
      }}
    >
      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-medium">Jobs</h1>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">Per page</div>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[110px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {!session && !isLoading && (
              <p className="text-muted-foreground text-sm">
                Sign in to see jobs for your team.
              </p>
            )}
            {session && isFetching && (
              <p className="text-muted-foreground text-sm">Loading jobs…</p>
            )}
            {session && !isFetching && !hasJobs && (
              <p className="text-muted-foreground text-sm">
                No jobs found for your team yet.
              </p>
            )}
            {session && !isFetching && hasJobs && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {pageJobs.map((job) => (
                    <div
                      key={job.id}
                      role="button"
                      tabIndex={0}
                      className="hover:bg-accent/40 flex cursor-pointer items-stretch justify-between gap-3 rounded-md border border-border p-3 text-sm transition-colors"
                      onClick={() => {
                        setSelectedJob(job);
                        setDrawerOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedJob(job);
                          setDrawerOpen(true);
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-9">
                            {job.company_logo_url ? (
                              <AvatarImage
                                src={job.company_logo_url}
                                alt={job.company_name ?? "Company logo"}
                              />
                            ) : null}
                            <AvatarFallback>
                              {(job.company_name ?? job.title).slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{job.title}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {job.company_name ?? "Unknown company"}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="uppercase">{job.platform}</span>
                          {job.client_country && <span>• {job.client_country}</span>}
                          {job.seniority && <span>• {job.seniority}</span>}
                          {job.category && <span>• {job.category}</span>}
                          {job.posted_at && <span>• Posted {formatDate(job.posted_at)}</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {Array.isArray(job.skills) &&
                            job.skills.slice(0, 6).map((skill) => (
                              <Badge key={skill} variant="secondary" className="font-normal">
                                {skill}
                              </Badge>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {job.budget_type === "hourly" && (
                            <span>
                              {formatMoney(job.hourly_min, job.currency) ?? "—"}–
                              {formatMoney(job.hourly_max, job.currency) ?? "—"} / hr
                            </span>
                          )}
                          {job.budget_type === "fixed" && (
                            <span>
                              {formatMoney(job.fixed_budget_min, job.currency) ?? "—"}–
                              {formatMoney(job.fixed_budget_max, job.currency) ?? "—"} fixed
                            </span>
                          )}
                          {job.apply_url && (
                            <a
                              href={job.apply_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline underline-offset-4"
                              onClick={(event) => event.stopPropagation()}
                            >
                              Open on platform
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center">
                        <ScoreMeter score={job.ranking?.score ?? null} />
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Showing {startIndex + 1}–{Math.min(startIndex + pageSize, jobs.length)} of{" "}
                    {jobs.length}
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          className={
                            currentPage === 1 ? "pointer-events-none opacity-50" : undefined
                          }
                          onClick={(event) => {
                            event.preventDefault();
                            if (currentPage === 1) return;
                            setPage((p) => Math.max(1, p - 1));
                          }}
                        />
                      </PaginationItem>

                      {paginationModel.map((item, index) => {
                        if (item === "ellipsis") {
                          return (
                            <PaginationItem key={`ellipsis-${index}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }

                        return (
                          <PaginationItem key={item}>
                            <PaginationLink
                              href="#"
                              isActive={item === currentPage}
                              onClick={(event) => {
                                event.preventDefault();
                                setPage(item);
                              }}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : undefined
                          }
                          onClick={(event) => {
                            event.preventDefault();
                            if (currentPage === totalPages) return;
                            setPage((p) => Math.min(totalPages, p + 1));
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DrawerContent className="data-[vaul-drawer-direction=right]:w-[620px] data-[vaul-drawer-direction=right]:sm:max-w-none">
        <div className="flex h-full flex-col">
          <DrawerHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DrawerTitle className="truncate">{selectedJob?.title ?? "Job"}</DrawerTitle>
                <DrawerDescription className="mt-1 flex items-center gap-2">
                  <Avatar className="size-7">
                    {selectedJob?.company_logo_url ? (
                      <AvatarImage
                        src={selectedJob.company_logo_url}
                        alt={selectedJob.company_name ?? "Company logo"}
                      />
                    ) : null}
                    <AvatarFallback>
                      {(selectedJob?.company_name ?? selectedJob?.title ?? "J")
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">
                    {selectedJob?.company_name ?? "Unknown company"} •{" "}
                    {selectedJob?.platform ? selectedJob.platform.toUpperCase() : "PLATFORM"}
                  </span>
                </DrawerDescription>
              </div>
              <div className="shrink-0">
                <ScoreMeter score={selectedJob?.ranking?.score ?? null} size={92} strokeWidth={12} />
              </div>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-auto px-4 pb-4">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="text-sm font-medium">Why this job?</div>
                {breakdownNotes.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {breakdownNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No ranking breakdown available yet.
                  </div>
                )}

                {breakdown && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(breakdown)
                      .filter(([key]) => key !== "notes")
                      .map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-md border border-border bg-background px-3 py-2"
                        >
                          <div className="text-xs uppercase text-muted-foreground">{key}</div>
                          <div className="text-sm font-medium tabular-nums">
                            {typeof value === "number" ? value.toFixed(1) : String(value)}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium">Details</div>
                <div className="grid gap-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    {selectedJob?.client_country && <span>{selectedJob.client_country}</span>}
                    {selectedJob?.seniority && <span>• {selectedJob.seniority}</span>}
                    {selectedJob?.category && <span>• {selectedJob.category}</span>}
                    {selectedJob?.posted_at && <span>• Posted {formatDate(selectedJob.posted_at)}</span>}
                  </div>
                  {selectedJob?.budget_type === "hourly" && (
                    <div>
                      <span className="text-muted-foreground">Hourly:</span>{" "}
                      {formatMoney(selectedJob.hourly_min, selectedJob.currency) ?? "—"}–
                      {formatMoney(selectedJob.hourly_max, selectedJob.currency) ?? "—"} / hr
                    </div>
                  )}
                  {selectedJob?.budget_type === "fixed" && (
                    <div>
                      <span className="text-muted-foreground">Fixed:</span>{" "}
                      {formatMoney(selectedJob.fixed_budget_min, selectedJob.currency) ?? "—"}–
                      {formatMoney(selectedJob.fixed_budget_max, selectedJob.currency) ?? "—"}
                    </div>
                  )}
                  {typeof selectedJob?.client_rating === "number" && (
                    <div>
                      <span className="text-muted-foreground">Client rating:</span>{" "}
                      {selectedJob.client_rating.toFixed(2)}
                    </div>
                  )}
                  {typeof selectedJob?.client_hires === "number" && (
                    <div>
                      <span className="text-muted-foreground">Client hires:</span>{" "}
                      {selectedJob.client_hires}
                    </div>
                  )}
                  {typeof selectedJob?.client_payment_verified === "boolean" && (
                    <div>
                      <span className="text-muted-foreground">Payment verified:</span>{" "}
                      {selectedJob.client_payment_verified ? "Yes" : "No"}
                    </div>
                  )}
                  {selectedJob?.fetched_at && (
                    <div>
                      <span className="text-muted-foreground">Fetched:</span>{" "}
                      {formatDate(selectedJob.fetched_at)}
                    </div>
                  )}
                  {selectedJob?.created_at && (
                    <div>
                      <span className="text-muted-foreground">Created:</span>{" "}
                      {formatDate(selectedJob.created_at)}
                    </div>
                  )}
                  {selectedJob?.ranking?.created_at && (
                    <div>
                      <span className="text-muted-foreground">Ranked:</span>{" "}
                      {formatDate(selectedJob.ranking.created_at)}
                    </div>
                  )}
                  {selectedJob?.platform_job_id && (
                    <div>
                      <span className="text-muted-foreground">Platform job ID:</span>{" "}
                      <span className="font-mono text-xs">{selectedJob.platform_job_id}</span>
                    </div>
                  )}
                  {selectedJob?.canonical_hash && (
                    <div>
                      <span className="text-muted-foreground">Canonical hash:</span>{" "}
                      <span className="font-mono text-xs">{selectedJob.canonical_hash}</span>
                    </div>
                  )}
                  {selectedJob?.id && (
                    <div>
                      <span className="text-muted-foreground">Job ID:</span>{" "}
                      <span className="font-mono text-xs">{selectedJob.id}</span>
                    </div>
                  )}
                </div>

                {Array.isArray(selectedJob?.skills) && selectedJob.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedJob.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="font-normal">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium">Description</div>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {selectedJob?.description ?? ""}
                </div>
              </div>
            </div>
          </div>

          <DrawerFooter>
            {selectedJob?.apply_url ? (
              <Button asChild>
                <a href={selectedJob.apply_url} target="_blank" rel="noreferrer">
                  Open on platform
                </a>
              </Button>
            ) : null}
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
