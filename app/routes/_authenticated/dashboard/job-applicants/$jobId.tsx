import { ArrowLeft01Icon, Briefcase01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { DashboardJobApplicantsSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyJobApplicantsList } from "@/features/applications/components/company-job-applicants-list";
import { getJobApplicants } from "@/features/applications/server/functions";
import { getJob } from "@/features/jobs/server/functions";

export const Route = createFileRoute("/_authenticated/dashboard/job-applicants/$jobId")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async ({ params }) => {
    const [job, applicants] = await Promise.all([
      getJob({ data: { id: params.jobId } }),
      getJobApplicants({ data: { jobId: params.jobId } }),
    ]);

    return { job, applicants };
  },
  pendingComponent: DashboardJobApplicantsSkeleton,
  component: JobApplicantsPage,
});

function JobApplicantsPage() {
  const { job, applicants } = Route.useLoaderData();

  return (
    <div className="animate-fade-in space-y-6">
      <Card size="sm" className="border-border/70 bg-card">
        <CardContent className="space-y-4 py-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="-ml-2">
                <Link to="/dashboard/jobs/$jobId" params={{ jobId: job.id }}>
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                  Back to job
                </Link>
              </Button>
              <Badge variant="outline" className="font-mono text-[11px]">
                Applicants
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_top_left,var(--color-primary)/10%,transparent_48%),linear-gradient(160deg,color-mix(in_oklab,var(--color-primary)_6%,transparent),transparent_60%)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">{job.title}</h2>
                <p className="text-sm text-muted-foreground">
                  Review and manage everyone who applied to this role.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                  <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3" />
                  {applicants.length} applicants
                </Badge>
                <Badge variant="outline" className="gap-1 text-[11px] capitalize">
                  <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-3" />
                  {job.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CompanyJobApplicantsList jobId={job.id} applicants={applicants} />
    </div>
  );
}
