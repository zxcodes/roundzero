import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  RankingIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { PageInlineStats } from "@/components/page-inline-stats";
import { BatchDetailSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getBatchOverview } from "@/features/batches/server/functions";
import { getOverallScore } from "@/features/reports/schemas";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/shared/date";
import {
  type Recommendation,
  recommendationBadgeTone,
  recommendationLabels,
  recommendationSchema,
} from "@/shared/enums";
import { CANDIDATE_SCORE_MAX, formatCandidateScore } from "@/shared/score";
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

const recommendationTextTone: Record<Recommendation, string> = {
  strong_yes: "text-success",
  yes: "text-info",
  lean_no: "text-warning",
  no: "text-destructive",
};

function BatchDetailPage() {
  const { batch, reports, interviews } = Route.useLoaderData();

  const isReleased = batch.status === "released";
  const interviewMap = new Map(interviews.map((i) => [i.applicationId, i]));
  const reportedAppIds = new Set(reports.map((r) => r.applicationId));
  const noReportInterviews = interviews.filter((i) => !reportedAppIds.has(i.applicationId));

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

  const statItems = [
    { value: reports.length, label: `of ${batch.targetSize} reports` },
    ...(avgScoreRaw !== null
      ? [{ value: Math.round(avgScoreRaw * 10) / 10, label: "avg score" }]
      : []),
    ...(topRec
      ? [{ value: recCounts[topRec] ?? 0, label: recommendationLabels[topRec].toLowerCase() }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">{batch.jobTitle}</h1>
          <p className="text-sm text-muted-foreground">
            Batch of {batch.targetSize} candidate{batch.targetSize === 1 ? "" : "s"} ·{" "}
            {batch.companyName}
          </p>
          {statItems.length > 0 ? <PageInlineStats items={statItems} /> : null}
          <p className="text-xs text-muted-foreground">
            Created <span className="">{formatDateTime(batch.createdAt)}</span>
            {" · "}
            Launched{" "}
            <span className="">{batch.launchedAt ? formatDateTime(batch.launchedAt) : "—"}</span>
            {" · "}
            Released{" "}
            <span className="">{batch.releasedAt ? formatDateTime(batch.releasedAt) : "—"}</span>
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

      <section className="space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={RankingIcon}
              strokeWidth={2}
              className="size-4 text-muted-foreground"
            />
            <h2 className="text-lg font-semibold tracking-tight">Ranked candidates</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {isReleased
              ? "Reports released — sorted by overall score."
              : "Reports generated so far in this batch (held until release)."}
          </p>
          {topRec ? (
            <Badge variant="outline" className={recommendationBadgeTone[topRec]}>
              Top signal: {recommendationLabels[topRec]}
            </Badge>
          ) : null}
        </div>

        {reports.length === 0 ? (
          <Empty className="rounded-2xl border-0 bg-muted/30">
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
          <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60">
            {reports.map((report, index) => {
              const score = getOverallScore(report.scores);
              const parsedRec = recommendationSchema.safeParse(report.recommendation);
              const rec = parsedRec.success ? parsedRec.data : null;
              const interview = interviewMap.get(report.applicationId);
              const intMeta = interview ? interviewStatusMeta[interview.interviewStatus] : null;

              return (
                <Link
                  key={report.id}
                  to="/dashboard/applicant-reports/$applicationId"
                  params={{ applicationId: report.applicationId }}
                  className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 md:gap-4 md:px-5"
                >
                  <span className="w-6 shrink-0 text-xs text-muted-foreground">#{index + 1}</span>

                  {score != null ? (
                    <div className="w-18 shrink-0 space-y-0.5">
                      <p className="text-base font-semibold leading-none tabular-nums">
                        <span>{formatCandidateScore(score)}</span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          /{CANDIDATE_SCORE_MAX}
                        </span>
                      </p>
                      {rec ? (
                        <p
                          className={cn(
                            "text-[11px] font-medium leading-tight",
                            recommendationTextTone[rec],
                          )}
                        >
                          {recommendationLabels[rec]}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold group-hover:text-primary">
                        {report.candidateName}
                      </p>
                      {intMeta ? (
                        <Badge variant="outline" className={intMeta.className}>
                          {intMeta.label}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {report.summary}
                    </p>
                  </div>

                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {noReportInterviews.length > 0 ? (
        <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Awaiting / expired</h2>
            <p className="text-sm text-muted-foreground">
              Candidates in this batch who have not produced a report yet.
            </p>
          </div>
          <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60">
            {noReportInterviews.map((i) => {
              const meta = interviewStatusMeta[i.interviewStatus];
              return (
                <div
                  key={i.interviewId}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 md:px-5"
                >
                  <p className="truncate text-sm font-medium">{i.candidateName}</p>
                  {meta ? (
                    <Badge variant="outline" className={meta.className}>
                      {meta.label}
                    </Badge>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
