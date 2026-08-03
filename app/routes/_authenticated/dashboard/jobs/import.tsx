import { Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { JobImportSkeleton } from "@/components/route-skeletons";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  loader: async ({ context, deps }) => {
    if (!context.entitlements?.jobImport.enabled) {
      return { type: "locked" as const, canUpgrade: context.membershipRole === "owner" };
    }
    if (!deps.batch) return { type: "source" as const };
    const preview = await getJobImportPreview({ data: { batchId: deps.batch } });
    if (!preview) throw notFound();
    return { type: "review" as const, preview };
  },
  pendingComponent: JobImportSkeleton,
  component: JobImportPage,
});

function JobImportPage() {
  const data = Route.useLoaderData();
  if (data.type === "locked") return <JobImportPaywall canUpgrade={data.canUpgrade} />;
  if (data.type === "source") return <ImportSourcePage />;
  return <ImportReviewWorkspace key={data.preview.batchId} initialPreview={data.preview} />;
}

function JobImportPaywall({ canUpgrade }: { canUpgrade: boolean }) {
  return (
    <Empty className="min-h-[32rem] rounded-3xl border bg-muted/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} />
        </EmptyMedia>
        <EmptyTitle>Import existing jobs with Growth</EmptyTitle>
        <EmptyDescription className="max-w-lg">
          Import up to 50 roles from Greenhouse, Lever, Ashby, Recruitee, SmartRecruiters, public
          careers pages, or CSV. Every imported role starts as a draft.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row flex-wrap justify-center">
        {canUpgrade ? (
          <Button asChild>
            <Link to="/dashboard/billing" search={{ plan: "growth" }}>
              Upgrade to Growth
            </Link>
          </Button>
        ) : null}
        <Button variant={canUpgrade ? "outline" : "default"} asChild>
          <Link to="/dashboard/jobs">Back to jobs</Link>
        </Button>
        {!canUpgrade ? (
          <p className="w-full text-center text-xs text-muted-foreground">
            Ask your company owner to upgrade the workspace to Growth.
          </p>
        ) : null}
      </EmptyContent>
    </Empty>
  );
}
