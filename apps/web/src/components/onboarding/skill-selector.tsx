"use client"

import { useState, useCallback, useRef } from "react"
import { X, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type SkillSelectorProps = {
  skills: string[]
  onChange: (skills: string[]) => void
  onSubmit: (skills: string[]) => void
}

export function SkillSelector({ skills, onChange, onSubmit }: SkillSelectorProps) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const addSkill = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setInput("")
      return
    }
    const next = [...skills, trimmed]
    onChange(next)
    setInput("")
    inputRef.current?.focus()
  }, [input, skills, onChange])

  const removeSkill = useCallback(
    (skill: string) => {
      const next = skills.filter((s) => s !== skill)
      onChange(next)
    },
    [skills, onChange]
  )

  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-card/80 p-3">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addSkill()
            }
          }}
          placeholder="Type a skill and press Enter..."
          className="text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSkill}
          disabled={!input.trim()}
          className="shrink-0"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="gap-1 pr-1">
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {skills.length > 0 && (
        <Button
          type="button"
          size="sm"
          onClick={() => onSubmit(skills)}
          className="w-full"
        >
          Confirm {skills.length} skill{skills.length !== 1 ? "s" : ""}
        </Button>
      )}
    </div>
  )
}
