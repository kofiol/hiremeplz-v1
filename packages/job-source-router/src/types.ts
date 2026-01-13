export type Platform = "upwork" | "linkedin";

export type RawJobBudgetType = "fixed" | "hourly" | "unknown";

export type RawJobBudget = {
  type: RawJobBudgetType;
  currency?: string | null;
  min?: number | null;
  max?: number | null;
};

export type RawJob = {
  platform: Platform;
  provider: string;
  fetchedAt: string;
  providerJobId?: string | null;
  title?: string | null;
  companyName?: string | null;
  description?: string | null;
  applyUrl?: string | null;
  sourceUrl?: string | null;
  postedAt?: string | null;
  location?: string | null;
  isRemote?: boolean | null;
  budget?: RawJobBudget | null;
  skills?: string[] | null;
  raw: unknown;
};

export type QueryPlanPagingStrategy = "page" | "cursor";

export type QueryPlanPaging = {
  strategy?: QueryPlanPagingStrategy;
  page?: number;
  cursor?: string;
  limit?: number;
};

export type QueryPlanFilters = {
  postedWithinDays?: number;
  remoteOnly?: boolean;
  location?: string;
  budgetType?: RawJobBudgetType;
  hourlyMin?: number;
  hourlyMax?: number;
  fixedBudgetMin?: number;
  fixedBudgetMax?: number;
  currency?: string;
};

export type QueryPlan = {
  keywords: string[];
  filters?: QueryPlanFilters;
  paging?: QueryPlanPaging;
};

export type RouterSearchRequest = {
  platform: Platform;
  queryPlan: QueryPlan;
};

export type RouterSearchOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
};

export type ProviderAdapter = {
  id: string;
  platforms: Platform[];
  search(request: RouterSearchRequest, options?: RouterSearchOptions): Promise<RawJob[]>;
};

export type ProviderHealthSnapshot = {
  ok: boolean;
  consecutiveFailures: number;
  lastFailureAt?: number;
  disabledUntil?: number;
};

export type ProviderHealthStore = {
  snapshot(providerId: string): ProviderHealthSnapshot;
  recordSuccess(providerId: string): void;
  recordFailure(providerId: string): void;
};

export type RateLimiter = {
  wait(providerId: string, options?: { signal?: AbortSignal }): Promise<void>;
};

export type JobSourceRouter = {
  search(
    platform: Platform,
    queryPlan: QueryPlan,
    options?: RouterSearchOptions
  ): Promise<RawJob[]>;
};

