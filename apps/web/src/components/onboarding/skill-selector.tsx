"use client"

import { useState, useCallback, useRef, useMemo } from "react"
import { X, Plus, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const COMMON_SKILLS = [
  // Languages
  "JavaScript", "TypeScript", "Python", "Java", "C#", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "C++",
  // Frontend
  "React", "Next.js", "Vue.js", "Angular", "Svelte", "Tailwind CSS", "HTML/CSS",
  // Backend
  "Node.js", "Express", "Django", "FastAPI", "Spring Boot", "Laravel", ".NET", "Ruby on Rails",
  // Data & AI
  "PostgreSQL", "MongoDB", "MySQL", "Redis", "GraphQL", "REST APIs", "Machine Learning", "LLMs/AI",
  // Cloud & DevOps
  "AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "CI/CD", "Terraform",
  // Mobile
  "React Native", "Flutter", "iOS", "Android",
  // Design & Other
  "Figma", "UI/UX Design", "Agile/Scrum", "Git", "Linux",
]

type SkillSelectorProps = {
  skills: string[]
  onChange: (skills: string[]) => void
  onSubmit: (skills: string[]) => void
}

export function SkillSelector({ skills, onChange, onSubmit }: SkillSelectorProps) {
  const [input, setInput] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredSuggestions = useMemo(() => {
    const query = input.trim().toLowerCase()
    const selected = new Set(skills.map((s) => s.toLowerCase()))
    return COMMON_SKILLS.filter(
      (s) => !selected.has(s.toLowerCase()) && (query === "" || s.toLowerCase().includes(query))
    )
  }, [input, skills])

  const addSkill = useCallback((name?: string) => {
    const trimmed = (name ?? input).trim()
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
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addSkill()
                setShowSuggestions(false)
              }
              if (e.key === "Escape") {
                setShowSuggestions(false)
              }
            }}
            placeholder="Type or pick from common skills..."
            className="text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSuggestions((v) => !v)}
            className="shrink-0 px-2"
            aria-label="Show common skills"
          >
            <ChevronDown className={`size-3.5 transition-transform ${showSuggestions ? "rotate-180" : ""}`} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addSkill()}
            disabled={!input.trim()}
            className="shrink-0"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>

        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 bottom-full z-10 mb-1 max-h-48 overflow-y-auto rounded-lg border border-border/50 bg-popover p-1.5 shadow-md">
            <div className="flex flex-wrap gap-1">
              {filteredSuggestions.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => {
                    addSkill(skill)
                    setShowSuggestions(true)
                  }}
                  className="rounded-full border border-border/40 bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/30 hover:bg-accent"
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        )}
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
          onClick={() => {
            setShowSuggestions(false)
            onSubmit(skills)
          }}
          className="w-full"
        >
          Confirm {skills.length} skill{skills.length !== 1 ? "s" : ""}
        </Button>
      )}
    </div>
  )
}
