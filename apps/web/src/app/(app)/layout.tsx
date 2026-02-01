"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "../auth/session-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar12 } from '@/components/ui/shadcn-io/navbar-12';
import { OnboardingCompletenessReminder } from "@/components/onboarding-completeness-reminder";
import { ChatHistoryProvider } from "@/lib/chat-history-context";
import { ChatHistorySidebar } from "@/components/chat-history-sidebar";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  const handleNavItemClick = (href: string) => {
    router.push(href);
  };

  if (!session && !isLoading) {
    return null;
  }

  const isOverview = pathname === "/overview";

  return (
    <ChatHistoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-svh max-h-svh flex flex-col overflow-hidden">
          {/* Fixed header section */}
          <div className="shrink-0 z-20 bg-sidebar">
            <Navbar12 onNavItemClick={handleNavItemClick} />
          </div>
          <OnboardingCompletenessReminder />
          {/* Main content area - fills remaining space */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {children}
          </div>
        </SidebarInset>
        {isOverview && <ChatHistorySidebar />}
      </SidebarProvider>
    </ChatHistoryProvider>
  );
}
