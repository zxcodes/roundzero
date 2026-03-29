import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type CandidateMetrics,
  type CompanyMetrics,
  getDashboardMetrics,
} from "@/features/dashboard/server/functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  loader: async () => {
    const metrics = await getDashboardMetrics();
    return { metrics };
  },
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

function DashboardIndexPage() {
  const { user, isCompany } = Route.useRouteContext();
  const { metrics } = Route.useLoaderData();

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
    </div>
  );
}
