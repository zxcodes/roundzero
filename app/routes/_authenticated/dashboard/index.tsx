import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { DeferredSection } from "@/components/deferred-section";
import { DashboardIndexContentSkeleton } from "@/components/route-skeletons";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CandidateDashboard } from "@/features/dashboard/components/candidate-dashboard";
import { CompanyDashboard } from "@/features/dashboard/components/company-dashboard";
import { getDashboardMetrics } from "@/features/dashboard/server/functions";
import { PAGE_SEO } from "@/shared/seo";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: PAGE_SEO.dashboard.title },
      { name: "description", content: PAGE_SEO.dashboard.description },
    ],
  }),
  loader: () => ({
    deferredMetrics: getDashboardMetrics(),
  }),
  component: DashboardIndexPage,
});

function DashboardIndexPage() {
  const auth = useLoaderData({ from: "/_authenticated" });
  const { deferredMetrics } = Route.useLoaderData();
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

      <DeferredSection
        promise={deferredMetrics}
        fallback={
          <DashboardIndexContentSkeleton
            firstName={firstName}
            isCompany={auth.type === "company"}
          />
        }
        sectionLabel="dashboard"
      >
        {(metrics) => <DashboardMetrics metrics={metrics} firstName={firstName} />}
      </DeferredSection>
    </div>
  );
}

type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;

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
