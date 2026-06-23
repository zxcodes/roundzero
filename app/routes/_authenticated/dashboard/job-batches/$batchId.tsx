import {
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getBatchOverview } from "@/features/batches/server/functions";
import { ScorePill } from "@/features/reports/components/score-pill";
import { getOverallScore } from "@/features/reports/schemas";
import { formatDateTime } from "@/shared/date";
import {
  type Recommendation,
  recommendationBadgeTone,
  recommendationLabels,
  recommendationSchema,
} from "@/shared/enums";
import { formatCandidateScore } from "@/shared/score";
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

  // Summary stats — what someone scanning a batch actually wants.
  const scoresWithValue = reports
    .map((r) => getOverallScore(r.scores))
    .filter((n): n is number => n !== null);
  const avgScoreRaw =
    scoresWithValue.length > 0
      ? scoresWithValue.reduce((a, b) => a + b, 0) / scoresWithValue.length
      : null;
  const recCounts = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.recommendation] = (acc[r.recommendation] ?? 0) + 1;
    return acc;
  }, {});
  const topRecOrder: Recommendation[] = ["strong_yes", "yes", "lean_no", "no"];
  const topRec = topRecOrder.find((r) => (recCounts[r] ?? 0) > 0) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
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

      <Card size="sm" className="border-border/60">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground">Reports</span>
            <span className="font-mono text-sm font-semibold">
              {reports.length}/{batch.targetSize}
            </span>
          </div>
          {avgScoreRaw !== null ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Avg score</span>
              <span className="font-mono text-sm font-semibold">
                {formatCandidateScore(avgScoreRaw)}
              </span>
            </div>
          ) : null}
          {topRec ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Top signal</span>
              <Badge variant="outline" className={recommendationBadgeTone[topRec]}>
                {recommendationLabels[topRec]} ({recCounts[topRec]})
              </Badge>
            </div>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <span>
              <span className="font-semibold">Created</span>{" "}
              <span className="font-mono">{formatDateTime(batch.createdAt)}</span>
            </span>
            <span>
              <span className="font-semibold">Launched</span>{" "}
              <span className="font-mono">
                {batch.launchedAt ? formatDateTime(batch.launchedAt) : "—"}
              </span>
            </span>
            <span>
              <span className="font-semibold">Released</span>{" "}
              <span className="font-mono">
                {batch.releasedAt ? formatDateTime(batch.releasedAt) : "—"}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

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
                const parsedRec = recommendationSchema.safeParse(report.recommendation);
                const rec = parsedRec.success ? parsedRec.data : null;
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
                        {intMeta ? (
                          <Badge variant="outline" className={intMeta.className}>
                            {intMeta.label}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{report.summary}</p>
                    </div>
                    <ScorePill score={score} recommendation={rec} size="default" />
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
