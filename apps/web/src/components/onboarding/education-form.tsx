"use client"

import { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

type EducationEntry = {
  school: string
  degree: string
  field: string
  startYear: string
  endYear: string
}

type EducationFormProps = {
  onSubmit: (entries: EducationEntry[]) => void
}

const EMPTY_ENTRY: EducationEntry = {
  school: "",
  degree: "",
  field: "",
  startYear: "",
  endYear: "",
}

export function EducationForm({ onSubmit }: EducationFormProps) {
  const [entries, setEntries] = useState<EducationEntry[]>([{ ...EMPTY_ENTRY }])

  const updateEntry = useCallback((index: number, field: keyof EducationEntry, value: string) => {
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

  const hasValidEntry = entries.some((e) => e.school.trim())

  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-card/80 p-3">
      {entries.map((entry, i) => (
        <div key={i} className="space-y-2">
          {i > 0 && <hr className="border-border/30" />}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Education {i + 1}
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
          <div>
            <Label className="text-xs">School *</Label>
            <Input
              value={entry.school}
              onChange={(e) => updateEntry(i, "school", e.target.value)}
              placeholder="MIT"
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Degree</Label>
              <Input
                value={entry.degree}
                onChange={(e) => updateEntry(i, "degree", e.target.value)}
                placeholder="B.Sc."
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Field</Label>
              <Input
                value={entry.field}
                onChange={(e) => updateEntry(i, "field", e.target.value)}
                placeholder="Computer Science"
                className="text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start Year</Label>
              <Input
                value={entry.startYear}
                onChange={(e) => updateEntry(i, "startYear", e.target.value)}
                placeholder="2018"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">End Year</Label>
              <Input
                value={entry.endYear}
                onChange={(e) => updateEntry(i, "endYear", e.target.value)}
                placeholder="2022"
                className="text-sm"
              />
            </div>
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
          <Plus className="size-3" /> Add Education
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onSubmit(entries.filter((e) => e.school.trim()))}
          disabled={!hasValidEntry}
          className="flex-1"
        >
          Confirm Education
        </Button>
      </div>
    </div>
  )
}
