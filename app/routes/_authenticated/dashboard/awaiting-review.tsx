import { createFileRoute, redirect } from "@tanstack/react-router";
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

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Awaiting review</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Reports waiting on a shortlist or reject decision, grouped by role.
            </p>
          </div>
          {candidates.length > 0 ? (
            <span className="font-mono text-sm text-muted-foreground">
              {candidates.length} total
            </span>
          ) : null}
        </div>

        <AwaitingReviewApplicantsList candidates={candidates} />
      </section>
    </div>
  );
}
