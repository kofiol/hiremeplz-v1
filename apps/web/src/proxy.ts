import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getSiteMode() {
  const mode = process.env.NEXT_PUBLIC_HIREMEPLZ_SITE_MODE;
  if (mode === "full" || mode === "landing") return mode;
  return process.env.NODE_ENV === "production" ? "landing" : "full";
}

export default function proxy(request: NextRequest) {
  const siteMode = getSiteMode();
  if (siteMode !== "landing") return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next/")) return NextResponse.next();
  if (pathname === "/favicon.ico") return NextResponse.next();
  if (pathname === "/robots.txt") return NextResponse.next();
  if (pathname === "/sitemap.xml") return NextResponse.next();
  if (pathname.startsWith("/api/v1/health")) return NextResponse.next();

  if (pathname === "/" || pathname === "/privacy") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/:path*"],
};

