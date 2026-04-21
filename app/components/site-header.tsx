import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationInbox } from "@/features/notifications/components/notification-inbox";
import type { getMyNotificationsFeed } from "@/features/notifications/server/functions";

export function SiteHeader({
  title,
  notificationsFeed,
  onOpenCommandPalette,
}: {
  title: string;
  notificationsFeed: Awaited<ReturnType<typeof getMyNotificationsFeed>>;
  onOpenCommandPalette: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="mx-2 h-4 w-px bg-border" />
        <h1 className="text-sm font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="hidden h-8 gap-2 text-muted-foreground md:flex"
            onClick={onOpenCommandPalette}
          >
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} data-icon="inline-start" />
            <span className="text-xs">Search...</span>
            <kbd className="pointer-events-none ml-2 inline-flex h-5 items-center gap-0.5 rounded-full border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-sm">⌘</span>K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onOpenCommandPalette}
            aria-label="Search"
          >
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
          </Button>
          <NotificationInbox feed={notificationsFeed} />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
