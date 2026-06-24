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
import {
  type DashboardCandidateReport,
  dashboardRecommendationLabels,
  type RoleAttention,
} from "@/features/dashboard/company-metrics";
import type { getDashboardMetrics } from "@/features/dashboard/server/functions";
import { formatRelativeTime } from "@/shared/date";
import { type Recommendation, recommendationBadgeTone } from "@/shared/enums";
import { CANDIDATE_SCORE_MAX, formatCandidateScore } from "@/shared/score";

type CompanyMetrics = Extract<Awaited<ReturnType<typeof getDashboardMetrics>>, { type: "company" }>;

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

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
      {dashboardRecommendationLabels[recommendation]}
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
      <Link to="/dashboard/applicant-reports/$applicationId" params={{ applicationId }}>
        {label}
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
      </Link>
    </Button>
  );
}

function HeroSection({ firstName, metrics }: { firstName: string; metrics: CompanyMetrics }) {
  const { heroSummary, awaitingReview, rolesNeedingAttention } = metrics;
  const firstAwaiting = awaitingReview[0];
  const firstRole = rolesNeedingAttention[0];

  const heroLines = (() => {
    if (heroSummary.awaitingReviewCount > 0) {
      const lines: string[] = [
        `${heroSummary.awaitingReviewCount} candidate${heroSummary.awaitingReviewCount === 1 ? "" : "s"} ${heroSummary.awaitingReviewCount === 1 ? "is" : "are"} waiting for review.`,
      ];
      if (heroSummary.strongHireAwaitingCount > 0) {
        lines.push(
          `${heroSummary.strongHireAwaitingCount} Strong hire recommendation${heroSummary.strongHireAwaitingCount === 1 ? "" : "s"} need${heroSummary.strongHireAwaitingCount === 1 ? "s" : ""} your attention.`,
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
          <h1 className="text-3xl font-semibold tracking-tight">
            {getTimeGreeting()}, {firstName}.
          </h1>
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
            {firstAwaiting ? (
              <Link
                to="/dashboard/applicant-reports/$applicationId"
                params={{ applicationId: firstAwaiting.applicationId }}
              >
                Review candidates
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
              </Link>
            ) : firstRole ? (
              <Link to="/dashboard/job-applicants/$jobId" params={{ jobId: firstRole.jobId }}>
                Review candidates
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
              </Link>
            ) : (
              <Link to="/dashboard/jobs/new">
                Review candidates
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
              </Link>
            )}
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
          No candidates are waiting for a hire / reject decision right now.
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
            Decide who to advance — each summary includes why the system recommended them.
          </p>
        </div>
        <span className="font-mono text-sm text-muted-foreground">
          {heroSummary.awaitingReviewCount} total
        </span>
      </div>

      <div className="space-y-4">
        {candidates.map((candidate) => (
          <article
            key={candidate.applicationId}
            className="rounded-2xl bg-muted/25 px-6 py-6 sm:px-8 sm:py-7"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-5">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold tracking-tight">
                    {candidate.candidateName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{candidate.jobTitle}</p>
                </div>

                <div className="space-y-2">
                  <RecommendationBadge recommendation={candidate.recommendation} size="lg" />
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {formatCandidateScore(candidate.overallScore)}/{CANDIDATE_SCORE_MAX}
                    </span>
                    {candidate.confidence ? <span>Confidence: {candidate.confidence}</span> : null}
                  </div>
                </div>

                {candidate.strengths.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Why they stood out
                    </p>
                    <ul className="mt-2 list-disc space-y-1.5 pl-4">
                      {candidate.strengths.map((strength) => (
                        <li key={strength} className="text-sm text-foreground">
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {candidate.topConcern ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Concern
                    </p>
                    <p className="mt-2 text-sm text-foreground">{candidate.topConcern}</p>
                  </div>
                ) : null}
              </div>

              <div className="shrink-0">
                <ReviewButton applicationId={candidate.applicationId} />
              </div>
            </div>
          </article>
        ))}
      </div>

      {heroSummary.awaitingReviewCount > candidates.length && heroSummary.viewAllAwaitingJobId ? (
        <div className="flex justify-center pt-1">
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/dashboard/job-applicants/$jobId"
              params={{ jobId: heroSummary.viewAllAwaitingJobId }}
            >
              View all awaiting review
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
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

      <div className="space-y-2">
        {roles.map((role) => (
          <article
            key={role.jobId}
            className="flex flex-col gap-3 rounded-xl bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <p className="truncate font-medium">{role.title}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3.5" />
                  {role.applicants} applicant{role.applicants === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-3.5" />
                  {role.reportsReady} report{role.reportsReady === 1 ? "" : "s"} ready
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {role.strongHire > 0 ? (
                  <Badge variant="outline" className={recommendationBadgeTone.strong_yes}>
                    {role.strongHire} strong hire
                  </Badge>
                ) : null}
                {role.hire > 0 ? (
                  <Badge variant="outline" className={recommendationBadgeTone.yes}>
                    {role.hire} hire
                  </Badge>
                ) : null}
                {role.maybe > 0 ? (
                  <Badge variant="outline" className="border-border/60 text-muted-foreground">
                    {role.maybe} maybe
                  </Badge>
                ) : null}
                {role.reject > 0 ? (
                  <span className="text-xs text-muted-foreground/70">{role.reject} reject</span>
                ) : null}
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link to="/dashboard/job-applicants/$jobId" params={{ jobId: role.jobId }}>
                Review candidates
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </section>
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

      <ul className="divide-y divide-border/40 rounded-xl bg-muted/15">
        {evaluatingCount > 0 ? (
          <li className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
              <p className="text-sm text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{evaluatingCount}</span>{" "}
                candidate{evaluatingCount === 1 ? "" : "s"} currently being evaluated
              </p>
            </div>
          </li>
        ) : null}
        {reports.map((report) => (
          <li
            key={report.applicationId}
            className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-border" aria-hidden />
              <div className="min-w-0 space-y-1">
                <RecommendationBadge recommendation={report.recommendation} />
                <p className="truncate text-sm font-medium">{report.candidateName}</p>
                <p className="truncate text-xs text-muted-foreground">{report.jobTitle}</p>
                <p className="text-xs text-muted-foreground">
                  Generated {formatRelativeTime(report.releasedAt)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link
                to="/dashboard/applicant-reports/$applicationId"
                params={{ applicationId: report.applicationId }}
              >
                Open report
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
              </Link>
            </Button>
          </li>
        ))}
      </ul>
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
