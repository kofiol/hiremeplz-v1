"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Play, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react"
import { useSession } from "@/app/auth/session-provider"

interface Query {
  keyword: string
  location: string
  country: string
  time_range: string
}

interface FetchResponse {
  runId: string
  triggerRunId: string
  queries: Query[]
  reasoning: string
}

interface StatusResponse {
  runId: string
  status: string
  outputs: Record<string, unknown> | null
  error: string | null
  startedAt: string | null
  finishedAt: string | null
}

type LogEntry = {
  time: string
  message: string
  type: "info" | "success" | "error" | "warn"
}

export default function TestJobFetchPage() {
  const { session, isLoading: isSessionLoading } = useSession()
  const [isFetching, setIsFetching] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [fetchResult, setFetchResult] = useState<FetchResponse | null>(null)
  const [statusResult, setStatusResult] = useState<StatusResponse | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const log = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString(), message, type },
    ])
  }, [])

  const getToken = useCallback(() => {
    return session?.access_token
  }, [session?.access_token])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleFetchJobs = async () => {
    const token = getToken()
    if (!token) {
      log("No auth token — are you logged in?", "error")
      return
    }

    setIsFetching(true)
    setFetchResult(null)
    setStatusResult(null)
    setLogs([])
    log("Calling POST /api/v1/jobs/fetch...")

    try {
      const res = await fetch("/api/v1/jobs/fetch", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()

      if (!res.ok) {
        log(`API error ${res.status}: ${JSON.stringify(data.error)}`, "error")
        return
      }

      setFetchResult(data)
      log(`Run created: ${data.runId}`, "success")
      log(`Trigger run: ${data.triggerRunId}`, "info")
      log(`Generated ${data.queries.length} search queries`, "info")
      data.queries.forEach((q: Query, i: number) => {
        log(`  Query ${i + 1}: "${q.keyword}" in ${q.location} (${q.time_range})`, "info")
      })
      log("Starting status polling (every 5s)...", "info")

      // Start polling
      startPolling(data.runId)
    } catch (err) {
      log(`Network error: ${err instanceof Error ? err.message : String(err)}`, "error")
    } finally {
      setIsFetching(false)
    }
  }

  const startPolling = useCallback(
    (runId: string) => {
      if (pollRef.current) clearInterval(pollRef.current)

      setIsPolling(true)
      let pollCount = 0
      const maxPolls = 120 // 10 minutes at 5s intervals

      const poll = async () => {
        pollCount++
        const token = getToken()
        if (!token) {
          log("Token expired during polling", "error")
          stopPolling()
          return
        }

        try {
          const res = await fetch(`/api/v1/jobs/fetch/status?runId=${runId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })

          const data: StatusResponse = await res.json()

          if (!res.ok) {
            log(`Status poll error: ${JSON.stringify(data)}`, "error")
            return
          }

          setStatusResult(data)

          if (data.status === "succeeded") {
            log(`Run succeeded!`, "success")
            if (data.outputs) {
              const out = data.outputs as Record<string, unknown>
              log(`  Jobs fetched: ${out.jobs_fetched ?? out.jobsFetched ?? "?"}`, "success")
              log(`  Jobs new: ${out.jobs_new ?? out.jobsNew ?? "?"}`, "success")
              log(`  Jobs skipped: ${out.jobs_skipped ?? out.jobsSkipped ?? "?"}`, "info")
            }
            if (data.finishedAt) {
              const elapsed = Math.round(
                (new Date(data.finishedAt).getTime() - new Date(data.startedAt!).getTime()) / 1000
              )
              log(`  Duration: ${elapsed}s`, "info")
            }
            stopPolling()
          } else if (data.status === "failed") {
            log(`Run failed: ${data.error || "Unknown error"}`, "error")
            stopPolling()
          } else {
            if (pollCount % 6 === 0) {
              log(`Still ${data.status}... (${pollCount * 5}s elapsed)`, "warn")
            }
          }
        } catch (err) {
          log(`Poll error: ${err instanceof Error ? err.message : String(err)}`, "error")
        }

        if (pollCount >= maxPolls) {
          log("Polling timed out after 10 minutes", "error")
          stopPolling()
        }
      }

      // Poll immediately, then every 5s
      poll()
      pollRef.current = setInterval(poll, 5000)
    },
    [getToken, log]
  )

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setIsPolling(false)
  }, [])

  const handleCheckStatus = async () => {
    const token = getToken()
    if (!token) {
      log("No auth token", "error")
      return
    }

    const runId = fetchResult?.runId
    log(`Checking status${runId ? ` for ${runId}` : " (latest run)"}...`)

    try {
      const url = runId
        ? `/api/v1/jobs/fetch/status?runId=${runId}`
        : "/api/v1/jobs/fetch/status"
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (!res.ok) {
        log(`Status error: ${JSON.stringify(data.error)}`, "error")
        return
      }

      setStatusResult(data)
      log(`Status: ${data.status}`, data.status === "succeeded" ? "success" : "info")
      if (data.outputs) {
        log(`Outputs: ${JSON.stringify(data.outputs)}`, "info")
      }
    } catch (err) {
      log(`Network error: ${err instanceof Error ? err.message : String(err)}`, "error")
    }
  }

  const statusIcon = statusResult?.status === "succeeded" ? (
    <CheckCircle2 className="size-5 text-green-500" />
  ) : statusResult?.status === "failed" ? (
    <XCircle className="size-5 text-red-500" />
  ) : statusResult?.status ? (
    <Clock className="size-5 text-yellow-500 animate-pulse" />
  ) : null

  if (isSessionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Fetch Test</h1>
        <p className="text-muted-foreground">
          Test the job ingestion pipeline: AI query generation → BrightData scraping → normalization → DB upsert
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Controls</CardTitle>
          <CardDescription>
            Click &quot;Fetch Jobs&quot; to trigger the full pipeline. Status auto-polls every 5s.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={handleFetchJobs}
            disabled={isFetching || isPolling}
          >
            {isFetching ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Play className="mr-2 size-4" />
            )}
            {isFetching ? "Triggering..." : "Fetch Jobs"}
          </Button>

          <Button
            variant="outline"
            onClick={handleCheckStatus}
            disabled={isFetching}
          >
            <RefreshCw className="mr-2 size-4" />
            Check Status
          </Button>

          {isPolling && (
            <Button variant="ghost" onClick={stopPolling}>
              Stop Polling
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Status Card */}
      {statusResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {statusIcon}
              <div>
                <CardTitle className="text-lg">
                  Run Status: {statusResult.status}
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  {statusResult.runId}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Started:</span>{" "}
                {statusResult.startedAt
                  ? new Date(statusResult.startedAt).toLocaleString()
                  : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Finished:</span>{" "}
                {statusResult.finishedAt
                  ? new Date(statusResult.finishedAt).toLocaleString()
                  : "—"}
              </div>
            </div>
            {statusResult.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                {statusResult.error}
              </div>
            )}
            {statusResult.outputs && (
              <div className="rounded-md bg-muted p-3">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(statusResult.outputs, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Queries Card */}
      {fetchResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generated Queries</CardTitle>
            <CardDescription>{fetchResult.reasoning}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fetchResult.queries.map((q, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border p-3">
                <Badge variant="outline" className="shrink-0">
                  Q{i + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{q.keyword}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.location} · {q.country} · {q.time_range}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Log</CardTitle>
            {isPolling && (
              <Badge variant="secondary" className="animate-pulse">
                Polling...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80 rounded-md border bg-black/95 p-4">
            {logs.length === 0 ? (
              <p className="text-zinc-500 text-sm font-mono">
                Click &quot;Fetch Jobs&quot; to start...
              </p>
            ) : (
              <div className="space-y-1 font-mono text-xs">
                {logs.map((entry, i) => (
                  <div
                    key={i}
                    className={
                      entry.type === "error"
                        ? "text-red-400"
                        : entry.type === "success"
                          ? "text-green-400"
                          : entry.type === "warn"
                            ? "text-yellow-400"
                            : "text-zinc-300"
                    }
                  >
                    <span className="text-zinc-600">[{entry.time}]</span>{" "}
                    {entry.message}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
    </ScrollArea>
  )
}
