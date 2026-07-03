import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { resolveAdminBreadcrumbs } from "@/shared/admin-breadcrumbs";

export function AdminHeader({ routeId }: { routeId: string }) {
  const breadcrumbs = resolveAdminBreadcrumbs(routeId);

  return (
    <header className="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="mx-auto flex w-full min-w-0 max-w-[1600px] items-center gap-2 px-4 md:px-8">
        <SidebarTrigger className="-ml-1" />
        <div className="mx-2 h-4 w-px bg-border" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <AppBreadcrumbs items={breadcrumbs} />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
