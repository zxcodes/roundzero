import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { AdminFeedbackSkeleton } from "@/components/route-skeletons";
import { PlatformAdminFeedback } from "@/features/admin/components/platform-admin-feedback";
import { adminFeedbackSearchDefaults, adminFeedbackSearchSchema } from "@/features/admin/search";
import { getPlatformAdminFeedback } from "@/features/admin/server/functions";

export const Route = createFileRoute("/admin/feedback")({
  validateSearch: zodValidator(adminFeedbackSearchSchema),
  search: { middlewares: [stripSearchParams(adminFeedbackSearchDefaults)] },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ deps }) =>
    getPlatformAdminFeedback({
      data: { page: deps.page },
    }),
  pendingComponent: AdminFeedbackSkeleton,
  component: AdminFeedbackPage,
});

function AdminFeedbackPage() {
  const data = Route.useLoaderData();

  return <PlatformAdminFeedback data={data} />;
}
