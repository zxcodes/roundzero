import { ModeToggle } from "@/components/mode-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationInbox } from "@/features/notifications/components/notification-inbox";
import type { getMyNotificationsFeed } from "@/features/notifications/server/functions";

export function SiteHeader({
  title,
  notificationsFeed,
}: {
  title: string;
  notificationsFeed: Awaited<ReturnType<typeof getMyNotificationsFeed>>;
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="mx-2 h-4 w-px bg-border" />
        <h1 className="text-sm font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-1">
          <NotificationInbox feed={notificationsFeed} />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
