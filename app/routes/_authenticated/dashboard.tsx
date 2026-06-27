import { createFileRoute, Outlet, useLoaderData, useMatches } from "@tanstack/react-router";
import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getMyNotificationsFeed } from "@/features/notifications/server/functions";
import { useCommandPaletteShortcut } from "@/hooks/use-command-palette-shortcut";
import {
  breadcrumbSegmentCount,
  isDashboardBreadcrumbPending,
  resolveDashboardBreadcrumbs,
} from "@/shared/dashboard-breadcrumbs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: () => ({
    notificationsFeed: getMyNotificationsFeed(),
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const auth = useLoaderData({ from: "/_authenticated" });
  const user = auth.user;
  const isCompany = auth.type === "company";
  const { notificationsFeed } = Route.useLoaderData();
  const matches = useMatches();
  const lastMatch = matches[matches.length - 1];
  const routeId = lastMatch?.routeId ?? "";
  const breadcrumbs = resolveDashboardBreadcrumbs(routeId, isCompany, matches);
  const breadcrumbSegments = breadcrumbSegmentCount(routeId, breadcrumbs);
  const isBreadcrumbPending = isDashboardBreadcrumbPending(
    routeId,
    matches,
    breadcrumbs,
    lastMatch,
  );
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
        <AppSidebar
          user={user}
          isCompany={isCompany}
          membershipRole={auth.type === "company" ? auth.membershipRole : null}
          variant="inset"
        />
        <CommandPalette
          isCompany={isCompany}
          showTeam={
            isCompany && (auth.membershipRole === "owner" || auth.membershipRole === "admin")
          }
          showBilling={isCompany && auth.membershipRole === "owner"}
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />
        <SidebarInset>
          <SiteHeader
            breadcrumbs={breadcrumbs}
            breadcrumbSegments={breadcrumbSegments}
            isBreadcrumbPending={isBreadcrumbPending}
            notificationsFeed={notificationsFeed}
            onOpenCommandPalette={onOpenCommandPalette}
          />
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
