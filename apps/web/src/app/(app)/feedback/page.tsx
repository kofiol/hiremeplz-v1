"use client"

export default function FeedbackPage() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Feedback
          </h1>
          <p className="text-muted-foreground">
            Share your thoughts and help us improve hireMePlz.
          </p>
        </div>

        {/* Content placeholder */}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Feedback form coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
