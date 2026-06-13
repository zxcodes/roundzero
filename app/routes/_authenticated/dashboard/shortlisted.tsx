import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardShortlistedSkeleton } from "@/components/route-skeletons";
import { ShortlistedApplicantsList } from "@/features/applications/components/shortlisted-applicants-list";
import { getShortlistedApplicants } from "@/features/applications/server/functions";

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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Shortlisted</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Review every shortlisted candidate across your open roles, copy contact details quickly,
          and update the note or link each candidate sees.
        </p>
      </div>

      <ShortlistedApplicantsList applicants={applicants} />
    </div>
  );
}
