"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { SettingsDialog } from "@/components/settings-dialog"

export default function SettingsPage() {
  const router = useRouter()
  const [open, setOpen] = React.useState(true)

  React.useEffect(() => {
    if (open) return
    router.replace("/overview")
  }, [open, router])

  return <SettingsDialog open={open} onOpenChange={setOpen} trigger={null} />
}
