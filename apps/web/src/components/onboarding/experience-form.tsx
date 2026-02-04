"use client"

import { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"

type ExperienceEntry = {
  title: string
  company: string
  startDate: string
  endDate: string
  highlights: string
}

type ExperienceFormProps = {
  onSubmit: (entries: ExperienceEntry[]) => void
}

const EMPTY_ENTRY: ExperienceEntry = {
  title: "",
  company: "",
  startDate: "",
  endDate: "",
  highlights: "",
}

export function ExperienceForm({ onSubmit }: ExperienceFormProps) {
  const [entries, setEntries] = useState<ExperienceEntry[]>([{ ...EMPTY_ENTRY }])

  const updateEntry = useCallback((index: number, field: keyof ExperienceEntry, value: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    )
  }, [])

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, { ...EMPTY_ENTRY }])
  }, [])

  const removeEntry = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const hasValidEntry = entries.some((e) => e.title.trim())

  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-card/80 p-3">
      {entries.map((entry, i) => (
        <div key={i} className="space-y-2">
          {i > 0 && <hr className="border-border/30" />}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Position {i + 1}
            </span>
            {entries.length > 1 && (
              <button
                type="button"
                onClick={() => removeEntry(i)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={entry.title}
                onChange={(e) => updateEntry(i, "title", e.target.value)}
                placeholder="Software Engineer"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Company</Label>
              <Input
                value={entry.company}
                onChange={(e) => updateEntry(i, "company", e.target.value)}
                placeholder="Acme Corp"
                className="text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input
                value={entry.startDate}
                onChange={(e) => updateEntry(i, "startDate", e.target.value)}
                placeholder="Jan 2022"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input
                value={entry.endDate}
                onChange={(e) => updateEntry(i, "endDate", e.target.value)}
                placeholder="Present"
                className="text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Key Highlights</Label>
            <Textarea
              value={entry.highlights}
              onChange={(e) => updateEntry(i, "highlights", e.target.value)}
              placeholder="Led a team of 5, built microservices..."
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEntry}
          className="gap-1"
        >
          <Plus className="size-3" /> Add Position
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onSubmit(entries.filter((e) => e.title.trim()))}
          disabled={!hasValidEntry}
          className="flex-1"
        >
          Confirm Experience
        </Button>
      </div>
    </div>
  )
}
