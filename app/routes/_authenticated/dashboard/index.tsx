import {
  Alert02Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  RankingIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { DashboardIndexSkeleton } from "@/components/route-skeletons";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getDashboardMetrics } from "@/features/dashboard/server/functions";
import { ScorePill } from "@/features/reports/components/score-pill";
import { formatRelativeTime } from "@/shared/date";
import { recommendationSchema, recommendationSurfaceTone } from "@/shared/enums";

type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;
type CompanyMetrics = Extract<DashboardMetrics, { type: "company" }>;
type CandidateMetrics = Extract<DashboardMetrics, { type: "candidate" }> & {
  shortlistedCount?: number;
  pendingInterviews?: PendingInterview[];
  shortlistedApplications?: ShortlistedApp[];
  recentActivity?: RecentActivityItem[];
};
type RoleHealth = CompanyMetrics["roleHealth"][number];
type ReportHighlight = CompanyMetrics["reportHighlights"][number];
type ActiveBatch = CompanyMetrics["activeBatches"][number];

// Enriched candidate dashboard pieces (populated by getDashboardMetrics for the actionable view)
type PendingInterview = {
  id: string;
  applicationId: string;
  jobTitle: string;
  companyName: string;
  status: string;
  expiresAt: string | null;
};

type ShortlistedApp = {
  id: string;
  jobTitle: string;
  companyName: string;
  hasFollowUp: boolean;
};

type RecentActivityItem = {
  id: string;
  jobTitle: string;
  companyName: string;
  status: string;
  updatedAt: Date | string;
  jobStatus: string;
  companyOwnerDeleted: boolean;
  interviewStatus: string | null;
};

export const Route = createFileRoute("/_authenticated/dashboard/")({
  loader: async () => {
    const metrics = await getDashboardMetrics();
    return { metrics };
  },
  pendingComponent: DashboardIndexSkeleton,
  component: DashboardIndexPage,
});

const toInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "--";
};

// Funnel segments shown as a single horizontal bar per role.
type FunnelSegment = {
  key: keyof Pick<
    RoleHealth,
    "applied" | "preScreening" | "queuedForBatch" | "invited" | "inProgress" | "evaluated"
  >;
  label: string;
  className: string;
};

const funnelSegments: FunnelSegment[] = [
  { key: "applied", label: "Applied", className: "bg-info/70" },
  { key: "preScreening", label: "Screening", className: "bg-warning/70" },
  { key: "queuedForBatch", label: "Queued", className: "bg-pending/70" },
  { key: "invited", label: "Invited", className: "bg-active/70" },
  { key: "inProgress", label: "Interviewing", className: "bg-warning/80" },
  { key: "evaluated", label: "Released", className: "bg-success/80" },
];

type ActionItem = {
  id: string;
  tone: "danger" | "warning" | "success" | "neutral";
  title: string;
  description: string;
  cta: string;
  link: React.ReactNode;
};

function buildActionQueue(metrics: CompanyMetrics): ActionItem[] {
  const items: ActionItem[] = [];

  if (metrics.evaluatedAwaitingDecision > 0) {
    const role = metrics.roleHealth.find((r) => r.backlog > 0);
    items.push({
      id: "awaiting-decision",
      tone: "success",
      title: `${metrics.evaluatedAwaitingDecision} candidate${
        metrics.evaluatedAwaitingDecision === 1 ? "" : "s"
      } awaiting your decision`,
      description: role
        ? `Start with ${role.title} — ${role.backlog} ready to review.`
        : "Review their reports and shortlist or reject.",
      cta: "Review",
      link: role ? (
        <Link to="/dashboard/job-applicants/$jobId" params={{ jobId: role.jobId }}>
          Review
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ) : (
        <Link to="/dashboard/jobs">
          Open jobs
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ),
    });
  }

  for (const batch of metrics.activeBatches.slice(0, 2)) {
    items.push({
      id: `batch-${batch.id}`,
      tone: "warning",
      title: `Active batch in ${batch.jobTitle}`,
      description: `${batch.targetSize} candidate${
        batch.targetSize === 1 ? "" : "s"
      } in flight — reports release when complete.`,
      cta: "Open batch",
      link: (
        <Link to="/dashboard/job-batches/$batchId" params={{ batchId: batch.id }}>
          Open batch
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ),
    });
  }

  const expiringSoon = metrics.roleHealth
    .filter((r) => r.expiresInDays !== null && r.expiresInDays <= 3)
    .sort((a, b) => (a.expiresInDays ?? 999) - (b.expiresInDays ?? 999));

  for (const role of expiringSoon.slice(0, 2)) {
    items.push({
      id: `expiring-${role.jobId}`,
      tone: "danger",
      title: `${role.title} expires in ${role.expiresInDays}d`,
      description: `${role.applicants} applicant${
        role.applicants === 1 ? "" : "s"
      } so far — extend the deadline or close it out.`,
      cta: "Manage",
      link: (
        <Link to="/dashboard/jobs/$jobId" params={{ jobId: role.jobId }}>
          Manage
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ),
    });
  }

  if (metrics.draftJobs > 0) {
    items.push({
      id: "drafts",
      tone: "neutral",
      title: `${metrics.draftJobs} draft${metrics.draftJobs === 1 ? "" : "s"} unpublished`,
      description: "Publish or delete drafts to keep your pipeline clean.",
      cta: "Open drafts",
      link: (
        <Link to="/dashboard/jobs">
          Open drafts
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ),
    });
  }

  return items.slice(0, 5);
}

function buildCandidateActionQueue(metrics: CandidateMetrics): ActionItem[] {
  const items: ActionItem[] = [];

  const pending: PendingInterview[] = metrics.pendingInterviews ?? [];
  const shortlisted: ShortlistedApp[] = metrics.shortlistedApplications ?? [];

  const now = Date.now();

  // 1. Expiring interviews (danger) — only for the final urgent window
  // Interviews have a ~12h window. We only surface "expires soon" (danger)
  // when very little time remains, otherwise we show the normal state + correct CTA.
  const INTERVIEW_URGENT_HOURS = 4;

  const expiringSoon = pending.filter((p) => {
    if (!p.expiresAt) return false;
    const exp = new Date(p.expiresAt).getTime();
    const hoursLeft = (exp - now) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= INTERVIEW_URGENT_HOURS;
  });

  for (const p of expiringSoon.slice(0, 1)) {
    const isInProgress = p.status === "in_progress";
    items.push({
      id: `interview-expiring-${p.id}`,
      tone: "danger",
      title: isInProgress
        ? `Your interview for ${p.jobTitle} expires soon`
        : `Interview for ${p.jobTitle} expires soon`,
      description: `at ${p.companyName} — ${isInProgress ? "continue" : "complete"} it before the deadline.`,
      cta: isInProgress ? "Continue" : "Start interview",
      link: (
        <Link to="/interview/$interviewId" params={{ interviewId: p.id }}>
          {isInProgress ? "Continue" : "Start"}
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ),
    });
  }

  // 2. Other pending or in-progress interviews
  for (const p of pending.slice(0, 2)) {
    if (expiringSoon.some((e) => e.id === p.id)) continue;
    const isInProgress = p.status === "in_progress";
    items.push({
      id: `interview-${p.id}`,
      tone: "warning",
      title: isInProgress
        ? `Interview in progress: ${p.jobTitle}`
        : `Interview ready: ${p.jobTitle}`,
      description: `at ${p.companyName}`,
      cta: isInProgress ? "Continue" : "Start interview",
      link: (
        <Link to="/interview/$interviewId" params={{ interviewId: p.id }}>
          {isInProgress ? "Continue" : "Start"}
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ),
    });
  }

  // 3. Shortlisted (with follow-up notes prioritized)
  const withFollowUp = shortlisted.filter((s) => s.hasFollowUp);
  if (withFollowUp.length > 0) {
    const s = withFollowUp[0];
    items.push({
      id: `shortlist-followup-${s.id}`,
      tone: "success",
      title: `Follow-up from ${s.companyName}`,
      description: `for ${s.jobTitle} — they left a note with next steps.`,
      cta: "View details",
      link: (
        <Link to="/dashboard/application/$applicationId" params={{ applicationId: s.id }}>
          View
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ),
    });
  } else if (shortlisted.length > 0) {
    const s = shortlisted[0];
    items.push({
      id: `shortlist-${s.id}`,
      tone: "success",
      title: `You're shortlisted for ${s.jobTitle}`,
      description: `at ${s.companyName} — great work.`,
      cta: "View",
      link: (
        <Link to="/dashboard/application/$applicationId" params={{ applicationId: s.id }}>
          View
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ),
    });
  }

  return items.slice(0, 5);
}

const getRecentStatusMeta = (app: RecentActivityItem) => {
  if (app.companyOwnerDeleted) {
    return { badge: "Account deleted", tone: "bg-muted text-muted-foreground" };
  }
  if (app.jobStatus === "closed") {
    return { badge: "Role closed", tone: "bg-muted text-muted-foreground" };
  }
  if (app.jobStatus === "draft") {
    return { badge: "Role paused", tone: "bg-muted text-muted-foreground" };
  }

  const status = app.status;
  const interviewStatus = app.interviewStatus;

  if (status === "interview_in_progress" && interviewStatus === "completed") {
    return {
      badge: "Awaiting company decision",
      tone: "border-success/20 bg-success/10 text-success",
    };
  }

  switch (status) {
    case "shortlisted":
      return { badge: "Shortlisted", tone: "border-success/20 bg-success/10 text-success" };
    case "rejected":
      return { badge: "Closed", tone: "border-danger/20 bg-danger/10 text-danger" };
    case "withdrawn":
      return { badge: "Withdrawn", tone: "bg-muted text-muted-foreground" };
    case "interview_invited":
      return { badge: "Interview Ready", tone: "border-warning/20 bg-warning/10 text-warning" };
    case "interview_in_progress":
      return {
        badge: "Interview in Progress",
        tone: "border-warning/20 bg-warning/10 text-warning",
      };
    case "evaluated":
    case "evaluated_held":
      return {
        badge: "Awaiting company decision",
        tone: "border-success/20 bg-success/10 text-success",
      };
    default:
      return { badge: "Application Received", tone: "border-info/20 bg-info/10 text-info" };
  }
};

const toneDot: Record<ActionItem["tone"], string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  neutral: "bg-muted-foreground/50",
};

function ActionQueueCard({ actions }: { actions: ActionItem[] }) {
  if (actions.length === 0) {
    return (
      <Card className="border-success/20 bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={2}
              className="size-4 text-success"
            />
            All caught up
          </CardTitle>
          <CardDescription>
            No pending decisions, expiring roles, or active batches. Post a new role or wait for
            more applicants to roll in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/jobs">
              View all jobs
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Action queue</CardTitle>
          <Badge variant="secondary">{actions.length}</Badge>
        </div>
        <CardDescription className="text-xs">
          Top things to handle next, in priority order.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/50">
          {actions.map((action) => (
            <li
              key={action.id}
              className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30"
            >
              <span
                className={`mt-1.5 inline-block size-2 shrink-0 rounded-full ${toneDot[action.tone]}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{action.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                {action.link}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RoleFunnelBar({ role }: { role: RoleHealth }) {
  const total = Math.max(role.applicants, 1);
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {funnelSegments.map((segment) => {
          const count = role[segment.key] as number;
          if (count <= 0) return null;
          const width = (count / total) * 100;
          return (
            <div
              key={segment.key}
              className={segment.className}
              style={{ width: `${width}%` }}
              title={`${segment.label}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {funnelSegments.map((segment) => {
          const count = role[segment.key] as number;
          if (count === 0) return null;
          return (
            <span key={segment.key} className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block size-2 rounded-full ${segment.className}`}
                aria-hidden
              />
              <span className="font-mono font-semibold text-foreground">{count}</span>
              <span>{segment.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RolesOverview({ roles }: { roles: RoleHealth[] }) {
  if (roles.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No active roles yet</EmptyTitle>
          <EmptyDescription>
            Post your first role to start receiving applicants and AI evaluations.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/dashboard/jobs/new">Post a job</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Open roles</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/jobs">
              All jobs
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
            </Link>
          </Button>
        </div>
        <CardDescription className="text-xs">
          Pipeline at a glance. Click a role to manage its applicants.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/50">
          {roles.slice(0, 6).map((role) => (
            <li key={role.jobId} className="px-5 py-4">
              <Link
                to="/dashboard/job-applicants/$jobId"
                params={{ jobId: role.jobId }}
                className="group flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium group-hover:text-primary">
                      {role.title}
                    </span>
                    {role.backlog > 0 ? (
                      <Badge
                        variant="outline"
                        className="border-success/20 bg-success/10 text-success text-[11px]"
                      >
                        {role.backlog} to review
                      </Badge>
                    ) : null}
                    {role.expiresInDays !== null && role.expiresInDays <= 7 ? (
                      <Badge variant="outline" className="text-[11px]">
                        {role.expiresInDays}d left
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3" />
                      <span className="font-mono font-semibold text-foreground">
                        {role.applicants}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-3" />
                      <span className="font-mono font-semibold text-foreground">
                        {role.reportsCompleted}
                      </span>
                      <span>released</span>
                    </span>
                  </div>
                </div>
                <RoleFunnelBar role={role} />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RecentReleasesCard({ reports }: { reports: ReportHighlight[] }) {
  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent releases</CardTitle>
          <CardDescription className="text-xs">
            Top-scoring evaluations across your roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="border border-dashed border-border/60">
            <EmptyHeader>
              <EmptyTitle>No released evaluations yet</EmptyTitle>
              <EmptyDescription>
                Reports will appear here after active interview batches are released.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent releases</CardTitle>
          <Badge variant="secondary">{reports.length}</Badge>
        </div>
        <CardDescription className="text-xs">
          Top-scoring evaluations across your roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/50">
          {reports.slice(0, 4).map((report) => {
            const parsedRec = recommendationSchema.safeParse(report.recommendation);
            const recommendation = parsedRec.success ? parsedRec.data : null;
            const surfaceClass = parsedRec.success
              ? recommendationSurfaceTone[parsedRec.data]
              : "bg-muted-foreground/30";
            return (
              <li key={report.applicationId} className="flex items-center gap-3 px-5 py-3">
                <span className={`block h-8 w-1 rounded-full ${surfaceClass}`} aria-hidden />
                <Avatar className="size-8 rounded-md border">
                  <AvatarFallback className="rounded-md text-xs">
                    {toInitials(report.candidateName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{report.candidateName}</p>
                  <p className="truncate text-xs text-muted-foreground">{report.jobTitle}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <ScorePill
                    score={report.overallScore}
                    recommendation={recommendation}
                    size="default"
                  />
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      to="/dashboard/applicant-reports/$applicationId"
                      params={{ applicationId: report.applicationId }}
                    >
                      Open
                      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function CompanyHeaderStats({ metrics }: { metrics: CompanyMetrics }) {
  // Three single-line stats, not full cards. Keep light visual weight.
  const items = [
    { label: "Open roles", value: metrics.openRoles },
    { label: "Total applicants", value: metrics.totalApplicants },
    { label: "Awaiting decision", value: metrics.evaluatedAwaitingDecision },
    { label: "Reports released", value: metrics.reportsCompleted },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function ActiveBatchesStrip({ batches }: { batches: ActiveBatch[] }) {
  if (batches.length === 0) return null;
  return (
    <Card className="border-warning/25 bg-warning/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4 text-warning" />
            Active batches
          </CardTitle>
          <Badge variant="outline" className="font-mono text-[11px]">
            {batches.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {batches.slice(0, 3).map((batch) => (
          <div
            key={batch.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{batch.jobTitle}</p>
              <p className="text-xs text-muted-foreground">
                {batch.targetSize} candidate{batch.targetSize === 1 ? "" : "s"} in flight
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/job-batches/$batchId" params={{ batchId: batch.id }}>
                View
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CompanyDashboardSection({ metrics }: { metrics: CompanyMetrics }) {
  const actions = buildActionQueue(metrics);
  const openRoles = metrics.roleHealth;
  const hasRecentReleases = metrics.reportHighlights.length > 0;

  return (
    <div className="space-y-6">
      <CompanyHeaderStats metrics={metrics} />
      <ActionQueueCard actions={actions} />
      <ActiveBatchesStrip batches={metrics.activeBatches} />
      {hasRecentReleases ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RolesOverview roles={openRoles} />
          </div>
          <div className="lg:col-span-1">
            <RecentReleasesCard reports={metrics.reportHighlights} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <RolesOverview roles={openRoles} />
          <RecentReleasesCard reports={metrics.reportHighlights} />
        </div>
      )}
    </div>
  );
}

function CandidateDashboardSection({ metrics }: { metrics: CandidateMetrics }) {
  const actions = buildCandidateActionQueue(metrics);

  // Light header stats row (consistent visual weight with company)
  const headerItems = [
    { label: "Active applications", value: metrics.activeApplications },
    { label: "Interviews pending", value: metrics.pendingInterviews?.length ?? 0 },
    {
      label: "Shortlisted",
      value: metrics.shortlistedCount ?? metrics.shortlistedApplications?.length ?? 0,
    },
    { label: "Evaluations received", value: metrics.evaluationsReceived },
  ];

  const hasActions = actions.length > 0;
  const hasPending = (metrics.pendingInterviews?.length ?? 0) > 0;
  const hasShortlisted =
    (metrics.shortlistedCount ?? metrics.shortlistedApplications?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {headerItems.map((item) => (
          <div key={item.label} className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>

      <ActionQueueCard actions={actions} />

      <RecentActivitySection activity={metrics.recentActivity ?? []} />

      {/* Quick access to full list + browse */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/applications">
            View all applications
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link to="/dashboard/jobs">
            Browse open roles
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
          </Link>
        </Button>
      </div>

      {!(hasActions || hasPending || hasShortlisted) && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No active interviews or shortlists right now. Apply to more roles to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecentActivitySection({ activity }: { activity: RecentActivityItem[] }) {
  if (activity.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent activity</CardTitle>
        <CardDescription className="text-xs">
          Your most recently updated applications.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/50">
          {activity.map((app) => {
            const meta = getRecentStatusMeta(app);
            return (
              <li
                key={app.id}
                className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                      {app.companyName}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {app.jobStatus === "open" ? "Role open" : app.jobStatus}
                    </Badge>
                    <Badge className={`${meta.tone} text-[10px]`}>{meta.badge}</Badge>
                  </div>
                  <div className="truncate text-sm font-medium">{app.jobTitle}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Updated {formatRelativeTime(app.updatedAt)}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link
                    to="/dashboard/application/$applicationId"
                    params={{ applicationId: app.id }}
                  >
                    View
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function DashboardIndexPage() {
  const auth = useLoaderData({ from: "/_authenticated" });
  const user = auth.user;
  const isCompany = auth.type === "company";
  const isCandidate = auth.type === "candidate";
  const { metrics } = Route.useLoaderData();
  const candidateProfile = auth.type === "candidate" ? auth.candidateProfile : null;
  const company = auth.type === "company" ? auth.company : null;
  const showResumeBanner = isCandidate && candidateProfile && !candidateProfile.resumeKey;
  const showCompanyLogoBanner = isCompany && company && !company.logoKey;

  const welcomeMessage = (() => {
    if (metrics.type === "company") {
      const pending = metrics.evaluatedAwaitingDecision;
      if (pending > 0)
        return `${pending} candidate${pending === 1 ? "" : "s"} ready for your decision.`;
      if (metrics.activeBatches.length > 0)
        return `${metrics.activeBatches.length} batch${
          metrics.activeBatches.length === 1 ? "" : "es"
        } running. Reports will release soon.`;
      if (metrics.openRoles > 0)
        return `${metrics.openRoles} open role${metrics.openRoles === 1 ? "" : "s"} — ${
          metrics.totalApplicants
        } total applicant${metrics.totalApplicants === 1 ? "" : "s"}.`;
      return "Your pipeline is quiet. Post a role to get started.";
    }
    const m = metrics as CandidateMetrics;
    const pendingI = m.pendingInterviews?.length ?? 0;
    if (pendingI > 0)
      return `${pendingI} interview${pendingI === 1 ? "" : "s"} ready — complete them to move forward.`;
    const active = m.activeApplications;
    if (active > 0)
      return `${active} active application${active === 1 ? "" : "s"} — ${
        m.interviewInvites
      } moved to interview.`;
    return `Here is your applications overview.`;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{user?.name?.split(" ")[0]}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{welcomeMessage}</p>
      </div>

      {showResumeBanner ? (
        <Alert>
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
          <AlertDescription>Upload your resume to start applying for jobs.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/settings">Go to settings</Link>
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {showCompanyLogoBanner ? (
        <Alert>
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
          <AlertDescription>
            Upload your company logo to complete your public brand presence.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/settings">Add logo in settings</Link>
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {metrics.type === "company" ? (
        <CompanyDashboardSection metrics={metrics} />
      ) : (
        <CandidateDashboardSection metrics={metrics as CandidateMetrics} />
      )}
    </div>
  );
}
