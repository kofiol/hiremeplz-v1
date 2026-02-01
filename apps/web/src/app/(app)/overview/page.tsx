"use client";

import { useEffect, useState } from "react";
import { useSession } from "../../auth/session-provider";
import { OnboardingChatbot } from "@/components/onboarding-chatbot";
import { OverviewCopilot } from "@/components/overview-copilot";

export default function OverviewPage() {
  const { session, isLoading } = useSession();
  const [isGuardChecked, setIsGuardChecked] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState<number>(0);
  const [isCheckingCompleteness, setIsCheckingCompleteness] = useState(true);
  const [onboardingFinished, setOnboardingFinished] = useState(false);

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
  }, [isLoading, session]);

  if (!isGuardChecked || isCheckingCompleteness) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // If profile is incomplete (< 80%), show fullscreen onboarding (no sidebar)
  if (profileCompleteness < 0.8 && !onboardingFinished) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <OnboardingChatbot onComplete={() => setOnboardingFinished(true)} />
      </div>
    );
  }

  return <OverviewCopilot />;
}
