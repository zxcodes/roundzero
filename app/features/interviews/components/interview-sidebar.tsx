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

type InterviewSidebarProps = {
  activeInterviewId?: string;
  interviews: Array<{
    id: string;
    jobTitle: string;
    companyName: string;
    status: string;
  }>;
} & React.ComponentProps<typeof Sidebar>;

const getSessionLabel = (value: string) => {
  if (value === "in_progress") return "In progress";
  if (value === "pending") return "Ready";
  if (value === "completed") return "Completed";
  if (value === "cancelled") return "Cancelled";
  if (value === "expired") return "Expired";
  return value;
};

const getSessionTone = (value: string) => {
  if (value === "in_progress") return "bg-primary/10 text-primary";
  if (value === "pending") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (value === "completed") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (value === "cancelled") return "bg-muted text-muted-foreground";
  if (value === "expired") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
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
        <p className="px-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          All sessions
        </p>
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
