"use client"

import { Badge } from "@/components/ui/badge"

export default function CVBuilderPage() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 overflow-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="shrink-0">
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              CV Builder
            </h1>
            <Badge variant="secondary" className="text-xs font-semibold uppercase">
              BETA
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Generate a professional CV from your profile data.
          </p>
        </div>

        {/* Content placeholder */}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">CV Builder coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
