import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardSkeleton } from "@/components/route-skeletons";
import { PlatformAdminDashboard } from "@/features/admin/components/platform-admin-dashboard";
import { getPlatformAdminStats } from "@/features/admin/server/functions";

export const Route = createFileRoute("/admin/")({
  loader: () => getPlatformAdminStats(),
  pendingComponent: AdminDashboardSkeleton,
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const stats = Route.useLoaderData();

  return <PlatformAdminDashboard stats={stats} />;
}
