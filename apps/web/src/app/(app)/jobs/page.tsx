"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function JobsPage() {
  return (
    <div className="flex-1 space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-medium">Jobs</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Job Listings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No jobs found.</p>
        </CardContent>
      </Card>
    </div>
  );
}
