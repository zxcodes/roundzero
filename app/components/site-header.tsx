import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  type AppBreadcrumbItem,
  AppBreadcrumbs,
  BreadcrumbSkeleton,
} from "@/components/app-breadcrumbs";
import { DeferredSection } from "@/components/deferred-section";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationInbox } from "@/features/notifications/components/notification-inbox";
import type { getMyNotificationsFeed } from "@/features/notifications/server/functions";

export function SiteHeader({
  breadcrumbs,
  breadcrumbSegments,
  isBreadcrumbPending,
  notificationsFeed,
  onOpenCommandPalette,
}: {
  breadcrumbs: AppBreadcrumbItem[] | null;
  breadcrumbSegments: number;
  isBreadcrumbPending: boolean;
  notificationsFeed: Promise<Awaited<ReturnType<typeof getMyNotificationsFeed>>>;
  onOpenCommandPalette: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="mx-auto flex w-full min-w-0 max-w-[1600px] items-center gap-2 px-4 md:px-8">
        <SidebarTrigger className="-ml-1" />
        <div className="mx-2 h-4 w-px bg-border" />
        <div className="min-w-0 flex-1 overflow-hidden">
          {isBreadcrumbPending ? (
            <BreadcrumbSkeleton segments={breadcrumbSegments} />
          ) : (
            <AppBreadcrumbs items={breadcrumbs ?? [{ label: "Dashboard" }]} />
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
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
          <DeferredSection
            promise={notificationsFeed}
            fallback={<NotificationInboxSkeleton />}
            sectionLabel="notifications"
          >
            {(feed) => <NotificationInbox feed={feed} />}
          </DeferredSection>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

function NotificationInboxSkeleton() {
  return <Skeleton className="size-9 shrink-0 rounded-full" />;
}
