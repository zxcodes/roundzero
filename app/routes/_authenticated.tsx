import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    if (!context.user.role) {
      throw redirect({ to: "/choose-role" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, isCompany } = Route.useRouteContext();

  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
          } as { [key: string]: string }
        }
      >
        <AppSidebar user={user!} isCompany={isCompany} variant="inset" />
        <SidebarInset>
          <SiteHeader title="Dashboard" />
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
