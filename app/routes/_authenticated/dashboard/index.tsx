import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardIndexPage,
});

function DashboardIndexPage() {
  const { user, isCompany } = Route.useRouteContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}</h2>
        <p className="text-muted-foreground">
          Here's what's happening with your {isCompany ? "hiring pipeline" : "applications"}.
        </p>
      </div>
    </div>
  );
}
