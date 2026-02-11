"use client"

import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { JobCard } from "./job-card"
import { JobCardSkeleton } from "./job-card-skeleton"
import type { Job } from "@/lib/jobs/types"

type JobFeedProps = {
  jobs: Job[]
  isLoading: boolean
  hasMore: boolean
  onSelectJob: (job: Job) => void
  onToggleBookmark: (jobId: string) => void
  onLoadMore: () => void
}

export function JobFeed({
  jobs,
  isLoading,
  hasMore,
  onSelectJob,
  onToggleBookmark,
  onLoadMore,
}: JobFeedProps) {
  if (isLoading && jobs.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <SearchX className="size-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-sm">No jobs found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Try adjusting your filters or fetch new jobs to see more opportunities.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onSelect={onSelectJob}
          onToggleBookmark={onToggleBookmark}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2 pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  )
}
