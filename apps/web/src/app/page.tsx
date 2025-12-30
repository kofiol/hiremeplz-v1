"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "./auth/session-provider";
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function Home() {
  const { session, isLoading } = useSession();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background font-sans p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="flex w-full max-w-3xl flex-col items-center justify-between gap-10 p-10 sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-foreground">
            hireMePlz
          </h1>
          <p className="max-w-md text-lg leading-8 text-muted-foreground">
            {isLoading && "Checking your session..."}
            {!isLoading &&
              (session
                ? "You are signed in. Continue to your dashboard."
                : "Sign in with a magic link to access your dashboard.")}
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          {!isLoading && (
            <>
              {session ? (
                <Button asChild className="w-full md:w-[180px]">
                  <Link href="/overview">Go to dashboard</Link>
                </Button>
              ) : (
                <Button asChild className="w-full md:w-[180px]">
                  <Link href="/login">Sign in</Link>
                </Button>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
