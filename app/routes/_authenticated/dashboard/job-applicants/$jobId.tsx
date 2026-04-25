import {
  ArrowLeft01Icon,
  Briefcase01Icon,
  RankingIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardJobApplicantsSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompanyJobApplicantsList } from "@/features/applications/components/company-job-applicants-list";
import { getJobApplicants } from "@/features/applications/server/functions";
import { getJob } from "@/features/jobs/server/functions";
import { validateUuidParams } from "@/shared/validation";

type JobDetail = NonNullable<Awaited<ReturnType<typeof getJob>>>;

export const Route = createFileRoute("/_authenticated/dashboard/job-applicants/$jobId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
    validateUuidParams({ jobId: params.jobId });
  },
  loader: async ({ params }) => {
    const jobResult = await getJob({ data: { id: params.jobId } });
    if (!jobResult) {
      throw notFound();
    }
    const job: JobDetail = jobResult;

    const applicants = await getJobApplicants({ data: { jobId: params.jobId } });
    return { job, applicants };
  },
  pendingComponent: DashboardJobApplicantsSkeleton,
  component: JobApplicantsPage,
});

function JobApplicantsPage() {
  const { job, applicants } = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState<"evaluated" | "pending">("evaluated");

  const evaluated = applicants.filter((a) => a.reportId !== null);
  const pending = applicants.filter((a) => a.reportId === null);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard/jobs/$jobId" params={{ jobId: job.id }}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to job
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3" />
            {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline" className="gap-1 text-[11px] capitalize">
            <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-3" />
            {job.status}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{job.title}</h2>
        <p className="text-sm text-muted-foreground">
          Review and manage everyone who applied to this role.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border/50">
        <button
          type="button"
          onClick={() => setActiveTab("evaluated")}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "evaluated"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-4" />
          Evaluated
          <Badge variant="secondary" className="font-mono text-[10px]">
            {evaluated.length}
          </Badge>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "pending"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4" />
          Pending
          <Badge variant="secondary" className="font-mono text-[10px]">
            {pending.length}
          </Badge>
        </button>
      </div>

      {activeTab === "evaluated" ? (
        <CompanyJobApplicantsList applicants={evaluated} />
      ) : (
        <CompanyJobApplicantsList applicants={pending} />
      )}
    </div>
  );
}
