"use client"

import { useState, useMemo, useCallback } from "react"
import {
  validateLinkedinUrl,
  normalizeLinkedinUrl,
} from "@/hooks/use-linkedin-popup"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Check, CheckCircle, Linkedin } from "lucide-react"

type LinkedinDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (url: string) => void
}

export function LinkedinDialog({ open, onOpenChange, onSubmit }: LinkedinDialogProps) {
  const [url, setUrl] = useState("")
  const validation = useMemo(() => validateLinkedinUrl(url), [url])

  const handleSubmit = useCallback(() => {
    if (!validation.isValid) return
    const normalizedUrl = normalizeLinkedinUrl(url)
    onSubmit(normalizedUrl)
    setUrl("")
  }, [url, validation.isValid, onSubmit])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="size-5 text-[#0A66C2]" />
            Import from LinkedIn
          </DialogTitle>
          <DialogDescription>
            Enter your LinkedIn profile URL to import your professional information.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="linkedin-url">Profile URL</Label>
            <Input
              id="linkedin-url"
              type="url"
              placeholder="https://linkedin.com/in/yourprofile"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && validation.isValid) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              className={validation.error ? "border-red-500 focus-visible:ring-red-500/20" : ""}
              autoFocus
            />
          </div>
          {validation.error && (
            <p className="text-sm text-red-500">{validation.error}</p>
          )}
          {url.trim() && validation.isValid && (
            <p className="text-sm text-green-600 flex items-center gap-1.5">
              <CheckCircle className="size-3.5" />
              Valid LinkedIn profile URL
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setUrl("")
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!validation.isValid}
            className="gap-2"
          >
            <Check className="size-4" />
            Import Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
