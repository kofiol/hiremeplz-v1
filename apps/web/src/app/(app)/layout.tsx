"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "../auth/session-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar12 } from '@/components/ui/shadcn-io/navbar-12';
import { ChatHistoryProvider } from "@/lib/chat-history-context";
import { ChatHistorySidebar } from "@/components/chat-history-sidebar";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    if (isLoading || !session) return;

    let cancelled = false;

    async function checkOnboarding() {
      try {
        const res = await fetch("/api/v1/me", {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        });
        if (!res.ok) {
          setOnboardingChecked(true);
          return;
        }
        const data = await res.json();
        // Check if onboarding is incomplete
        if (!cancelled && !data.onboarding_completed_at && (data.profile_completeness_score ?? 0) < 1) {
          router.replace("/onboarding");
          return;
        }
        // Check if analysis hasn't been seen yet (post-onboarding "wow moment")
        if (!cancelled && data.onboarding_completed_at && !data.analysis_seen_at) {
          if (pathname !== "/analysis") {
            router.replace("/analysis");
            return;
          }
        }
      } catch {
        // If the check fails, let them through
      }
      if (!cancelled) setOnboardingChecked(true);
    }

    checkOnboarding();
    return () => { cancelled = true; };
  }, [isLoading, session, router, pathname]);

  const handleNavItemClick = (href: string) => {
    router.push(href);
  };

  if (!session && !isLoading) {
    return null;
  }

  if (!onboardingChecked) {
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
