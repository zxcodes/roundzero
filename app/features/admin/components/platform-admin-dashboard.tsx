import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { getPlatformAdminStats } from "@/features/admin/server/functions";
import { formatDateTime } from "@/shared/date";
import { type ApplicationStatus, applicationStatusLabels } from "@/shared/enums";

type PlatformAdminStats = NonNullable<Awaited<ReturnType<typeof getPlatformAdminStats>>>;

type MetricRow = { label: string; value: number };

const formatCount = (value: number) => value.toLocaleString();

const formatShare = (value: number, total: number) => {
  if (total <= 0) {
    return "—";
  }

  return `${Math.round((value / total) * 100)}%`;
};

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card variant="dashboard-tile" tileTone="emphasis" className="gap-0 p-5">
      <p className="text-3xl font-semibold tabular-nums tracking-tight">{formatCount(value)}</p>
      <p className="mt-1.5 text-sm font-medium text-foreground">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

function MetricsPanel({
  title,
  description,
  rows,
  totalLabel,
  totalValue,
}: {
  title: string;
  description?: string;
  rows: MetricRow[];
  totalLabel?: string;
  totalValue?: number;
}) {
  const total = totalValue ?? rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <Card variant="bordered-inset" className="overflow-hidden">
      <div className="border-b border-border/60 px-5 py-4">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="text-muted-foreground">{row.label}</TableCell>
              <TableCell className="text-right font-medium tabular-nums text-foreground">
                {formatCount(row.value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {totalLabel ? (
          <TableFooter>
            <TableRow>
              <TableCell>{totalLabel}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCount(total)}</TableCell>
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </Card>
  );
}

const pipelineApplicationFields: Record<
  ApplicationStatus,
  keyof PlatformAdminStats["pipeline"]["applications"]
> = {
  applied: "applied",
  pre_screening: "preScreening",
  queued_for_batch: "queuedForBatch",
  interview_invited: "interviewInvited",
  interview_in_progress: "interviewInProgress",
  evaluated_held: "evaluatedHeld",
  evaluated: "evaluated",
  shortlisted: "shortlisted",
  rejected: "rejected",
  withdrawn: "withdrawn",
  evaluation_failed: "evaluationFailed",
};

const pipelineStatusOrder = Object.keys(pipelineApplicationFields) as ApplicationStatus[];

function PipelineTable({
  applications,
  total,
}: {
  applications: PlatformAdminStats["pipeline"]["applications"];
  total: number;
}) {
  const rows = pipelineStatusOrder.map((status) => ({
    label: applicationStatusLabels[status],
    value: applications[pipelineApplicationFields[status]],
  }));

  if (total === 0) {
    return (
      <Card variant="dashboard-panel" className="px-6 py-8">
        <h2 className="text-lg font-semibold tracking-tight">Application pipeline</h2>
        <p className="mt-2 text-sm text-muted-foreground">No applications yet.</p>
      </Card>
    );
  }

  return (
    <Card variant="bordered-inset" className="overflow-hidden">
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Application pipeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatCount(total)} applications across all companies, grouped by current status.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Count</TableHead>
            <TableHead className="w-24 text-right">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="text-muted-foreground">{row.label}</TableCell>
              <TableCell className="text-right font-medium tabular-nums text-foreground">
                {formatCount(row.value)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatShare(row.value, total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function PlatformAdminDashboard({ stats }: { stats: PlatformAdminStats }) {
  const applicationTotal = stats.pipeline.applications.total;

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Metrics</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Internal snapshot of users, companies, jobs, and hiring activity.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Updated {formatDateTime(stats.generatedAt)}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">At a glance</h2>
          <p className="text-sm text-muted-foreground">Headline totals across the platform.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Active users" value={stats.overview.activeUsers} />
          <StatCard label="Companies" value={stats.overview.companies} />
          <StatCard label="Open jobs" value={stats.overview.openJobs} />
          <StatCard label="Applications" value={stats.overview.applications} />
          <StatCard
            label="Interviews completed"
            value={stats.overview.interviewsCompleted}
            hint={`${formatCount(stats.interviews.active)} active now`}
          />
          <StatCard
            label="Reports released"
            value={stats.overview.reportsReleased}
            hint={`${formatCount(stats.reports.total - stats.reports.released)} unreleased`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Last 7 days</h2>
          <p className="text-sm text-muted-foreground">New records created this week.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Users" value={stats.recent.newUsers} />
          <StatCard label="Companies" value={stats.recent.newCompanies} />
          <StatCard label="Applications" value={stats.recent.newApplications} />
          <StatCard label="Interviews" value={stats.recent.newInterviews} />
          <StatCard label="Reports" value={stats.recent.newReports} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Platform</h2>
          <p className="text-sm text-muted-foreground">Accounts and billing footprint.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <MetricsPanel
            title="Users"
            rows={[
              { label: "Active", value: stats.users.active },
              { label: "Company accounts", value: stats.users.company },
              { label: "Candidate accounts", value: stats.users.candidate },
              { label: "Unassigned role", value: stats.users.unassigned },
              { label: "Soft-deleted", value: stats.users.deleted },
            ]}
          />
          <MetricsPanel
            title="Companies"
            description={`${formatCount(stats.companies.onboarded)} onboarded of ${formatCount(stats.companies.total)}`}
            rows={[
              { label: "Free plan", value: stats.companies.plans.free },
              { label: "Starter", value: stats.companies.plans.starter },
              { label: "Growth", value: stats.companies.plans.growth },
              { label: "Scale", value: stats.companies.plans.scale },
            ]}
            totalLabel="All companies"
            totalValue={stats.companies.total}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Hiring activity</h2>
          <p className="text-sm text-muted-foreground">
            Jobs, interviews, reports, and AI processing.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <MetricsPanel
            title="Jobs"
            rows={[
              { label: "Active (non-archived)", value: stats.jobs.active },
              { label: "Open", value: stats.jobs.open },
              { label: "Draft", value: stats.jobs.draft },
              { label: "Closed", value: stats.jobs.closed },
              { label: "Archived", value: stats.jobs.archived },
            ]}
          />
          <div className="space-y-4">
            <MetricsPanel
              title="Interviews"
              rows={[
                { label: "Total", value: stats.interviews.total },
                { label: "Completed", value: stats.interviews.completed },
                { label: "Active", value: stats.interviews.active },
                { label: "Cancelled", value: stats.interviews.cancelled },
                { label: "Expired", value: stats.interviews.expired },
              ]}
            />
            <MetricsPanel
              title="Reports & AI"
              rows={[
                { label: "Reports generated", value: stats.reports.total },
                { label: "Released to companies", value: stats.reports.released },
                { label: "Unreleased", value: stats.reports.total - stats.reports.released },
                { label: "Pre-evaluations", value: stats.pipeline.preEvaluations },
                { label: "Job batches", value: stats.pipeline.batches },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <PipelineTable applications={stats.pipeline.applications} total={applicationTotal} />
      </section>
    </div>
  );
}
