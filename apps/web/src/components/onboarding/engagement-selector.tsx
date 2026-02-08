"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

type EngagementSelectorProps = {
  onSubmit: (types: ("full_time" | "part_time")[]) => void
}

const OPTIONS: { value: "full_time" | "part_time"; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
]

export function EngagementSelector({ onSubmit }: EngagementSelectorProps) {
  const [selected, setSelected] = useState<Set<"full_time" | "part_time">>(new Set())

  const toggle = useCallback((value: "full_time" | "part_time") => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }, [])

  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-card/80 p-3">
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              selected.has(opt.value)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 bg-card text-foreground hover:bg-accent"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() => onSubmit(Array.from(selected))}
        disabled={selected.size === 0}
        className="w-full"
      >
        Confirm
      </Button>
    </div>
  )
}
