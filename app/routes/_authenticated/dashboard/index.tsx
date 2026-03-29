import { ArrowDownRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardIndexPage,
});

function DashboardIndexPage() {
  const { user, isCompany } = Route.useRouteContext();

  const metrics = isCompany
    ? [
        {
          label: "Open Roles",
          value: "18",
          trend: "+12%",
          description: "6 new jobs posted this month",
          up: true,
        },
        {
          label: "Total Applicants",
          value: "1,243",
          trend: "+8.5%",
          description: "Candidate flow remains healthy",
          up: true,
        },
        {
          label: "Interview Pass Rate",
          value: "42%",
          trend: "-4%",
          description: "Slight dip from previous period",
          up: false,
        },
        {
          label: "Avg. Time To Hire",
          value: "11 days",
          trend: "-18%",
          description: "Faster than last quarter",
          up: true,
        },
      ]
    : [
        {
          label: "Applications Sent",
          value: "24",
          trend: "+4",
          description: "4 new applications this week",
          up: true,
        },
        {
          label: "Interview Invites",
          value: "7",
          trend: "+2",
          description: "2 new invites in the last 14 days",
          up: true,
        },
        {
          label: "Evaluation Score",
          value: "8.1",
          trend: "+0.6",
          description: "Average across completed interviews",
          up: true,
        },
        {
          label: "Active Pipelines",
          value: "5",
          trend: "-1",
          description: "One process moved to final decision",
          up: false,
        },
      ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening with your {isCompany ? "hiring pipeline" : "applications"}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric, i) => (
          <Card key={metric.label} className={`animate-fade-in stagger-${i + 1}`}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div>
                <CardDescription className="text-xs">{metric.label}</CardDescription>
                <CardTitle className="mt-1.5 font-mono text-3xl font-semibold tracking-tight">
                  {metric.value}
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className={`gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] ${
                  metric.up
                    ? "border-emerald-500/20 text-emerald-500"
                    : "border-amber-500/20 text-amber-500"
                }`}
              >
                <HugeiconsIcon
                  icon={metric.up ? ArrowUpRight01Icon : ArrowDownRight01Icon}
                  strokeWidth={2}
                  className="size-3"
                />
                {metric.trend}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="animate-fade-in stagger-5">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Activity Trend</CardTitle>
            <CardDescription className="mt-1 text-xs">
              {isCompany
                ? "Interview and application activity over the last 3 months"
                : "Application and interview progress over the last 3 months"}
            </CardDescription>
          </div>
          <ToggleGroup type="single" defaultValue="90d" variant="outline">
            <ToggleGroupItem value="90d" className="text-xs">
              3 months
            </ToggleGroupItem>
            <ToggleGroupItem value="30d" className="text-xs">
              30 days
            </ToggleGroupItem>
            <ToggleGroupItem value="7d" className="text-xs">
              7 days
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/30">
            <p className="text-xs text-muted-foreground">Chart data will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
