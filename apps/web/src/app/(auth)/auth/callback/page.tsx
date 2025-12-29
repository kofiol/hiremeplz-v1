"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
        router.replace("/overview");
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

        router.replace("/overview");
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !data.session) {
        setError(sessionError?.message ?? "Unable to complete sign in");
        setStatus("error");
        return;
      }

      router.replace("/overview");
    }

    handleCallback();
  }, [router]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <main className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
          <h1 className="mb-4 text-xl font-semibold text-zinc-950">
            Sign in failed
          </h1>
          <p className="text-sm text-red-600">{error}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <main className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-zinc-950">
          Completing sign in
        </h1>
        <p className="text-sm text-zinc-600">
          Please wait while we finish logging you in.
        </p>
      </main>
    </div>
  );
}

