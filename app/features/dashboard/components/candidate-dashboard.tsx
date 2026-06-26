import {
  ArrowRight01Icon,
  Briefcase01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { PageInlineStats } from "@/components/page-inline-stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardGreeting } from "@/features/dashboard/components/dashboard-greeting";
import type { getDashboardMetrics } from "@/features/dashboard/server/functions";
import { resolveInterviewAwareCandidateMeta } from "@/features/interviews/shared/candidate-display";
import { formatRelativeTime } from "@/shared/date";

type CandidateMetrics = Extract<
  Awaited<ReturnType<typeof getDashboardMetrics>>,
  { type: "candidate" }
>;

type PendingInterview = NonNullable<CandidateMetrics["pendingInterviews"]>[number];
type ShortlistedApp = NonNullable<CandidateMetrics["shortlistedApplications"]>[number];
type RecentActivityItem = NonNullable<CandidateMetrics["recentActivity"]>[number];

type ActionItem = {
  id: string;
  tone: "danger" | "warning" | "success" | "neutral";
  title: string;
  description: string;
  label: string;
} & (
  | { to: "/interview/$interviewId"; params: { interviewId: string } }
  | { to: "/dashboard/application/$applicationId"; params: { applicationId: string } }
);

const toneDot: Record<ActionItem["tone"], string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  neutral: "bg-muted-foreground/50",
};

const INTERVIEW_URGENT_HOURS = 4;

function buildHeroLines(metrics: CandidateMetrics): string[] {
  const pendingCount = metrics.pendingInterviews?.length ?? 0;
  if (pendingCount > 0) {
    return [
      `${pendingCount} interview${pendingCount === 1 ? "" : "s"} ready — complete ${pendingCount === 1 ? "it" : "them"} to move forward.`,
    ];
  }

  const shortlistedCount = metrics.shortlistedCount ?? metrics.shortlistedApplications?.length ?? 0;
  if (shortlistedCount > 0) {
    return [
      `You're shortlisted for ${shortlistedCount} role${shortlistedCount === 1 ? "" : "s"}.`,
      "Check for any follow-up notes from the company.",
    ];
  }

  if (metrics.activeApplications > 0) {
    return [
      `${metrics.activeApplications} active application${metrics.activeApplications === 1 ? "" : "s"} — ${metrics.interviewInvites} moved to interview.`,
    ];
  }

  return ["Browse open roles to start your next application."];
}

function getPrimaryCta(
  metrics: CandidateMetrics,
): { to: "/interview/$interviewId"; params: { interviewId: string }; label: string } | null {
  const pending = metrics.pendingInterviews ?? [];
  const firstPending = pending[0];
  if (!firstPending) {
    return null;
  }

  const isInProgress = firstPending.status === "in_progress";
  return {
    to: "/interview/$interviewId",
    params: { interviewId: firstPending.id },
    label: isInProgress ? "Continue interview" : "Start interview",
  };
}

function buildCandidateActionQueue(metrics: CandidateMetrics): ActionItem[] {
  const items: ActionItem[] = [];
  const pending: PendingInterview[] = metrics.pendingInterviews ?? [];
  const shortlisted: ShortlistedApp[] = metrics.shortlistedApplications ?? [];
  const now = Date.now();

  const expiringSoon = pending.filter((interview) => {
    if (!interview.expiresAt) {
      return false;
    }
    const hoursLeft = (new Date(interview.expiresAt).getTime() - now) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= INTERVIEW_URGENT_HOURS;
  });

  for (const interview of expiringSoon.slice(0, 1)) {
    const isInProgress = interview.status === "in_progress";
    items.push({
      id: `interview-expiring-${interview.id}`,
      tone: "danger",
      title: isInProgress
        ? `Your interview for ${interview.jobTitle} expires soon`
        : `Interview for ${interview.jobTitle} expires soon`,
      description: `at ${interview.companyName} — ${isInProgress ? "continue" : "complete"} it before the deadline.`,
      to: "/interview/$interviewId",
      params: { interviewId: interview.id },
      label: isInProgress ? "Continue" : "Start",
    });
  }

  for (const interview of pending.slice(0, 2)) {
    if (expiringSoon.some((entry) => entry.id === interview.id)) {
      continue;
    }
    const isInProgress = interview.status === "in_progress";
    items.push({
      id: `interview-${interview.id}`,
      tone: "warning",
      title: isInProgress
        ? `Interview in progress: ${interview.jobTitle}`
        : `Interview ready: ${interview.jobTitle}`,
      description: `at ${interview.companyName}`,
      to: "/interview/$interviewId",
      params: { interviewId: interview.id },
      label: isInProgress ? "Continue" : "Start",
    });
  }

  const withFollowUp = shortlisted.filter((application) => application.hasFollowUp);
  if (withFollowUp.length > 0) {
    const application = withFollowUp[0];
    if (application) {
      items.push({
        id: `shortlist-followup-${application.id}`,
        tone: "success",
        title: `Follow-up from ${application.companyName}`,
        description: `for ${application.jobTitle} — they left a note with next steps.`,
        to: "/dashboard/application/$applicationId",
        params: { applicationId: application.id },
        label: "View",
      });
    }
  } else if (shortlisted.length > 0) {
    const application = shortlisted[0];
    if (application) {
      items.push({
        id: `shortlist-${application.id}`,
        tone: "success",
        title: `You're shortlisted for ${application.jobTitle}`,
        description: `at ${application.companyName} — great work.`,
        to: "/dashboard/application/$applicationId",
        params: { applicationId: application.id },
        label: "View",
      });
    }
  }

  return items.slice(0, 5);
}

function getRecentStatusMeta(app: RecentActivityItem) {
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

  const expiredOverride = resolveInterviewAwareCandidateMeta(status, interviewStatus, {
    badge: "",
    tone: "",
  });
  if (interviewStatus === "expired") {
    return { badge: expiredOverride.badge, tone: expiredOverride.tone };
  }

  if (
    (status === "interview_invited" || status === "interview_in_progress") &&
    interviewStatus === "completed"
  ) {
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
      return { badge: "Interview ready", tone: "border-warning/20 bg-warning/10 text-warning" };
    case "interview_in_progress":
      return {
        badge: "Interview in progress",
        tone: "border-warning/20 bg-warning/10 text-warning",
      };
    case "evaluated":
    case "evaluated_held":
      return {
        badge: "Awaiting company decision",
        tone: "border-success/20 bg-success/10 text-success",
      };
    default:
      return { badge: "Application received", tone: "border-info/20 bg-info/10 text-info" };
  }
}

function HeroSection({ firstName, metrics }: { firstName: string; metrics: CandidateMetrics }) {
  const heroLines = buildHeroLines(metrics);
  const primaryCta = getPrimaryCta(metrics);
  const statItems = [
    { value: metrics.activeApplications, label: "active applications" },
    { value: metrics.pendingInterviews?.length ?? 0, label: "interviews pending" },
    {
      value: metrics.shortlistedCount ?? metrics.shortlistedApplications?.length ?? 0,
      label: "shortlisted",
    },
    { value: metrics.evaluationsReceived, label: "evaluations received" },
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
        {primaryCta ? (
          <Button asChild>
            <Link
              to={primaryCta.to}
              params={primaryCta.params}
              className="no-underline hover:no-underline"
            >
              {primaryCta.label}
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link to="/dashboard/jobs" className="no-underline hover:no-underline">
              Browse open roles
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>

      <PageInlineStats items={statItems} />
    </section>
  );
}

function ActionQueueRow({ action }: { action: ActionItem }) {
  return (
    <Link
      to={action.to}
      params={action.params}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 md:gap-4 md:px-5"
    >
      <span className={`mt-0.5 size-2 shrink-0 rounded-full ${toneDot[action.tone]}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold group-hover:text-primary">{action.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
      </div>
      <span className="shrink-0 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
        {action.label}
      </span>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2}
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
      />
    </Link>
  );
}

function ActionQueueSection({ actions }: { actions: ActionItem[] }) {
  if (actions.length === 0) {
    return (
      <Card variant="dashboard-panel" className="px-6 py-8">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={2}
            className="size-5 text-success"
          />
          <h2 className="text-lg font-semibold tracking-tight">You&apos;re all caught up</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          No interviews or shortlists right now. Browse open roles to apply.
        </p>
        <Button variant="outline" size="sm" className="mt-5" asChild>
          <Link to="/dashboard/jobs" className="no-underline hover:no-underline">
            Browse roles
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Action queue</h2>
          <p className="text-sm text-muted-foreground">
            Top things to handle next, in priority order.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{actions.length} pending</span>
      </div>

      <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60">
        {actions.map((action) => (
          <ActionQueueRow key={action.id} action={action} />
        ))}
      </div>
    </section>
  );
}

function RecentActivityRow({ application }: { application: RecentActivityItem }) {
  const meta = getRecentStatusMeta(application);

  return (
    <Link
      to="/dashboard/application/$applicationId"
      params={{ applicationId: application.id }}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 md:gap-4 md:px-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold group-hover:text-primary">
            {application.jobTitle}
          </p>
          <Badge variant="outline" className={meta.tone}>
            {meta.badge}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{application.companyName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Updated {formatRelativeTime(application.updatedAt)}
        </p>
      </div>

      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2}
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
      />
    </Link>
  );
}

function RecentActivitySection({ activity }: { activity: RecentActivityItem[] }) {
  if (activity.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Recent activity</h2>
        <p className="text-sm text-muted-foreground">Your most recently updated applications.</p>
      </div>

      <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60">
        {activity.map((application) => (
          <RecentActivityRow key={application.id} application={application} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/applications" className="no-underline hover:no-underline">
            View all applications
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/jobs" className="no-underline hover:no-underline">
            <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-3.5" />
            Browse open roles
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function CandidateDashboard({
  metrics,
  firstName,
}: {
  metrics: CandidateMetrics;
  firstName: string;
}) {
  const actions = buildCandidateActionQueue(metrics);
  const activity = metrics.recentActivity ?? [];

  return (
    <div className="space-y-8">
      <HeroSection firstName={firstName} metrics={metrics} />
      <ActionQueueSection actions={actions} />
      <RecentActivitySection activity={activity} />
      {activity.length === 0 ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/jobs" className="no-underline hover:no-underline">
              <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-3.5" />
              Browse open roles
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
