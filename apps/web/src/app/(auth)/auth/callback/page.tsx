"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function parseFragmentParams(fragment: string) {
  const fragmentString = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  return new URLSearchParams(fragmentString);
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleCallback() {
      const fragmentParams = parseFragmentParams(window.location.hash);
      const searchParams = new URLSearchParams(window.location.search);

      const fragmentError =
        fragmentParams.get("error_description") ?? fragmentParams.get("error");

      if (fragmentError) {
        setError(fragmentError);
        setStatus("error");
        return;
      }

      const accessToken = fragmentParams.get("access_token");
      const refreshToken = fragmentParams.get("refresh_token");
      const authCode = searchParams.get("code");

      async function bootstrapAndRedirect(token: string) {
        try {
          await fetch("/api/v1/auth/bootstrap", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const response = await fetch("/api/v1/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            router.replace("/onboarding");
            return;
          }

          const payload = await response.json();
          const completeness =
            typeof payload.profile_completeness_score === "number"
              ? payload.profile_completeness_score
              : 0;

          if (completeness >= 0.8) {
            router.replace("/overview");
          } else {
            router.replace("/onboarding");
          }
        } catch {
          router.replace("/onboarding");
        }
      }

      if (accessToken && refreshToken) {
        const { data, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (setSessionError || !data.session) {
          setError(setSessionError?.message ?? "Unable to complete sign in");
          setStatus("error");
          return;
        }

        window.history.replaceState(null, "", "/auth/callback");
        await bootstrapAndRedirect(data.session.access_token);
        return;
      }

      if (authCode) {
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(authCode);

        if (exchangeError || !data.session) {
          setError(exchangeError?.message ?? "Unable to complete sign in");
          setStatus("error");
          return;
        }

        await bootstrapAndRedirect(data.session.access_token);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !data.session) {
        setError(sessionError?.message ?? "Unable to complete sign in");
        setStatus("error");
        return;
      }

      await bootstrapAndRedirect(data.session.access_token);
    }

    handleCallback();
  }, [router]);

  if (status === "error") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Completing sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please wait while we finish logging you in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
