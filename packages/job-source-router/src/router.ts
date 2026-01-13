import {
  type JobSourceRouter,
  type Platform,
  type ProviderAdapter,
  type ProviderHealthSnapshot,
  type ProviderHealthStore,
  type QueryPlan,
  type RateLimiter,
  type RawJob,
  type RouterSearchRequest,
  type RouterSearchOptions,
} from "./types";

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("Aborted"));
      return;
    }

    const timeoutId = setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        reject(signal.reason ?? new Error("Aborted"));
      },
      { once: true }
    );
  });

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<T> => {
  if (timeoutMs <= 0) return promise;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Timeout")), timeoutMs);
    signal?.addEventListener(
      "abort",
      () => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(signal.reason ?? new Error("Aborted"));
      },
      { once: true }
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export class InMemoryProviderHealthStore implements ProviderHealthStore {
  readonly #states = new Map<
    string,
    {
      consecutiveFailures: number;
      lastFailureAt?: number;
      disabledUntil?: number;
    }
  >();

  constructor(
    private readonly config: {
      disableAfterFailures: number;
      disableForMs: number;
    } = { disableAfterFailures: 3, disableForMs: 60_000 }
  ) {}

  snapshot(providerId: string): ProviderHealthSnapshot {
    const state = this.#states.get(providerId);
    const consecutiveFailures = state?.consecutiveFailures ?? 0;
    const lastFailureAt = state?.lastFailureAt;
    const disabledUntil = state?.disabledUntil;
    const now = Date.now();
    const ok = disabledUntil ? disabledUntil <= now : true;
    return { ok, consecutiveFailures, lastFailureAt, disabledUntil };
  }

  recordSuccess(providerId: string): void {
    this.#states.set(providerId, { consecutiveFailures: 0 });
  }

  recordFailure(providerId: string): void {
    const existing = this.#states.get(providerId);
    const consecutiveFailures = (existing?.consecutiveFailures ?? 0) + 1;
    const lastFailureAt = Date.now();
    const disable =
      consecutiveFailures >= this.config.disableAfterFailures
        ? lastFailureAt + this.config.disableForMs
        : existing?.disabledUntil;

    this.#states.set(providerId, {
      consecutiveFailures,
      lastFailureAt,
      disabledUntil: disable,
    });
  }
}

export class InMemoryRateLimiter implements RateLimiter {
  readonly #chains = new Map<string, Promise<void>>();
  readonly #lastAt = new Map<string, number>();

  constructor(private readonly config: { minIntervalMs: number } = { minIntervalMs: 250 }) {}

  wait(providerId: string, options?: { signal?: AbortSignal }): Promise<void> {
    const previous = this.#chains.get(providerId) ?? Promise.resolve();

    const next = previous
      .catch(() => undefined)
      .then(async () => {
        const lastAt = this.#lastAt.get(providerId) ?? 0;
        const now = Date.now();
        const waitMs = Math.max(0, lastAt + this.config.minIntervalMs - now);
        if (waitMs > 0) await sleep(waitMs, options?.signal);
        this.#lastAt.set(providerId, Date.now());
      });

    this.#chains.set(providerId, next);
    return next;
  }
}

export type JobSourceRouterConfig = {
  providers: ProviderAdapter[];
  providerPriority?: Partial<Record<Platform, string[]>>;
  healthStore?: ProviderHealthStore;
  rateLimiter?: RateLimiter;
  timeoutMs?: number;
  maxAttempts?: number;
};

export const createJobSourceRouter = (config: JobSourceRouterConfig): JobSourceRouter => {
  const providersById = new Map(config.providers.map((p) => [p.id, p]));
  const healthStore = config.healthStore ?? new InMemoryProviderHealthStore();
  const rateLimiter = config.rateLimiter ?? new InMemoryRateLimiter();
  const defaultTimeoutMs = config.timeoutMs ?? 30_000;
  const defaultMaxAttempts = config.maxAttempts ?? 2;

  const orderedProvidersForPlatform = (platform: Platform): ProviderAdapter[] => {
    const declaredOrder = config.providerPriority?.[platform];
    const supports = config.providers.filter((p) => p.platforms.includes(platform));

    if (!declaredOrder || declaredOrder.length === 0) return supports;

    const ordered: ProviderAdapter[] = [];
    for (const providerId of declaredOrder) {
      const provider = providersById.get(providerId);
      if (!provider) continue;
      if (!provider.platforms.includes(platform)) continue;
      ordered.push(provider);
    }

    const orderedIds = new Set(ordered.map((p) => p.id));
    for (const provider of supports) {
      if (!orderedIds.has(provider.id)) ordered.push(provider);
    }

    return ordered;
  };

  const search = async (
    platform: Platform,
    queryPlan: QueryPlan,
    options?: RouterSearchOptions
  ): Promise<RawJob[]> => {
    const request: RouterSearchRequest = { platform, queryPlan };
    const timeoutMs = options?.timeoutMs ?? defaultTimeoutMs;
    const maxAttempts = options?.maxAttempts ?? defaultMaxAttempts;

    const errors: unknown[] = [];
    const candidates = orderedProvidersForPlatform(platform);

    for (const provider of candidates) {
      const health = healthStore.snapshot(provider.id);
      if (!health.ok) continue;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await rateLimiter.wait(provider.id, { signal: options?.signal });
          const results = await withTimeout(
            provider.search(request, options),
            timeoutMs,
            options?.signal
          );
          healthStore.recordSuccess(provider.id);
          return results.map((job) => ({
            ...job,
            platform,
            provider: job.provider || provider.id,
            fetchedAt: job.fetchedAt || new Date().toISOString(),
          }));
        } catch (error) {
          healthStore.recordFailure(provider.id);
          errors.push({ providerId: provider.id, attempt, error });
          if (attempt < maxAttempts) await sleep(250 * attempt, options?.signal);
        }
      }
    }

    throw new AggregateError(errors, `Job Source Router: all providers failed for ${platform}`);
  };

  return { search };
};

