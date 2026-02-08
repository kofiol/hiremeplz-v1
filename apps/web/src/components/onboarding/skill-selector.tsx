"use client"

import { useState, useCallback, useRef, useMemo } from "react"
import { X, ChevronDown, Mic, ArrowUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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
  onVoiceClick?: () => void
  voiceSupported?: boolean
}

export function SkillSelector({ skills, onChange, onSubmit, onVoiceClick, voiceSupported }: SkillSelectorProps) {
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

  const handleSubmit = useCallback(() => {
    if (skills.length === 0) return
    setShowSuggestions(false)
    onSubmit(skills)
  }, [skills, onSubmit])

  return (
    <div className="space-y-2">
      {/* Selected skills */}
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

      {/* Suggestions dropdown (above input) */}
      <div className="relative">
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

        {/* Input matching PromptInput style */}
        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.08)] focus-within:border-border">
          <input
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
                if (input.trim()) {
                  addSkill()
                } else if (skills.length > 0) {
                  handleSubmit()
                }
                setShowSuggestions(false)
              }
              if (e.key === "Escape") {
                setShowSuggestions(false)
              }
            }}
            placeholder="Type or pick from common skills..."
            className="min-h-10 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />

          {/* Dropdown toggle */}
          <button
            type="button"
            onClick={() => setShowSuggestions((v) => !v)}
            className={cn(
              "flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              showSuggestions && "bg-accent text-foreground"
            )}
            aria-label="Show common skills"
          >
            <ChevronDown className={cn("size-4 transition-transform", showSuggestions && "rotate-180")} />
          </button>

          {/* Voice button */}
          {voiceSupported && onVoiceClick && (
            <button
              type="button"
              onClick={onVoiceClick}
              className="flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Record voice message"
            >
              <Mic className="size-4" />
            </button>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={skills.length === 0}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg transition-colors",
              skills.length > 0
                ? "bg-accent text-accent-foreground hover:bg-accent/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            aria-label="Submit skills"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
