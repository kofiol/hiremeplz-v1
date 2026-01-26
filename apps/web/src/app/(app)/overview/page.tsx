"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../auth/session-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OnboardingChatbot } from "@/components/onboarding-chatbot";

export default function OverviewPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const [isGuardChecked, setIsGuardChecked] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState<number>(0);
  const [isCheckingCompleteness, setIsCheckingCompleteness] = useState(true);

  useEffect(() => {
    async function guardOverview() {
      if (isLoading) {
        return;
      }

      if (!session) {
        return;
      }

      try {
        const response = await fetch("/api/v1/me", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          setIsGuardChecked(true);
          setIsCheckingCompleteness(false);
          return;
        }

        const payload = await response.json();
        const completeness =
          typeof payload.profile_completeness_score === "number"
            ? payload.profile_completeness_score
            : 0;

        setProfileCompleteness(completeness);
      } finally {
        setIsGuardChecked(true);
        setIsCheckingCompleteness(false);
      }
    }

    guardOverview();
  }, [isLoading, session, router]);

  if (!isGuardChecked || isCheckingCompleteness) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // If profile is incomplete (< 80%), show the onboarding chatbot
  if (profileCompleteness < 0.8) {
    return <OnboardingChatbot />;
  }

  return (
    <div className="flex-1 space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Overview</h1>
        {!isLoading && session ? (
          <Badge variant="outline">Signed in</Badge>
        ) : (
          <Badge variant="outline">Loading</Badge>
        )}
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today’s actions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Generate cover letters (N), Apply to top jobs (N), Reply needed (N)
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline snapshot</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Empty state
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent agent runs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Empty state
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            New high-score job, daily limit reached, suspicious job detected
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
