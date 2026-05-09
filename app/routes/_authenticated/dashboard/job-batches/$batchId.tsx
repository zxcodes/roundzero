import {
  ArrowLeft02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  RankingIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { BatchDetailSkeleton } from "@/components/route-skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getBatchOverview } from "@/features/batches/server/functions";
import { formatDateTime } from "@/shared/date";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/dashboard/job-batches/$batchId")({
  beforeLoad: ({ context, params }) => {
    validateUuidParams({ batchId: params.batchId });
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async ({ params }) => {
    const overview = await getBatchOverview({ data: { batchId: params.batchId } });
    if (!overview) throw notFound();
    return overview;
  },
  pendingComponent: BatchDetailSkeleton,
  component: BatchDetailPage,
});

const recommendationMeta: Record<string, { label: string; className: string }> = {
  strong_yes: {
    label: "Strong yes",
    className: "border-success/20 bg-success/10 text-success",
  },
  yes: {
    label: "Yes",
    className: "border-info/20 bg-info/10 text-info",
  },
  lean_no: {
    label: "Lean no",
    className: "border-warning/20 bg-warning/10 text-warning",
  },
  no: {
    label: "No",
    className: "border-danger/20 bg-danger/10 text-danger",
  },
};

const interviewStatusMeta: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Invited",
    className: "border-pending/20 bg-pending/10 text-pending",
  },
  in_progress: {
    label: "In progress",
    className: "border-warning/20 bg-warning/10 text-warning",
  },
  completed: {
    label: "Completed",
    className: "border-success/20 bg-success/10 text-success",
  },
  expired: {
    label: "Expired",
    className: "bg-muted text-muted-foreground",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground",
  },
};

function getOverallScore(scores: unknown): number | null {
  if (typeof scores !== "object" || scores === null) return null;
  const overall = (scores as Record<string, unknown>).overall;
  return typeof overall === "number" && Number.isFinite(overall) ? overall : null;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function BatchDetailPage() {
  const { batch, reports, interviews } = Route.useLoaderData();

  const isReleased = batch.status === "released";
  const interviewMap = new Map(interviews.map((i) => [i.applicationId, i]));
  const reportedAppIds = new Set(reports.map((r) => r.applicationId));
  const noReportInterviews = interviews.filter((i) => !reportedAppIds.has(i.applicationId));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 px-2 text-muted-foreground"
          >
            <Link to="/dashboard">
              <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} className="size-3.5" />
              Back to dashboard
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">{batch.jobTitle}</h2>
          <p className="text-sm text-muted-foreground">
            Batch of {batch.targetSize} candidate{batch.targetSize === 1 ? "" : "s"} ·{" "}
            {batch.companyName}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            isReleased
              ? "border-success/20 bg-success/10 text-success"
              : "border-warning/20 bg-warning/10 text-warning"
          }
        >
          <HugeiconsIcon
            icon={isReleased ? CheckmarkCircle02Icon : Clock01Icon}
            strokeWidth={2}
            className="size-3"
          />
          {isReleased ? "Released" : batch.status === "active" ? "Active" : "Forming"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Created
            </p>
            <p className="text-sm font-medium">{formatDateTime(batch.createdAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Launched
            </p>
            <p className="text-sm font-medium">
              {batch.launchedAt ? formatDateTime(batch.launchedAt) : "Not launched"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Released
            </p>
            <p className="text-sm font-medium">
              {batch.releasedAt ? formatDateTime(batch.releasedAt) : "Not released"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-4" />
            Ranked Candidates
          </CardTitle>
          <CardDescription>
            {isReleased
              ? "Reports released — sorted by overall score."
              : "Reports generated so far in this batch (held until release)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>No reports yet</EmptyTitle>
                <EmptyDescription>
                  Reports will appear here as candidates complete their interviews.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="divide-y divide-border/50">
              {reports.map((report, index) => {
                const score = getOverallScore(report.scores);
                const recMeta = recommendationMeta[report.recommendation];
                const interview = interviewMap.get(report.applicationId);
                const intMeta = interview ? interviewStatusMeta[interview.interviewStatus] : null;

                return (
                  <Link
                    key={report.id}
                    to="/dashboard/applicants/$applicationId"
                    params={{ applicationId: report.applicationId }}
                    className="group grid items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[2.5rem_auto_1fr_auto]"
                  >
                    <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
                    <Avatar className="size-10">
                      <AvatarImage
                        src={report.candidatePicture ?? undefined}
                        alt={report.candidateName}
                      />
                      <AvatarFallback className="text-[10px]">
                        {initialsOf(report.candidateName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium group-hover:text-primary">
                          {report.candidateName}
                        </span>
                        {recMeta ? (
                          <Badge variant="outline" className={recMeta.className}>
                            {recMeta.label}
                          </Badge>
                        ) : null}
                        {intMeta ? (
                          <Badge variant="outline" className={intMeta.className}>
                            {intMeta.label}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{report.summary}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Score</span>
                      <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
                        <span className="font-mono text-sm font-semibold text-primary">
                          {score !== null ? Math.round(score) : "—"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {noReportInterviews.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Awaiting / Expired</CardTitle>
            <CardDescription>
              Candidates in this batch who have not produced a report yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {noReportInterviews.map((i) => {
                const meta = interviewStatusMeta[i.interviewStatus];
                return (
                  <div
                    key={i.interviewId}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={i.candidatePicture ?? undefined} alt={i.candidateName} />
                        <AvatarFallback className="text-[10px]">
                          {initialsOf(i.candidateName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{i.candidateName}</span>
                    </div>
                    {meta ? (
                      <Badge variant="outline" className={meta.className}>
                        {meta.label}
                      </Badge>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
