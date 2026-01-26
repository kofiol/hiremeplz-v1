"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../auth/session-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar12 } from '@/components/ui/shadcn-io/navbar-12';
import { OnboardingCompletenessReminder } from "@/components/onboarding-completeness-reminder";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  if (!session && !isLoading) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh max-h-svh flex flex-col overflow-hidden">
        {/* Fixed header section */}
        <div className="shrink-0 z-20 bg-sidebar">
          <Navbar12 />
        </div>
        <OnboardingCompletenessReminder />
        {/* Main content area - fills remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
