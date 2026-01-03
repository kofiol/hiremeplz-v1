import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin

  const disallow = [
    "/login",
    "/onboarding",
    "/auth",
    "/app",
    "/overview",
    "/jobs",
    "/applications",
    "/cover-letters",
    "/earnings",
    "/analytics",
    "/messages",
    "/feedback",
    "/team",
    "/settings",
    "/interview-prep",
    "/api",
    "/_next",
  ]

  const lines = [
    "User-agent: *",
    "Allow: /",
    "Allow: /privacy",
    ...disallow.map((path) => `Disallow: ${path}`),
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ]

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
