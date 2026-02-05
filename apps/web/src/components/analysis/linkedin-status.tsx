"use client"

import { Linkedin, CheckCircle, Loader2, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

type LinkedinStatusProps = {
  status: "enriching" | "completed" | "failed" | null
}

export function LinkedinStatus({ status }: LinkedinStatusProps) {
  if (!status) return null

  const statusConfig = {
    enriching: {
      icon: Loader2,
      iconClass: "size-4 text-blue-500 animate-spin",
      text: "Enriching profile from LinkedIn...",
      cardClass: "border-blue-500/20 bg-blue-500/5",
    },
    completed: {
      icon: CheckCircle,
      iconClass: "size-4 text-success",
      text: "LinkedIn profile imported successfully",
      cardClass: "border-success/20 bg-success/5",
    },
    failed: {
      icon: XCircle,
      iconClass: "size-4 text-red-500",
      text: "LinkedIn import failed. You can add details manually.",
      cardClass: "border-red-500/20 bg-red-500/5",
    },
  }

  const config = statusConfig[status]

  return (
    <Card className={config.cardClass}>
      <CardContent className="flex items-center gap-3 p-4">
        <Linkedin className="size-5 text-[#0A66C2]" />
        <span className="flex-1 text-sm">{config.text}</span>
        <config.icon className={config.iconClass} />
      </CardContent>
    </Card>
  )
}
