"use client"

import * as React from "react"
import { Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SettingsPanel } from "@/components/settings-panel"

export function SettingsDialog({
  trigger,
  open: openProp,
  onOpenChange,
}: {
  trigger?: React.ReactNode | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = openProp ?? uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (onOpenChange) {
        onOpenChange(next)
      } else {
        setUncontrolledOpen(next)
      }
    },
    [onOpenChange],
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger === null ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm">
              <Settings className="size-4" />
              <span>Settings</span>
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-[780px]">
        <div className="max-h-[80vh] overflow-y-auto">
          <SettingsPanel
            enabled={open}
            showCancel
            onCancel={() => setOpen(false)}
            onSaveSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
