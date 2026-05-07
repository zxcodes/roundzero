import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardMetrics } from "@/features/dashboard/server/functions";

type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;
type CompanyMetrics = Extract<DashboardMetrics, { type: "company" }>;
type CandidateMetrics = Extract<DashboardMetrics, { type: "candidate" }>;

export const Route = createFileRoute("/_authenticated/dashboard/")({
  loader: async () => {
    const metrics = await getDashboardMetrics();
    return { metrics };
  },
  pendingComponent: DashboardIndexSkeleton,
  component: DashboardIndexPage,
});

type MetricCard = {
  label: string;
  value: string;
  description: string;
};

const buildCompanyMetrics = (m: CompanyMetrics): MetricCard[] => [
  {
    label: "Open Roles",
    value: String(m.openRoles),
    description: `${m.totalJobs} total jobs posted`,
  },
  {
    label: "Total Applicants",
    value: String(m.totalApplicants),
    description: "Across all your job postings",
  },
  {
    label: "Draft Jobs",
    value: String(m.draftJobs),
    description: "Unpublished jobs awaiting review",
  },
  {
    label: "Total Jobs",
    value: String(m.totalJobs),
    description: "All jobs in your pipeline",
  },
];

const buildCandidateMetrics = (m: CandidateMetrics): MetricCard[] => [
  {
    label: "Applications Sent",
    value: String(m.applicationsSent),
    description: "Total applications submitted",
  },
  {
    label: "Active Applications",
    value: String(m.activeApplications),
    description: "Applications still in progress",
  },
  {
    label: "Interview Invites",
    value: String(m.interviewInvites),
    description: "Applications moved to interview stage",
  },
  {
    label: "Evaluations Received",
    value: String(m.evaluationsReceived),
    description: "Completed interview evaluations",
  },
];

const formatRecommendation = (value: string) => {
  if (value === "strong_yes" || value === "strong_hire") {
    return "Strong yes";
  }

  if (value === "yes" || value === "consider") {
    return "Yes";
  }

  if (value === "lean_no") {
    return "Lean no";
  }

  if (value === "no" || value === "not_recommended") {
    return "No";
  }

  return "Unknown";
};

const recommendationTone = (value: string) => {
  if (value === "strong_yes" || value === "strong_hire") {
    return "border-success/25 bg-success/10 text-success";
  }

  if (value === "yes" || value === "consider") {
    return "border-info/25 bg-info/10 text-info";
  }

  if (value === "lean_no") {
    return "border-warning/25 bg-warning/10 text-warning";
  }

  if (value === "no" || value === "not_recommended") {
    return "border-danger/25 bg-danger/10 text-danger";
  }

  return "border-muted bg-muted/30 text-muted-foreground";
};

const recommendationSurfaceTone = (value: string) => {
  if (value === "strong_yes" || value === "strong_hire") {
    return "from-success/20 via-success/5 to-transparent";
  }

  if (value === "yes" || value === "consider") {
    return "from-info/20 via-info/5 to-transparent";
  }

  if (value === "lean_no") {
    return "from-warning/20 via-warning/5 to-transparent";
  }

  if (value === "no" || value === "not_recommended") {
    return "from-danger/20 via-danger/5 to-transparent";
  }

  return "from-muted/30 via-muted/10 to-transparent";
};

const toInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "--";
};

function CompanyDashboardSection({ metrics }: { metrics: CompanyMetrics }) {
  const backlogRoles = metrics.roleHealth.filter((role) => role.backlog > 0).slice(0, 3);
  const expiringRoles = metrics.roleHealth
    .filter((role) => role.expiresInDays !== null && role.expiresInDays <= 7)
    .sort((a, b) => (a.expiresInDays ?? 999) - (b.expiresInDays ?? 999))
    .slice(0, 3);
  const quickReportCards = metrics.reportHighlights.slice(0, 6);
  const topReports = metrics.reportHighlights.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Open Roles</CardDescription>
            <CardTitle className="font-mono text-3xl">{metrics.openRoles}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {metrics.totalJobs} total roles configured.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Applicants</CardDescription>
            <CardTitle className="font-mono text-3xl">{metrics.totalApplicants}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Across active job postings.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Decision Backlog</CardDescription>
            <CardTitle className="font-mono text-3xl">
              {metrics.evaluatedAwaitingDecision}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Evaluated candidates awaiting shortlist/reject.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Shortlist Rate</CardDescription>
            <CardTitle className="font-mono text-3xl">{metrics.shortlistRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {metrics.reportsCompleted} reports completed.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Action Queue</CardTitle>
            <CardDescription>High-priority hiring actions you can clear now.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Decision backlog</p>
              <p className="mt-1 font-mono text-2xl font-semibold">
                {metrics.evaluatedAwaitingDecision}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Evaluated candidates waiting on a decision.
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Expiring roles (7d)</p>
              <p className="mt-1 font-mono text-2xl font-semibold">{expiringRoles.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Open roles that will close soon.</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Reports to review</p>
              <p className="mt-1 font-mono text-2xl font-semibold">{quickReportCards.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Strongest report cards available now.
              </p>
            </div>

            <div className="rounded-lg border p-3 md:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Top pending decision roles</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/jobs">Open role manager</Link>
                </Button>
              </div>

              {backlogRoles.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {backlogRoles.map((role) => (
                    <Button key={role.jobId} variant="secondary" size="sm" asChild>
                      <Link to="/dashboard/job-applicants/$jobId" params={{ jobId: role.jobId }}>
                        {role.title} ({role.backlog})
                      </Link>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">No decision backlog right now.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiring Soon</CardTitle>
            <CardDescription>Roles with upcoming close windows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiringRoles.length > 0 ? (
              expiringRoles.map((role) => (
                <div key={role.jobId} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{role.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {role.expiresInDays} day{role.expiresInDays === 1 ? "" : "s"} left
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No roles expiring within 7 days.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Health</CardTitle>
          <CardDescription>Pipeline and quota visibility per active role.</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.roleHealth.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Applicants</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Quota</TableHead>
                  <TableHead>Backlog</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.roleHealth.map((role) => (
                  <TableRow key={role.jobId}>
                    <TableCell className="font-medium">{role.title}</TableCell>
                    <TableCell>{role.applicants}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      A:{role.applied} / P:{role.preScreening} / I:{role.invited} / IP:
                      {role.inProgress} / E:{role.evaluated} / S:{role.shortlisted}
                    </TableCell>
                    <TableCell>
                      {role.reportsCompleted}/{role.finalReportTarget}
                    </TableCell>
                    <TableCell>{role.backlog}</TableCell>
                    <TableCell>
                      {role.expiresInDays !== null ? `${role.expiresInDays}d` : "No deadline"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/dashboard/job-applicants/$jobId" params={{ jobId: role.jobId }}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
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
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-card via-card to-secondary/30">
        <CardHeader>
          <CardTitle>Reports Studio</CardTitle>
          <CardDescription>
            Highest-signal evaluations for quick shortlist/reject decisions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quickReportCards.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {quickReportCards.map((report) => (
                <Card
                  key={report.applicationId}
                  className="overflow-hidden border-foreground/10 bg-background/80"
                >
                  <div
                    className={`h-1 w-full bg-linear-to-r ${recommendationSurfaceTone(report.recommendation)}`}
                  />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar className="size-8 rounded-md border">
                          <AvatarFallback className="rounded-md text-xs">
                            {toInitials(report.candidateName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">
                            {report.candidateName}
                          </CardTitle>
                          <CardDescription className="mt-1 truncate text-xs">
                            {report.jobTitle}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={recommendationTone(report.recommendation)}>
                        {formatRecommendation(report.recommendation)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-md border bg-muted/30 p-2.5">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Overall score</p>
                          <p className="font-mono text-xl font-semibold">
                            {report.overallScore ?? "--"}
                            <span className="text-sm text-muted-foreground">/100</span>
                          </p>
                        </div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Decision signal
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{
                            width: `${Math.max(0, Math.min(100, report.overallScore ?? 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          to="/dashboard/applicant-reports/$applicationId"
                          params={{ applicationId: report.applicationId }}
                        >
                          View report
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          to="/dashboard/applicants/$applicationId"
                          params={{ applicationId: report.applicationId }}
                        >
                          Open applicant
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No report highlights yet</EmptyTitle>
                <EmptyDescription>
                  As interviews complete, top evaluation cards will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {topReports.length > 0 ? (
            <div className="mt-4 rounded-lg border bg-background/70 p-3">
              <p className="text-sm font-medium">Fast review shortcuts</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {topReports.map((report) => (
                  <Button
                    key={`quick-${report.applicationId}`}
                    variant="secondary"
                    size="sm"
                    asChild
                  >
                    <Link
                      to="/dashboard/applicant-reports/$applicationId"
                      params={{ applicationId: report.applicationId }}
                    >
                      {report.candidateName} ({report.overallScore ?? "--"})
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardIndexPage() {
  const context = Route.useRouteContext();
  const { user, isCompany, isCandidate } = context;
  const { metrics } = Route.useLoaderData();
  const candidateProfile = context.candidateProfile;
  const company = context.company;
  const showResumeBanner = isCandidate && candidateProfile && !candidateProfile.resumeKey;
  const showCompanyLogoBanner = isCompany && company && !company.logoKey;

  const cards =
    metrics.type === "company" ? buildCompanyMetrics(metrics) : buildCandidateMetrics(metrics);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening with your {isCompany ? "hiring pipeline" : "applications"}.
        </p>
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
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((card, i) => (
            <Card key={card.label} className={`animate-fade-in stagger-${i + 1}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div>
                  <CardDescription className="text-xs">{card.label}</CardDescription>
                  <CardTitle className="mt-1.5 font-mono text-3xl font-semibold tracking-tight">
                    {card.value}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
