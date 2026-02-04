"use client"

import { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type RateInputProps = {
  label: string
  currency: string
  onSubmit: (min: number | null, max: number | null, currency: string) => void
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"]

export function RateInput({ label, currency: initialCurrency, onSubmit }: RateInputProps) {
  const [min, setMin] = useState("")
  const [max, setMax] = useState("")
  const [currency, setCurrency] = useState(initialCurrency || "USD")

  const handleSubmit = useCallback(() => {
    const minVal = min ? parseFloat(min) : null
    const maxVal = max ? parseFloat(max) : null
    if (minVal == null && maxVal == null) return
    onSubmit(minVal, maxVal, currency)
  }, [min, max, currency, onSubmit])

  const hasValue = min.trim() !== "" || max.trim() !== ""

  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-card/80 p-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-20 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder="Min"
          className="text-sm"
          min={0}
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="number"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          placeholder="Max"
          className="text-sm"
          min={0}
        />
        <span className="shrink-0 text-sm text-muted-foreground">/hr</span>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleSubmit}
        disabled={!hasValue}
        className="w-full"
      >
        Confirm Rate
      </Button>
    </div>
  )
}
