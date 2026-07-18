import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { DashboardJobOutletSkeleton } from "@/components/route-skeletons";
import { getAuthenticatedJobDetail } from "@/features/jobs/server/functions";
import { buildJobPageSeo } from "@/shared/seo";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/$jobId")({
  beforeLoad: ({ params }) => {
    validateUuidParams({ jobId: params.jobId });
  },
  loader: async ({ params }) => {
    const data = await getAuthenticatedJobDetail({ data: { id: params.jobId } });
    if (!data) {
      throw notFound();
    }
    return data;
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
