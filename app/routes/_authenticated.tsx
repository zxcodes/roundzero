import { createFileRoute, Outlet, redirect, useMatches } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/" });
    }
    if (!context.user.role) {
      // User authenticated but no role — shouldn't happen with role-based login
      throw redirect({ to: "/" });
    }
  },
  component: AuthenticatedLayout,
});

const routeTitles: Record<string, string> = {
  "/_authenticated/dashboard/": "Overview",
  "/_authenticated/dashboard/jobs/": "Jobs",
  "/_authenticated/dashboard/jobs/new": "Post a Job",
  "/_authenticated/dashboard/jobs/$jobId": "Job Details",
  "/_authenticated/dashboard/applications": "My Applications",
  "/_authenticated/onboarding/company": "Company Setup",
};

function AuthenticatedLayout() {
  const { user, isCompany } = Route.useRouteContext();
  const matches = useMatches();
  const lastMatch = matches[matches.length - 1];
  const title = routeTitles[lastMatch?.routeId ?? ""] ?? "Dashboard";

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
          <SiteHeader title={title} />
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
