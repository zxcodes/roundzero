import { Alert01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "@tanstack/react-router";

import { PageInlineStats } from "@/components/page-inline-stats";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { importSelectedJobs } from "@/features/job-imports/server/functions";

type ImportResult = Awaited<ReturnType<typeof importSelectedJobs>>;

export function ImportComplete({ result }: { result: ImportResult }) {
  const router = useRouter();
  const incomplete = result.imported.filter((job) => job.missingFields.length > 0);
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
          { value: result.skipped.length, label: "skipped" },
        ]}
      />

      {incomplete.length > 0 ? (
        <Alert className="max-w-5xl">
          <AlertTitle>Your drafts were imported successfully</AlertTitle>
          <AlertDescription>
            Some drafts are missing recommended metadata. You can still publish them, though adding
            it can improve candidate filtering and matching.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="max-w-5xl">
          <AlertTitle>All imported drafts have their core details</AlertTitle>
          <AlertDescription>
            They are ready for a final content review before you publish them.
          </AlertDescription>
        </Alert>
      )}

      {result.skipped.length > 0 ? (
        <Card className="max-w-5xl">
          <CardHeader className="flex-row items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
              <HugeiconsIcon icon={Alert01Icon} strokeWidth={2} className="size-4" />
            </div>
            <div>
              <CardTitle>{result.skipped.length} jobs were skipped</CardTitle>
              <CardDescription>
                No duplicate drafts were created. Review the reasons below if anything looks
                unexpected.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 rounded-xl border">
              <ul className="divide-y">
                {result.skipped.map((job) => (
                  <li key={job.itemId} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_1.2fr]">
                    <span className="text-sm font-medium">{job.title ?? "Untitled job"}</span>
                    <span className="text-xs leading-5 text-muted-foreground sm:text-sm">
                      {job.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
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
