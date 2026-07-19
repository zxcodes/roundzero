import { createFileRoute, notFound, Outlet, redirect, useMatches } from "@tanstack/react-router";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminHeader } from "@/features/admin/components/admin-header";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { AuthProvider } from "@/features/auth/provider";
import { currentUserQueryKey, getCurrentUser } from "@/features/auth/server/functions";
import { noindexHead } from "@/shared/seo";

export const Route = createFileRoute("/admin")({
  head: () => noindexHead(),
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.fetchQuery({
      queryKey: currentUserQueryKey,
      queryFn: () => getCurrentUser(),
      staleTime: 30_000,
    });

    if (!user) {
      throw redirect({ to: "/" });
    }

    if (!user.isPlatformAdmin) {
      throw notFound();
    }

    return {
      user,
      isCompany: user.role === "company",
      isCandidate: user.role === "candidate",
    };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const matches = useMatches();
  const lastMatch = matches[matches.length - 1];
  const routeId = lastMatch?.routeId ?? "";

  if (!user) {
    return null;
  }

  return (
    <AuthProvider>
      <TooltipProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
            } as { [key: string]: string }
          }
        >
          <AdminSidebar user={user} variant="inset" />
          <SidebarInset>
            <AdminHeader routeId={routeId} />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
              <div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <Outlet />
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}
