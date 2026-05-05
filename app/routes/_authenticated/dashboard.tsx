import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { DashboardLayoutSkeleton } from "@/components/route-skeletons";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getMyNotificationsFeed } from "@/features/notifications/server/functions";
import { useCommandPaletteShortcut } from "@/hooks/use-command-palette-shortcut";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: async () => {
    return {
      notificationsFeed: await getMyNotificationsFeed(),
    };
  },
  pendingComponent: DashboardLayoutSkeleton,
  component: DashboardLayout,
});

const routeTitles: Record<string, string> = {
  "/_authenticated/dashboard/": "Overview",
  "/_authenticated/dashboard/jobs/": "Jobs",
  "/_authenticated/dashboard/jobs/new": "Post a Job",
  "/_authenticated/dashboard/jobs/$jobId": "Job Details",
  "/_authenticated/dashboard/applications": "My Applications",
  "/_authenticated/dashboard/application/$applicationId": "Application Details",
  "/_authenticated/dashboard/settings": "Settings",
};

function DashboardLayout() {
  const { user, isCompany } = Route.useRouteContext();
  const { notificationsFeed } = Route.useLoaderData();
  const matches = useMatches();
  const lastMatch = matches[matches.length - 1];
  const title = routeTitles[lastMatch?.routeId ?? ""] ?? "Dashboard";
  const [commandOpen, setCommandOpen] = useState(false);

  useCommandPaletteShortcut(() => {
    setCommandOpen((prev) => !prev);
  });

  const onOpenCommandPalette = () => {
    setCommandOpen(true);
  };

  if (!user) return null;

  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
          } as { [key: string]: string }
        }
      >
        <AppSidebar user={user} isCompany={isCompany} variant="inset" />
        <CommandPalette isCompany={isCompany} open={commandOpen} onOpenChange={setCommandOpen} />
        <SidebarInset>
          <SiteHeader
            title={title}
            notificationsFeed={notificationsFeed}
            onOpenCommandPalette={onOpenCommandPalette}
          />
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
