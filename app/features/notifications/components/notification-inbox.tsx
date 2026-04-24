import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Notification02Icon,
  Rocket01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { getNotificationPresentation } from "@/features/notifications/config";
import {
  type getMyNotificationsFeed,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "@/features/notifications/server/functions";

type NotificationFeed = Awaited<ReturnType<typeof getMyNotificationsFeed>>;

const formatRelativeTime = (date: Date | string) => {
  const timestamp = new Date(date).getTime();
  const diffInMinutes = Math.round((Date.now() - timestamp) / (1000 * 60));

  if (diffInMinutes < 1) {
    return "Just now";
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.round(diffInHours / 24);
  return `${diffInDays}d ago`;
};

export function NotificationInbox({
  feed = { items: [], unreadCount: 0 },
}: {
  feed: NotificationFeed;
}) {
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const markReadFn = useServerFn(markMyNotificationRead);
  const markAllFn = useServerFn(markAllMyNotificationsRead);

  const markReadMutation = useMutation({
    mutationFn: markReadFn,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllFn,
    onSuccess: async () => {
      await router.invalidate();
    },
  });

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  const onMarkAllRead = async () => {
    await markAllMutation.mutateAsync({});
  };

  const onNotificationClick = async (
    notificationId: string,
    presentation: NonNullable<ReturnType<typeof getNotificationPresentation>>,
  ) => {
    await markReadMutation.mutateAsync({
      data: { notificationId },
    });
    setOpen(false);
    await router.invalidate();
    await router.navigate({
      to: presentation.to,
      params: presentation.params,
    });
  };

  const trigger = (
    <Button
      variant="ghost"
      size="icon-sm"
      className="relative size-9 rounded-full bg-muted/35 text-foreground hover:bg-muted/60"
    >
      <HugeiconsIcon icon={Notification02Icon} strokeWidth={2} className="size-4.5" />
      {feed.unreadCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm">
          {feed.unreadCount > 9 ? "9+" : feed.unreadCount}
        </span>
      ) : null}
      <span className="sr-only">Open notifications</span>
    </Button>
  );

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Inbox</p>
          <h2 className="font-heading text-lg font-semibold">Notifications</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={onMarkAllRead}
          disabled={feed.unreadCount === 0 || markAllMutation.isPending}
        >
          Mark all read
        </Button>
      </div>

      {feed.items.length === 0 ? (
        <Empty className="bg-muted/30">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Nothing new right now</EmptyTitle>
            <EmptyDescription>
              Candidate and company workflow updates will appear here as they happen.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ScrollArea className="h-[min(70vh,32rem)]">
          <div className="space-y-2 px-3 pb-3">
            {feed.items.map((notification: NotificationFeed["items"][number]) => {
              const presentation = getNotificationPresentation(notification);
              const onClick = () => {
                if (!presentation) {
                  return;
                }

                void onNotificationClick(notification.id, presentation);
              };

              if (!presentation) {
                return (
                  <div key={notification.id} className="rounded-xl bg-muted/30 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-background/80">
                        <HugeiconsIcon
                          icon={Alert02Icon}
                          strokeWidth={2}
                          className="size-4 text-muted-foreground"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Unsupported notification</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          This notification could not be rendered by the current app build.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Button
                  key={notification.id}
                  variant="ghost"
                  onClick={onClick}
                  className={`h-auto w-full justify-start whitespace-normal rounded-xl text-left transition-all ${
                    notification.readAt ? "bg-muted/20" : "bg-muted/35"
                  }`}
                >
                  <div className="flex gap-3 px-4 py-3.5">
                    <div
                      className={`mt-0.5 flex size-9 items-center justify-center rounded-lg ${presentation.tone}`}
                    >
                      <HugeiconsIcon
                        icon={
                          presentation.type === "report_ready" ? Rocket01Icon : Notification02Icon
                        }
                        strokeWidth={2}
                        className="size-4"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{presentation.title}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{presentation.body}</p>
                    </div>
                    {notification.readAt ? null : (
                      <span className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  return isMobile ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-full max-w-sm border-border/60 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>Your workflow inbox.</SheetDescription>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  ) : (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-104 overflow-hidden border-border/60 p-0 shadow-lg">
        <PopoverHeader className="sr-only">
          <PopoverTitle>Notifications</PopoverTitle>
          <PopoverDescription>Your workflow inbox.</PopoverDescription>
        </PopoverHeader>
        {content}
      </PopoverContent>
    </Popover>
  );
}
