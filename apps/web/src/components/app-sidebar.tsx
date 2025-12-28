"use client"

import * as React from "react"
import { BarChart3, FileText, Home, MessageSquare, Rocket, Search, Settings, Star, Users, Wallet, Command } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useSession } from "@/app/auth/session-provider"
import { useUserPlan } from "@/hooks/use-user-plan"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

function getPlanLabel(plan: string | null) {
  if (!plan) return "Unknown plan"
  if (plan === "trial") return "Trial"
  if (plan === "solo_pro") return "Solo Pro"
  if (plan === "team_pro") return "Team Pro"
  return plan
}

const navMain = [
  { title: "Overview", url: "/overview", icon: Home },
  { title: "Jobs", url: "/jobs", icon: Search },
  { title: "Applications", url: "/applications", icon: Rocket },
  { title: "Cover Letters", url: "/cover-letters", icon: FileText },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Feedback", url: "/feedback", icon: Star },
  { title: "Earnings", url: "/earnings", icon: Wallet },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Team", url: "/team", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session } = useSession()
  const { plan, displayName, email, isLoading } = useUserPlan()
  const planLabel = isLoading ? "Loading plan" : getPlanLabel(plan)
  const emailFromSession = session?.user?.email ?? null
  const userNameFromSession =
    (session?.user?.user_metadata?.full_name as string | undefined) ??
    (session?.user?.user_metadata?.name as string | undefined) ??
    (session?.user?.user_metadata?.display_name as string | undefined) ??
    null
  const avatarUrlFromSession =
    (session?.user?.user_metadata?.avatar_url as string | undefined) ??
    (session?.user?.user_metadata?.picture as string | undefined) ??
    null
  const resolvedEmail = email ?? emailFromSession ?? ""
  const resolvedName =
    displayName ?? userNameFromSession ?? resolvedEmail ?? "Account"

  const user = React.useMemo(
    () => ({
      name: resolvedName,
      email: resolvedEmail,
      avatarUrl: avatarUrlFromSession,
    }),
    [avatarUrlFromSession, resolvedEmail, resolvedName]
  )

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/overview">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{resolvedName}</span>
                  <span className="truncate text-xs">{planLabel}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
