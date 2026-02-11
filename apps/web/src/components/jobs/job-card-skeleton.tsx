import { Skeleton } from "@/components/ui/skeleton"

export function JobCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4">
      <div className="flex gap-3">
        {/* Logo */}
        <Skeleton className="size-10 shrink-0 rounded-lg" />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-10 rounded-md" />
          </div>

          {/* Summary */}
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />

          {/* Tags */}
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-18 rounded-full" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}
