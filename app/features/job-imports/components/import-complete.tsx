import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useRouter } from "@tanstack/react-router";

import { PageInlineStats } from "@/components/page-inline-stats";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { importSelectedJobs } from "@/features/job-imports/server/functions";
import { publishRequiredFieldLabels } from "@/features/jobs/publish-readiness";

type ImportResult = Awaited<ReturnType<typeof importSelectedJobs>>;

export function ImportComplete({ result }: { result: ImportResult }) {
  const router = useRouter();
  const incomplete = result.imported.filter((job) => job.missingFields.length > 0);
  const ready = result.imported.length - incomplete.length;
  const onReviewDrafts = async () => {
    await router.navigate({ to: "/dashboard/jobs" });
    await router.invalidate();
  };
  const onImportMore = async () => {
    await router.navigate({ to: "/dashboard/jobs/import", search: {} });
    await router.invalidate();
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {result.imported.length} job {result.imported.length === 1 ? "draft" : "drafts"}{" "}
            imported
          </h1>
          <p className="text-sm text-muted-foreground">
            Nothing was published. Review and publish each job when it is ready.
          </p>
        </div>
      </div>

      <PageInlineStats
        items={[
          { value: result.imported.length, label: "drafts created" },
          { value: ready, label: "ready to publish" },
          { value: incomplete.length, label: "need details" },
          { value: result.skipped.length, label: "skipped" },
        ]}
      />

      {incomplete.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Drafts that still need details</CardTitle>
            <CardDescription>
              These jobs were saved successfully, but RoundZero will ask for the missing fields
              before publishing.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y rounded-2xl border p-0">
            {incomplete.map((job) => (
              <div
                key={job.jobId}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <Link
                  to="/dashboard/jobs/$jobId"
                  params={{ jobId: job.jobId }}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {job.title}
                </Link>
                <div className="flex flex-wrap gap-1.5">
                  {job.missingFields.map((field) => (
                    <Badge key={field} variant="destructive">
                      Missing {publishRequiredFieldLabels[field]}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTitle>All imported drafts have their core details</AlertTitle>
          <AlertDescription>
            They are ready for a final content review before you publish them.
          </AlertDescription>
        </Alert>
      )}

      {ready > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Drafts ready for final review</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y rounded-2xl border p-0">
            {result.imported
              .filter((job) => job.missingFields.length === 0)
              .map((job) => (
                <Link
                  key={job.jobId}
                  to="/dashboard/jobs/$jobId"
                  params={{ jobId: job.jobId }}
                  className="px-4 py-3 text-sm font-medium underline-offset-4 hover:underline"
                >
                  {job.title}
                </Link>
              ))}
          </CardContent>
        </Card>
      ) : null}

      {result.skipped.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>{result.skipped.length} jobs were skipped</AlertTitle>
          <AlertDescription>
            {result.skipped.map((job) => `${job.title ?? "Job"} — ${job.reason}`).join("; ")}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onReviewDrafts}>Review job drafts</Button>
        <Button variant="outline" onClick={onImportMore}>
          Import another batch
        </Button>
      </div>
    </div>
  );
}
