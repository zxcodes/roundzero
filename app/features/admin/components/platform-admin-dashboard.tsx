import { Card } from "@/components/ui/card";
import type { getPlatformAdminStats } from "@/features/admin/server/functions";
import { formatDateTime } from "@/shared/date";

type PlatformAdminStats = NonNullable<Awaited<ReturnType<typeof getPlatformAdminStats>>>;

const formatCount = (value: number) => value.toLocaleString();

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card variant="dashboard-tile" tileTone="emphasis" className="gap-0 p-5">
      <p className="text-3xl font-semibold tabular-nums tracking-tight">{formatCount(value)}</p>
      <p className="mt-1.5 text-sm font-medium text-foreground">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

export function PlatformAdminDashboard({ stats }: { stats: PlatformAdminStats }) {
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
    </div>
  );
}
