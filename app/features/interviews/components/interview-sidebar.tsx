import { ArrowLeft01Icon, BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { formatDateTime, formatTimeLeft } from "@/shared/date";

type InterviewSidebarProps = {
  activeInterviewId?: string;
  interviews: Array<{
    id: string;
    jobTitle: string;
    companyName: string;
    status: string;
    expiresAt: string | null;
  }>;
} & React.ComponentProps<typeof Sidebar>;

const getSessionLabel = (value: string) => {
  if (value === "in_progress") return "In progress";
  if (value === "pending") return "Ready";
  if (value === "awaiting_voice") return "Voice pending";
  if (value === "completed") return "Completed";
  if (value === "cancelled") return "Cancelled";
  if (value === "expired") return "Expired";
  return value;
};

const getSessionTone = (value: string) => {
  if (value === "in_progress") return "bg-primary/10 text-primary";
  if (value === "pending") return "border-warning/20 bg-warning/10 text-warning";
  if (value === "awaiting_voice") return "border-warning/20 bg-warning/10 text-warning";
  if (value === "completed") return "border-success/20 bg-success/10 text-success";
  if (value === "cancelled") return "bg-muted text-muted-foreground";
  if (value === "expired") return "border-danger/20 bg-danger/10 text-danger";
  return "bg-muted text-muted-foreground";
};

export function InterviewSidebar({
  activeInterviewId,
  interviews,
  className,
  ...props
}: InterviewSidebarProps) {
  return (
    <Sidebar className={className} variant="floating" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1">
          <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-4 text-primary" />
          <p className="text-sm font-semibold tracking-wide">Interviews</p>
        </div>
        <p className="px-1 text-xs text-muted-foreground">All sessions</p>
      </SidebarHeader>

      <SidebarContent>
        {interviews.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3 py-4">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-5" />
                </EmptyMedia>
                <EmptyTitle>No sessions</EmptyTitle>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {interviews.map((item) => {
                  const isActive = item.id === activeInterviewId;
                  const deadline = formatDateTime(item.expiresAt);
                  const timeLeft = formatTimeLeft(item.expiresAt);

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn("h-auto flex-col items-start gap-1.5 rounded-xl px-3 py-3.5")}
                      >
                        <Link
                          to="/interview/$interviewId"
                          params={{ interviewId: item.id }}
                          className="flex w-full flex-col items-start"
                        >
                          <p className="w-full truncate text-sm font-medium">{item.jobTitle}</p>
                          <p
                            className={cn(
                              "w-full truncate text-xs",
                              isActive
                                ? "text-sidebar-accent-foreground/80"
                                : "text-muted-foreground",
                            )}
                          >
                            {item.companyName}
                          </p>
                          <Badge
                            className={cn(
                              "mt-1 text-[11px]",
                              getSessionTone(item.status),
                              isActive ? "ring-1 ring-sidebar-accent-foreground/25" : "",
                            )}
                          >
                            {getSessionLabel(item.status)}
                          </Badge>
                          {(item.status === "pending" || item.status === "in_progress") &&
                          deadline &&
                          timeLeft ? (
                            <p
                              className={cn(
                                "mt-1 text-[11px]",
                                isActive
                                  ? "text-sidebar-accent-foreground/80"
                                  : "text-muted-foreground",
                              )}
                            >
                              {timeLeft} · {deadline}
                            </p>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/dashboard">
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                <span>Exit to main app</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
