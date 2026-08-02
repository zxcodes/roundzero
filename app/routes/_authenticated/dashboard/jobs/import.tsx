import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { JobImportSkeleton } from "@/components/route-skeletons";
import { ImportReviewWorkspace } from "@/features/job-imports/components/import-review-workspace";
import { ImportSourcePage } from "@/features/job-imports/components/import-source-page";
import { getJobImportPreview } from "@/features/job-imports/server/functions";

const searchSchema = z.object({ batch: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/dashboard/jobs/import")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) throw redirect({ to: "/dashboard" });
  },
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ batch: search.batch }),
  loader: async ({ deps }) => {
    if (!deps.batch) return null;
    const preview = await getJobImportPreview({ data: { batchId: deps.batch } });
    if (!preview) throw notFound();
    return preview;
  },
  pendingComponent: JobImportSkeleton,
  component: JobImportPage,
});

function JobImportPage() {
  const preview = Route.useLoaderData();
  if (!preview) return <ImportSourcePage />;
  return <ImportReviewWorkspace key={preview.batchId} initialPreview={preview} />;
}
