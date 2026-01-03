import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin

  const urls = ["/", "/privacy"]

  const lastmod = new Date().toISOString().split("T")[0]

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls
      .map((path) => {
        const loc = `${origin}${path}`
        return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`
      })
      .join("") +
    `</urlset>`

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  })
}
