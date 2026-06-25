import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  RankingIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { DashboardCandidateReport, RoleAttention } from "@/features/dashboard/company-metrics";
import { DashboardGreeting } from "@/features/dashboard/components/dashboard-greeting";
import type { getDashboardMetrics } from "@/features/dashboard/server/functions";
import { formatRelativeTime } from "@/shared/date";
import { type Recommendation, recommendationBadgeTone, recommendationLabels } from "@/shared/enums";
import { CANDIDATE_SCORE_MAX, formatCandidateScore } from "@/shared/score";

type CompanyMetrics = Extract<Awaited<ReturnType<typeof getDashboardMetrics>>, { type: "company" }>;

const dashboardCardGridClass = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

function RecommendationBadge({
  recommendation,
  size = "default",
}: {
  recommendation: Recommendation;
  size?: "default" | "lg";
}) {
  const sizeClass = size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <Badge variant="outline" className={`${recommendationBadgeTone[recommendation]} ${sizeClass}`}>
      {recommendationLabels[recommendation]}
    </Badge>
  );
}

function ReviewButton({
  applicationId,
  label = "Review candidate",
}: {
  applicationId: string;
  label?: string;
}) {
  return (
    <Button size="sm" asChild>
      <Link
        to="/dashboard/applicant-reports/$applicationId"
        params={{ applicationId }}
        className="no-underline hover:no-underline"
      >
        {label}
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
      </Link>
    </Button>
  );
}

function HeroSection({ firstName, metrics }: { firstName: string; metrics: CompanyMetrics }) {
  const { heroSummary } = metrics;

  const heroLines = (() => {
    if (heroSummary.awaitingReviewCount > 0) {
      const lines: string[] = [
        `${heroSummary.awaitingReviewCount} candidate${heroSummary.awaitingReviewCount === 1 ? "" : "s"} ${heroSummary.awaitingReviewCount === 1 ? "is" : "are"} waiting for review.`,
      ];
      if (heroSummary.strongHireAwaitingCount > 0) {
        lines.push(
          `${heroSummary.strongHireAwaitingCount} ${recommendationLabels.strong_yes.toLowerCase()} recommendation${heroSummary.strongHireAwaitingCount === 1 ? "" : "s"} need${heroSummary.strongHireAwaitingCount === 1 ? "s" : ""} your attention.`,
        );
      }
      return lines;
    }
    if (heroSummary.evaluatingCount > 0) {
      return [
        `${heroSummary.evaluatingCount} candidate${heroSummary.evaluatingCount === 1 ? "" : "s"} currently being evaluated.`,
        "Reports will appear here when complete.",
      ];
    }
    return [
      "You're all caught up.",
      "New reports will show up here when candidates finish interviewing.",
    ];
  })();

  const statItems = [
    { label: "applications processed", value: heroSummary.applicationsProcessed },
    { label: "AI interviews completed", value: heroSummary.interviewsCompleted },
    { label: "reports ready", value: heroSummary.reportsReady },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <DashboardGreeting firstName={firstName} />
          <div className="space-y-1">
            {heroLines.map((line) => (
              <p key={line} className="text-base text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        </div>
        {heroSummary.awaitingReviewCount > 0 ? (
          <Button asChild>
            <Link to="/dashboard/awaiting-review" className="no-underline hover:no-underline">
              Review awaiting
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {statItems.map((item) => (
          <span key={item.label}>
            <span className="font-mono font-medium tabular-nums text-foreground">{item.value}</span>{" "}
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function AwaitingReviewCard({ candidate }: { candidate: DashboardCandidateReport }) {
  const highlight = candidate.strengths[0] ?? candidate.topConcern;

  return (
    <article className="flex min-h-52 flex-col rounded-xl bg-muted/25 p-4">
      <RecommendationBadge recommendation={candidate.recommendation} size="lg" />
      <div className="mt-3 min-w-0 space-y-1">
        <h3 className="truncate text-base font-semibold tracking-tight">
          {candidate.candidateName}
        </h3>
        <p className="truncate text-xs text-muted-foreground">{candidate.jobTitle}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono font-medium tabular-nums text-foreground">
          {formatCandidateScore(candidate.overallScore)}/{CANDIDATE_SCORE_MAX}
        </span>
        {candidate.confidence ? <span>{candidate.confidence} confidence</span> : null}
      </div>
      {highlight ? (
        <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
          {highlight}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      <div className="mt-4">
        <ReviewButton applicationId={candidate.applicationId} label="Open report" />
      </div>
    </article>
  );
}

function AwaitingReviewSection({
  candidates,
  heroSummary,
  activitySummary,
}: {
  candidates: DashboardCandidateReport[];
  heroSummary: CompanyMetrics["heroSummary"];
  activitySummary: CompanyMetrics["activitySummary"];
}) {
  if (candidates.length === 0) {
    return (
      <section className="rounded-2xl bg-muted/30 px-6 py-8">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={2}
            className="size-5 text-success"
          />
          <h2 className="text-lg font-semibold tracking-tight">You&apos;re all caught up</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          No candidates are waiting for a shortlist or reject decision right now.
        </p>
        {activitySummary.length > 0 ? (
          <ul className="mt-6 space-y-2 border-t border-border/40 pt-6">
            {activitySummary.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(item.occurredAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Candidates awaiting review</h2>
          <p className="text-sm text-muted-foreground">
            Top recommendations waiting on your decision — open a report for the full evaluation.
          </p>
        </div>
        <span className="font-mono text-sm text-muted-foreground">
          {heroSummary.awaitingReviewCount} total
        </span>
      </div>

      <div className={dashboardCardGridClass}>
        {candidates.map((candidate) => (
          <AwaitingReviewCard key={candidate.applicationId} candidate={candidate} />
        ))}
      </div>

      {heroSummary.awaitingReviewCount > 0 ? (
        <div className="flex justify-center pt-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/awaiting-review" className="no-underline hover:no-underline">
              View all awaiting review
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function RoleAttentionCard({ role }: { role: RoleAttention }) {
  return (
    <article className="flex min-h-44 flex-col rounded-xl bg-muted/20 p-4">
      <h3 className="truncate text-base font-semibold tracking-tight">{role.title}</h3>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3.5" />
          {role.applicants} applicant{role.applicants === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1">
          <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-3.5" />
          {role.reportsReady} report{role.reportsReady === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-3 flex flex-1 flex-wrap items-start gap-1.5">
        {role.strongHire > 0 ? (
          <Badge variant="outline" className={recommendationBadgeTone.strong_yes}>
            {role.strongHire} {recommendationLabels.strong_yes.toLowerCase()}
          </Badge>
        ) : null}
        {role.hire > 0 ? (
          <Badge variant="outline" className={recommendationBadgeTone.yes}>
            {role.hire} {recommendationLabels.yes.toLowerCase()}
          </Badge>
        ) : null}
        {role.maybe > 0 ? (
          <Badge variant="outline" className="border-border/60 text-muted-foreground">
            {role.maybe} {recommendationLabels.lean_no.toLowerCase()}
          </Badge>
        ) : null}
        {role.reject > 0 ? (
          <span className="text-xs text-muted-foreground/70">
            {role.reject} {recommendationLabels.no.toLowerCase()}
          </span>
        ) : null}
      </div>
      <div className="mt-4">
        <Button variant="outline" size="sm" asChild>
          <Link
            to="/dashboard/job-applicants/$jobId"
            params={{ jobId: role.jobId }}
            search={{ tab: "applicants", view: "all", filter: "awaiting_decision" }}
            className="no-underline hover:no-underline"
          >
            Review role
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function RolesAttentionSection({ roles }: { roles: RoleAttention[] }) {
  if (roles.length === 0) {
    return (
      <Empty className="rounded-2xl bg-muted/20">
        <EmptyHeader>
          <EmptyTitle>No open roles with applicants</EmptyTitle>
          <EmptyDescription>Post a role to start receiving candidates.</EmptyDescription>
        </EmptyHeader>
        <Button asChild>
          <Link to="/dashboard/jobs/new">Post a job</Link>
        </Button>
      </Empty>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Roles requiring attention</h2>
        <p className="text-sm text-muted-foreground">
          Outcome breakdown per role — focus on who to review.
        </p>
      </div>

      <div className={dashboardCardGridClass}>
        {roles.map((role) => (
          <RoleAttentionCard key={role.jobId} role={role} />
        ))}
      </div>
    </section>
  );
}

function RecentReportCard({ report }: { report: DashboardCandidateReport }) {
  return (
    <article className="flex min-h-44 flex-col rounded-xl bg-muted/15 p-4">
      <RecommendationBadge recommendation={report.recommendation} />
      <div className="mt-3 min-w-0 space-y-1">
        <h3 className="truncate text-base font-semibold tracking-tight">{report.candidateName}</h3>
        <p className="truncate text-xs text-muted-foreground">{report.jobTitle}</p>
      </div>
      <p className="mt-2 flex-1 text-xs text-muted-foreground">
        Generated {formatRelativeTime(report.releasedAt)}
      </p>
      <div className="mt-4">
        <ReviewButton applicationId={report.applicationId} label="Open report" />
      </div>
    </article>
  );
}

function RecentActivitySection({
  reports,
  evaluatingCount,
}: {
  reports: DashboardCandidateReport[];
  evaluatingCount: number;
}) {
  if (reports.length === 0 && evaluatingCount === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Recent activity</h2>
        <p className="text-sm text-muted-foreground">
          Fresh evaluation activity across your roles.
        </p>
      </div>

      {evaluatingCount > 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm text-muted-foreground">
          <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
          <span>
            <span className="font-mono font-medium text-foreground">{evaluatingCount}</span>{" "}
            candidate{evaluatingCount === 1 ? "" : "s"} currently being evaluated
          </span>
        </div>
      ) : null}

      {reports.length > 0 ? (
        <div className={dashboardCardGridClass}>
          {reports.map((report) => (
            <RecentReportCard key={report.applicationId} report={report} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function CompanyDashboard({
  metrics,
  firstName,
}: {
  metrics: CompanyMetrics;
  firstName: string;
}) {
  return (
    <div className="space-y-10">
      <HeroSection firstName={firstName} metrics={metrics} />
      <AwaitingReviewSection
        candidates={metrics.awaitingReview}
        heroSummary={metrics.heroSummary}
        activitySummary={metrics.activitySummary}
      />
      <RolesAttentionSection roles={metrics.rolesNeedingAttention} />
      <RecentActivitySection
        reports={metrics.recentReports}
        evaluatingCount={metrics.heroSummary.evaluatingCount}
      />
    </div>
  );
}
