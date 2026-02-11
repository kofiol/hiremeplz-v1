"use client"

export default function PipelinePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <div className="text-4xl">📋</div>
      <h1 className="text-lg font-medium">Application Pipeline</h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        Track your applications from shortlist to offer. Drag between stages,
        add notes, and set follow-up reminders.
      </p>
    </div>
  )
}
