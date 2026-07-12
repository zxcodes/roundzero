import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { DashboardJobOutletSkeleton } from "@/components/route-skeletons";
import { getJobApplicants, hasApplied } from "@/features/applications/server/functions";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { getJob } from "@/features/jobs/server/functions";
import { buildJobPageSeo } from "@/shared/seo";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/$jobId")({
  beforeLoad: ({ params }) => {
    validateUuidParams({ jobId: params.jobId });
  },
  loader: async ({ params, context }) => {
    const jobResult = await getJob({ data: { id: params.jobId } });
    if (!jobResult) {
      throw notFound();
    }

    if (context.isCompany) {
      const applicants = await getJobApplicants({ data: { jobId: params.jobId } });
      return { type: "company" as const, job: jobResult, applicants };
    }

    const alreadyAppliedPromise =
      jobResult.status === "open"
        ? hasApplied({ data: { jobId: params.jobId } })
        : (Promise.resolve(false as const) as Promise<boolean>);
    const [alreadyApplied, candidateProfile] = await Promise.all([
      alreadyAppliedPromise,
      getMyCandidateProfile(),
    ]);
    return { type: "candidate" as const, job: jobResult, alreadyApplied, candidateProfile };
  },
  head: ({ loaderData }) => {
    const job = loaderData?.job ?? null;
    if (!job) {
      return { meta: [{ title: "Job | RoundZero" }] };
    }

    return { meta: [{ title: buildJobPageSeo(job).title }] };
  },
  pendingComponent: DashboardJobOutletSkeleton,
  component: JobLayout,
});

function JobLayout() {
  return <Outlet />;
}
