import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";

import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CandidateDashboard } from "@/features/dashboard/components/candidate-dashboard";
import { CompanyDashboard } from "@/features/dashboard/components/company-dashboard";
import { getDashboardMetrics } from "@/features/dashboard/server/functions";
import { PAGE_SEO } from "@/shared/seo";

type DashboardMetricsResult = Awaited<ReturnType<typeof getDashboardMetrics>>;
type CompanyDashboardMetrics = Extract<DashboardMetricsResult, { type: "company" }>;
type CandidateDashboardMetrics = Extract<DashboardMetricsResult, { type: "candidate" }>;

function expectCompanyMetrics(metrics: DashboardMetricsResult): CompanyDashboardMetrics {
  if (metrics.type !== "company") {
    throw new Error(`Expected company dashboard metrics, received ${metrics.type}`);
  }

  return metrics;
}

function expectCandidateMetrics(metrics: DashboardMetricsResult): CandidateDashboardMetrics {
  if (metrics.type !== "candidate") {
    throw new Error(`Expected candidate dashboard metrics, received ${metrics.type}`);
  }

  return metrics;
}

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: PAGE_SEO.dashboard.title },
      { name: "description", content: PAGE_SEO.dashboard.description },
    ],
  }),
  // Single deferred server-fn round trip. We fan out its streamed section
  // promises here (local promise composition, no extra network) so the final
  // dashboard tree mounts immediately with only the per-section skeletons —
  // avoiding a second, remounted skeleton phase (the "double flash").
  loader: ({ context }) => {
    const role = context.user?.role;
    if (role !== "company" && role !== "candidate") {
      throw new Error("Dashboard requires an authenticated user role");
    }

    const metricsPromise = getDashboardMetrics();

    if (role === "company") {
      const companyMetrics = metricsPromise.then(expectCompanyMetrics);

      return {
        type: "company" as const,
        hero: companyMetrics.then((metrics) => metrics.hero),
        awaitingReview: companyMetrics.then((metrics) => metrics.awaitingReview),
        rolesNeedingAttention: companyMetrics.then((metrics) => metrics.rolesNeedingAttention),
        recentActivity: companyMetrics.then((metrics) => metrics.recentActivity),
      } satisfies CompanyDashboardMetrics;
    }

    const candidateMetrics = metricsPromise.then(expectCandidateMetrics);

    return {
      type: "candidate" as const,
      hero: candidateMetrics.then((metrics) => metrics.hero),
      recentActivity: candidateMetrics.then((metrics) => metrics.recentActivity),
    } satisfies CandidateDashboardMetrics;
  },
  component: DashboardIndexPage,
});

function DashboardIndexPage() {
  const auth = useLoaderData({ from: "/_authenticated" });
  const metrics = Route.useLoaderData();
  const candidateProfile = auth.type === "candidate" ? auth.candidateProfile : null;
  const company = auth.type === "company" ? auth.company : null;
  const showResumeBanner =
    auth.type === "candidate" && candidateProfile && !candidateProfile.resumeKey;
  const canManageCompanyProfile =
    auth.type === "company" && (auth.membershipRole === "owner" || auth.membershipRole === "admin");
  const showCompanyLogoBanner = canManageCompanyProfile && company != null && !company.logoKey;
  const firstName = auth.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
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

      <DashboardMetrics metrics={metrics} firstName={firstName} />
    </div>
  );
}

type DashboardMetrics = CompanyDashboardMetrics | CandidateDashboardMetrics;

function DashboardMetrics({
  metrics,
  firstName,
}: {
  metrics: DashboardMetrics;
  firstName: string;
}) {
  if (metrics.type === "company") {
    return <CompanyDashboard metrics={metrics} firstName={firstName} />;
  }

  return <CandidateDashboard metrics={metrics} firstName={firstName} />;
}
