"use client"

import * as React from "react"
import { BarChart3, FileText, Home, MessageSquare, Rocket, Search, Settings, Star, Users, Wallet, Command } from "lucide-react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { SettingsDialog } from "@/components/settings-dialog"
import { useSession } from "@/app/auth/session-provider"
import { useUserPlan } from "@/hooks/use-user-plan"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
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

const navWork = [
  { title: "Home", url: "/overview", icon: Home },
  { title: "Jobs", url: "/jobs", icon: Search },
  { title: "Applications", url: "/applications", icon: Rocket },
  { title: "Cover Letters", url: "/cover-letters", icon: FileText },
]

const navComms = [
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Feedback", url: "/feedback", icon: Star },
]

const navInsights = [
  { title: "Earnings", url: "/earnings", icon: Wallet },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
]

const navTeam = [{ title: "Team", url: "/team", icon: Users }]

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
    <Sidebar collapsible="icon" variant="sidebar"
     {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/overview">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{resolvedName}</span>
                  <span className="truncate text-xs">{planLabel}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Work" items={navWork} />
        <NavMain label="Comms" items={navComms} />
        <NavMain label="Insights" items={navInsights} />
        <NavMain label="Team" items={navTeam} />
        <div className="mt-auto">
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SettingsDialog
                  trigger={
                    <SidebarMenuButton tooltip="Settings">
                      <Settings className="size-4" />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
