import { createFileRoute, redirect } from "@tanstack/react-router";
import { CompanyInboxPageShell } from "@/components/company-inbox-page-shell";
import { DashboardAwaitingReviewSkeleton } from "@/components/route-skeletons";
import { AwaitingReviewApplicantsList } from "@/features/dashboard/components/awaiting-review-applicants-list";
import { getAwaitingReviewReports } from "@/features/dashboard/server/functions";
import { recommendationLabels } from "@/shared/enums";

export const Route = createFileRoute("/_authenticated/dashboard/awaiting-review")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getAwaitingReviewReports(),
  pendingComponent: DashboardAwaitingReviewSkeleton,
  component: AwaitingReviewPage,
});

function AwaitingReviewPage() {
  const candidates = Route.useLoaderData();
  const roleCount = new Set(candidates.map((candidate) => candidate.jobId)).size;
  const strongShortlistCount = candidates.filter(
    (candidate) => candidate.recommendation === "strong_yes",
  ).length;

  const statItems =
    candidates.length > 0
      ? [
          { value: candidates.length, label: "awaiting review" },
          { value: roleCount, label: roleCount === 1 ? "role" : "roles" },
          {
            value: strongShortlistCount,
            label: recommendationLabels.strong_yes.toLowerCase(),
          },
        ]
      : [];

  return (
    <CompanyInboxPageShell
      title="Awaiting review"
      description="Reports waiting on a shortlist or reject decision, grouped by role."
      statItems={statItems}
    >
      <AwaitingReviewApplicantsList candidates={candidates} />
    </CompanyInboxPageShell>
  );
}
