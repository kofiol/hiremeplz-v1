"use client"

import { Badge } from "@/components/ui/badge"

export default function CVBuilderPage() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 overflow-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="shrink-0 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Badge variant="outline">BETA</Badge>
          </div>
          <h1 className="mb-3 text-3xl font-medium tracking-tight lg:text-4xl">
            CV Builder
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
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
