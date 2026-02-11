// ============================================================================
// In-Memory Sliding Window Rate Limiter
// ============================================================================

interface WindowEntry {
  count: number
  timestamp: number
}

interface RateLimitStore {
  current: WindowEntry
  previous: WindowEntry
}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterMs: number
}

const store = new Map<string, RateLimitStore>()

// Auto-cleanup stale entries every 60s
const CLEANUP_INTERVAL_MS = 60_000
const STALE_THRESHOLD_MS = 30 * 60_000

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now - entry.current.timestamp > STALE_THRESHOLD_MS) {
      store.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS).unref()

// ---------------------------------------------------------------------------
// Preset configs
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  onboardingChat: { maxRequests: 15, windowMs: 60_000 },
  overviewChat: { maxRequests: 10, windowMs: 60_000 },
  proposalsGenerate: { maxRequests: 5, windowMs: 60_000 },
  cvBuilderChat: { maxRequests: 10, windowMs: 60_000 },
  cvBuilderGenerate: { maxRequests: 3, windowMs: 5 * 60_000 },
  interviewPrepSession: { maxRequests: 3, windowMs: 15 * 60_000 },
  interviewPrepAnalyze: { maxRequests: 3, windowMs: 5 * 60_000 },
  profileAnalysis: { maxRequests: 2, windowMs: 10 * 60_000 },
  onboardingTranscribe: { maxRequests: 10, windowMs: 60_000 },
  jobFetch: { maxRequests: 5, windowMs: 3_600_000 },
  jobEnrichment: { maxRequests: 3, windowMs: 3_600_000 },
} as const satisfies Record<string, RateLimitConfig>

// ---------------------------------------------------------------------------
// Core check — sliding window counter (O(1), synchronous)
// ---------------------------------------------------------------------------

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now()
  const { maxRequests, windowMs } = config
  const key = `${identifier}:${config.maxRequests}:${config.windowMs}`

  const currentWindowStart = Math.floor(now / windowMs) * windowMs
  let entry = store.get(key)

  if (!entry) {
    entry = {
      current: { count: 0, timestamp: currentWindowStart },
      previous: { count: 0, timestamp: currentWindowStart - windowMs },
    }
    store.set(key, entry)
  }

  // Rotate windows if we've moved to a new one
  if (entry.current.timestamp < currentWindowStart) {
    if (entry.current.timestamp === currentWindowStart - windowMs) {
      entry.previous = { ...entry.current }
    } else {
      entry.previous = { count: 0, timestamp: currentWindowStart - windowMs }
    }
    entry.current = { count: 0, timestamp: currentWindowStart }
  }

  // Sliding window interpolation
  const elapsed = now - currentWindowStart
  const weight = 1 - elapsed / windowMs
  const estimatedCount =
    Math.floor(entry.previous.count * weight) + entry.current.count

  if (estimatedCount >= maxRequests) {
    const retryAfterMs = Math.ceil(windowMs - elapsed)
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      retryAfterMs,
    }
  }

  entry.current.count++

  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - estimatedCount - 1,
    retryAfterMs: 0,
  }
}

// ---------------------------------------------------------------------------
// Response helper — returns a 429 with standard headers
// ---------------------------------------------------------------------------

export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000)
  return Response.json(
    {
      error: {
        code: "rate_limit_exceeded",
        message: `Too many requests. Please retry after ${retryAfterSeconds} seconds.`,
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  )
}
