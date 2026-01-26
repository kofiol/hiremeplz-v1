"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface DistilledProfile {
  name: string
  firstName: string | null
  lastName: string | null
  headline: string | null
  about: string | null
  avatarUrl: string | null
  location: string | null
  city: string | null
  countryCode: string | null
  currentCompany: string | null
  currentTitle: string | null
  experienceLevel: "intern_new_grad" | "entry" | "mid" | "senior" | "lead" | "director" | null
  skills: { name: string }[]
  experiences: {
    title: string
    company: string | null
    startDate: string | null
    endDate: string | null
    highlights: string | null
    location: string | null
    duration: string | null
  }[]
  educations: {
    school: string
    degree: string | null
    field: string | null
    startYear: string | null
    endYear: string | null
  }[]
  certifications: {
    title: string
    issuer: string | null
    date: string | null
  }[]
  followers: number | null
  connections: number | null
  recommendationsCount: number | null
  languages: string[]
  recentActivity: {
    title: string
    link: string | null
    interaction: string | null
  }[]
  linkedinUrl: string
  linkedinId: string | null
  scrapedAt: string
}

interface ScrapeResult {
  success: boolean
  profile: DistilledProfile | null
  error: string | null
  rawSnapshotId: string | null
  runId?: string
}

export default function TestLinkedInScraperPage() {
  const [url, setUrl] = useState("https://www.linkedin.com/in/elad-moshe-05a90413/")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScrapeResult | null>(null)

  const handleScrape = async () => {
    if (!url.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/v1/test/linkedin-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        profile: null,
        error: error instanceof Error ? error.message : "Unknown error",
        rawSnapshotId: null,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">LinkedIn Scraper Test</h1>
        <p className="text-muted-foreground">
          Test the trigger.dev LinkedIn profile scraper before giving it to AI agents
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scrape LinkedIn Profile</CardTitle>
          <CardDescription>
            Enter a LinkedIn profile URL to trigger the scraper task
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://linkedin.com/in/username"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              disabled={loading}
            />
            <Button onClick={handleScrape} disabled={loading || !url.trim()}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading ? "Scraping..." : "Scrape"}
            </Button>
          </div>

          {loading && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground text-sm">
                Triggering BrightData scraper... This may take 2-5 minutes
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          {result.success && result.profile ? (
            <div className="space-y-4">
              {/* Header Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl">{result.profile.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {result.profile.headline || "No headline"}
                      </CardDescription>
                    </div>
                    {result.profile.avatarUrl && (
                      <img
                        src={result.profile.avatarUrl}
                        alt={result.profile.name}
                        className="size-20 rounded-full"
                      />
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.profile.location && (
                      <Badge variant="outline">{result.profile.location}</Badge>
                    )}
                    {result.profile.experienceLevel && (
                      <Badge>{result.profile.experienceLevel.replace("_", " ")}</Badge>
                    )}
                    {result.profile.followers !== null && (
                      <Badge variant="secondary">{result.profile.followers} followers</Badge>
                    )}
                    {result.profile.connections !== null && (
                      <Badge variant="secondary">{result.profile.connections} connections</Badge>
                    )}
                  </div>
                </CardHeader>
                {result.profile.about && (
                  <CardContent>
                    <p className="text-sm">{result.profile.about}</p>
                  </CardContent>
                )}
              </Card>

              {/* Current Position */}
              {(result.profile.currentCompany || result.profile.currentTitle) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Position</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{result.profile.currentTitle || "Unknown Title"}</p>
                    <p className="text-muted-foreground text-sm">
                      {result.profile.currentCompany || "Unknown Company"}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {result.profile.skills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Skills ({result.profile.skills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.profile.skills.slice(0, 20).map((skill, i) => (
                        <Badge key={i} variant="secondary">
                          {skill.name}
                        </Badge>
                      ))}
                      {result.profile.skills.length > 20 && (
                        <Badge variant="outline">+{result.profile.skills.length - 20} more</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Experience */}
              {result.profile.experiences.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Experience ({result.profile.experiences.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.profile.experiences.slice(0, 5).map((exp, i) => (
                      <div key={i} className="border-b pb-4 last:border-0 last:pb-0">
                        <p className="font-medium">{exp.title}</p>
                        <p className="text-muted-foreground text-sm">{exp.company}</p>
                        {(exp.startDate || exp.endDate) && (
                          <p className="text-muted-foreground text-xs">
                            {exp.startDate || "?"} - {exp.endDate || "Present"}
                            {exp.duration && ` • ${exp.duration}`}
                          </p>
                        )}
                        {exp.highlights && (
                          <p className="mt-2 text-sm">{exp.highlights.slice(0, 150)}...</p>
                        )}
                      </div>
                    ))}
                    {result.profile.experiences.length > 5 && (
                      <p className="text-center text-muted-foreground text-sm">
                        +{result.profile.experiences.length - 5} more positions
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {result.profile.educations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Education ({result.profile.educations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.profile.educations.map((edu, i) => (
                      <div key={i}>
                        <p className="font-medium">{edu.school}</p>
                        {(edu.degree || edu.field) && (
                          <p className="text-muted-foreground text-sm">
                            {[edu.degree, edu.field].filter(Boolean).join(" in ")}
                          </p>
                        )}
                        {(edu.startYear || edu.endYear) && (
                          <p className="text-muted-foreground text-xs">
                            {edu.startYear || "?"} - {edu.endYear || "Present"}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Certifications */}
              {result.profile.certifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Certifications ({result.profile.certifications.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.profile.certifications.slice(0, 5).map((cert, i) => (
                      <div key={i}>
                        <p className="font-medium text-sm">{cert.title}</p>
                        {cert.issuer && (
                          <p className="text-muted-foreground text-xs">{cert.issuer}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Languages */}
              {result.profile.languages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Languages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.profile.languages.map((lang, i) => (
                        <Badge key={i} variant="outline">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Raw JSON */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Raw JSON Output (for AI agents)</CardTitle>
                  <CardDescription>Copy this to test with AI agents</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs">
                    {JSON.stringify(result.profile, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              {/* Meta */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Snapshot ID:</span>
                    <span className="font-mono">{result.rawSnapshotId}</span>
                  </div>
                  {result.runId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Run ID:</span>
                      <span className="font-mono">{result.runId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scraped At:</span>
                    <span>{new Date(result.profile.scrapedAt).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Scraping Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{result.error || "Unknown error occurred"}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
