"use client"

import * as React from "react"
import { FileText, Home, Settings, PanelLeft, Mic, PenLine, User, MessageSquare } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const navMain = [
  { title: "Overview", url: "/overview", icon: Home },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Interview Prep", url: "/interview-prep", icon: Mic, badge: "BETA" },
  { title: "CV Builder", url: "/cv-builder", icon: FileText, badge: "BETA" },
  { title: "Proposal Writer", url: "/proposal-writer", icon: PenLine, badge: "BETA" },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session } = useSession()
  const { displayName, email, isLoading } = useUserPlan()
  const { state, toggleSidebar } = useSidebar()
  const pathname = usePathname()
  const isCollapsed = state === "collapsed"
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
  const subtitle = isLoading ? "Loading..." : resolvedEmail

  const user = React.useMemo(
    () => ({
      name: resolvedName,
      email: resolvedEmail,
      avatarUrl: avatarUrlFromSession,
    }),
    [avatarUrlFromSession, resolvedEmail, resolvedName]
  )

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {isCollapsed ? (
              // When collapsed: show only the toggle button centered
              <div className="flex items-center justify-center py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="size-8"
                >
                  <PanelLeft className="size-4" />
                </Button>
              </div>
            ) : (
              // When expanded: show logo + name + toggle button in a row
              <SidebarMenuButton size="lg" asChild>
                <div className="flex w-full items-center">
                  <Link href="/overview" className="flex flex-1 items-center gap-2">
                    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                      <div className="size-4 rounded bg-sidebar-primary-foreground" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{resolvedName}</span>
                      <span className="truncate text-xs">{subtitle}</span>
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleSidebar()
                    }}
                    className="size-8 shrink-0"
                  >
                    <PanelLeft className="size-4" />
                  </Button>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="App" items={navMain} />
        <div className="mt-auto">
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings" isActive={pathname.startsWith("/settings")}>
                  <Link href="/settings">
                    <Settings className="size-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Feedback" isActive={pathname === "/feedback"}>
                  <Link href="/feedback">
                    <MessageSquare className="size-4" />
                    <span>Feedback</span>
                  </Link>
                </SidebarMenuButton>
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
