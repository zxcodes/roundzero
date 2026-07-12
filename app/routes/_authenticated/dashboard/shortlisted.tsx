import { createFileRoute, redirect } from "@tanstack/react-router";

import { CompanyInboxPageShell } from "@/components/company-inbox-page-shell";
import { DashboardShortlistedSkeleton } from "@/components/route-skeletons";
import { ShortlistedApplicantsList } from "@/features/applications/components/shortlisted-applicants-list";
import { getShortlistedApplicants } from "@/features/applications/server/functions";
import { hasShortlistNextSteps, parseShortlistDetails } from "@/features/applications/shortlist";

export const Route = createFileRoute("/_authenticated/dashboard/shortlisted")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getShortlistedApplicants(),
  pendingComponent: DashboardShortlistedSkeleton,
  component: ShortlistedPage,
});

function ShortlistedPage() {
  const applicants = Route.useLoaderData();
  const roleCount = new Set(applicants.map((applicant) => applicant.jobId)).size;
  const withNextStepsCount = applicants.filter((applicant) =>
    hasShortlistNextSteps(parseShortlistDetails(applicant.metadata)),
  ).length;

  const statItems =
    applicants.length > 0
      ? [
          { value: applicants.length, label: "shortlisted" },
          { value: roleCount, label: roleCount === 1 ? "role" : "roles" },
          { value: withNextStepsCount, label: "with next steps" },
        ]
      : [];

  return (
    <CompanyInboxPageShell
      title="Shortlisted"
      description="Shortlisted candidates across your open roles — copy contact details and manage outreach notes."
      statItems={statItems}
    >
      <ShortlistedApplicantsList applicants={applicants} />
    </CompanyInboxPageShell>
  );
}
