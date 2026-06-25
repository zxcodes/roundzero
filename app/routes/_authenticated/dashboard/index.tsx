import { Alert02Icon, ArrowRight01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { DashboardIndexSkeleton } from "@/components/route-skeletons";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDashboard } from "@/features/dashboard/components/company-dashboard";
import { getDashboardMetrics } from "@/features/dashboard/server/functions";
import { formatRelativeTime } from "@/shared/date";
import { PAGE_SEO } from "@/shared/seo";

type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;
type CandidateMetrics = Extract<DashboardMetrics, { type: "candidate" }>;

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
  companyOwnerDeleted: boolean | string | null;
  interviewStatus: string | null;
};

type ActionItem = {
  id: string;
  tone: "danger" | "warning" | "success" | "neutral";
  title: string;
  description: string;
  link: React.ReactNode;
};

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: PAGE_SEO.dashboard.title },
      { name: "description", content: PAGE_SEO.dashboard.description },
    ],
  }),
  loader: async () => {
    const metrics = await getDashboardMetrics();
    return { metrics };
  },
  pendingComponent: DashboardIndexSkeleton,
  component: DashboardIndexPage,
});

function buildCandidateActionQueue(metrics: CandidateMetrics): ActionItem[] {
  const items: ActionItem[] = [];
  const pending: PendingInterview[] = metrics.pendingInterviews ?? [];
  const shortlisted: ShortlistedApp[] = metrics.shortlistedApplications ?? [];
  const now = Date.now();
  const INTERVIEW_URGENT_HOURS = 4;

  const expiringSoon = pending.filter((p) => {
    if (!p.expiresAt) return false;
    const hoursLeft = (new Date(p.expiresAt).getTime() - now) / (1000 * 60 * 60);
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
      link: (
        <Link to="/interview/$interviewId" params={{ interviewId: p.id }}>
          {isInProgress ? "Continue" : "Start"}
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ),
    });
  }

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
      link: (
        <Link to="/interview/$interviewId" params={{ interviewId: p.id }}>
          {isInProgress ? "Continue" : "Start"}
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ),
    });
  }

  const withFollowUp = shortlisted.filter((s) => s.hasFollowUp);
  if (withFollowUp.length > 0) {
    const s = withFollowUp[0];
    if (!s) {
      return items;
    }
    items.push({
      id: `shortlist-followup-${s.id}`,
      tone: "success",
      title: `Follow-up from ${s.companyName}`,
      description: `for ${s.jobTitle} — they left a note with next steps.`,
      link: (
        <Link to="/dashboard/application/$applicationId" params={{ applicationId: s.id }}>
          View
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      ),
    });
  } else if (shortlisted.length > 0) {
    const s = shortlisted[0];
    if (!s) {
      return items;
    }
    items.push({
      id: `shortlist-${s.id}`,
      tone: "success",
      title: `You're shortlisted for ${s.jobTitle}`,
      description: `at ${s.companyName} — great work.`,
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

const toneDot: Record<ActionItem["tone"], string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  neutral: "bg-muted-foreground/50",
};

function ActionQueueCard({ actions }: { actions: ActionItem[] }) {
  if (actions.length === 0) {
    return (
      <Card>
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
            No interviews or shortlists right now. Browse open roles to apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/jobs">
              Browse roles
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
}

function CandidateDashboardSection({ metrics }: { metrics: CandidateMetrics }) {
  const actions = buildCandidateActionQueue(metrics);
  const headerItems = [
    { label: "Active applications", value: metrics.activeApplications },
    { label: "Interviews pending", value: metrics.pendingInterviews?.length ?? 0 },
    {
      label: "Shortlisted",
      value: metrics.shortlistedCount ?? metrics.shortlistedApplications?.length ?? 0,
    },
    { label: "Evaluations received", value: metrics.evaluationsReceived },
  ];

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
  const isCandidate = auth.type === "candidate";
  const { metrics } = Route.useLoaderData();
  const candidateProfile = auth.type === "candidate" ? auth.candidateProfile : null;
  const company = auth.type === "company" ? auth.company : null;
  const showResumeBanner = isCandidate && candidateProfile && !candidateProfile.resumeKey;
  const canManageCompanyProfile =
    auth.type === "company" && (auth.membershipRole === "owner" || auth.membershipRole === "admin");
  const showCompanyLogoBanner = canManageCompanyProfile && company != null && !company.logoKey;

  const welcomeMessage = (() => {
    if (metrics.type === "company") {
      return null;
    }
    const m = metrics as CandidateMetrics;
    const pendingI = m.pendingInterviews?.length ?? 0;
    if (pendingI > 0) {
      return `${pendingI} interview${pendingI === 1 ? "" : "s"} ready — complete them to move forward.`;
    }
    const active = m.activeApplications;
    if (active > 0) {
      return `${active} active application${active === 1 ? "" : "s"} — ${m.interviewInvites} moved to interview.`;
    }
    return "Here is your applications overview.";
  })();

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      {metrics.type !== "company" ? (
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{firstName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{welcomeMessage}</p>
        </div>
      ) : null}

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
        <CompanyDashboard metrics={metrics} firstName={firstName} />
      ) : (
        <CandidateDashboardSection metrics={metrics as CandidateMetrics} />
      )}
    </div>
  );
}
