import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageInlineStats } from "@/components/page-inline-stats";
import { DashboardAwaitingReviewSkeleton } from "@/components/route-skeletons";
import { AwaitingReviewApplicantsList } from "@/features/dashboard/components/awaiting-review-applicants-list";
import { getAwaitingReviewReports } from "@/features/dashboard/server/functions";

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
          { value: strongShortlistCount, label: "strong shortlist" },
        ]
      : [];

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Awaiting review</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Reports waiting on a shortlist or reject decision, grouped by role.
          </p>
        </div>

        <PageInlineStats items={statItems} />

        <AwaitingReviewApplicantsList candidates={candidates} />
      </section>
    </div>
  );
}
