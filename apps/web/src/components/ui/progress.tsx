"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type ProgressProps = React.ComponentProps<"div"> & {
  value?: number
}

function Progress({ className, value = 0, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value ?? 0))

  return (
    <div
      data-slot="progress"
      className={cn(
        "bg-muted relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <div
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(${clamped - 100}%)` }}
      />
    </div>
  )
}

export { Progress }

