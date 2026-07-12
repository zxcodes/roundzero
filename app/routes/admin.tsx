import {
  createFileRoute,
  notFound,
  Outlet,
  redirect,
  useMatches,
  useRouteContext,
} from "@tanstack/react-router";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminHeader } from "@/features/admin/components/admin-header";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { noindexHead } from "@/shared/seo";

export const Route = createFileRoute("/admin")({
  head: () => noindexHead(),
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/" });
    }

    if (!context.user.isPlatformAdmin) {
      throw notFound();
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useRouteContext({ from: "__root__" });
  const matches = useMatches();
  const lastMatch = matches[matches.length - 1];
  const routeId = lastMatch?.routeId ?? "";

  if (!user) {
    return null;
  }

  return (
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
  );
}
