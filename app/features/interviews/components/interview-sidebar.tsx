import { BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type InterviewSidebarProps = {
  interviewId: string;
  interviews: Array<{
    id: string;
    jobTitle: string;
    companyName: string;
    status: string;
  }>;
  mobile?: boolean;
};

const getSessionLabel = (value: string) => {
  if (value === "in_progress") return "In progress";
  if (value === "pending") return "Ready";
  if (value === "completed") return "Completed";
  if (value === "cancelled") return "Cancelled";
  if (value === "expired") return "Expired";
  return value;
};

export function InterviewSidebar({
  interviewId,
  interviews,
  mobile = false,
}: InterviewSidebarProps) {
  return (
    <aside
      className={cn(
        "w-80 shrink-0 border-r bg-sidebar text-sidebar-foreground",
        mobile ? "flex min-h-0 flex-col" : "hidden lg:flex lg:min-h-0 lg:flex-col",
      )}
    >
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="mb-0.5 flex items-center gap-2">
          <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-4 text-primary" />
          <p className="text-sm font-semibold tracking-wide">Interviews</p>
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Live interview sessions
        </p>
      </SidebarHeader>
      <SidebarContent className="p-0">
        <ScrollArea className="h-full">
          <SidebarGroup className="p-2">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {interviews.map((item) => {
                  const active = item.id === interviewId;

                  return (
                    <SidebarMenuItem key={item.id}>
                      <Link
                        to="/interview/$interviewId"
                        params={{ interviewId: item.id }}
                        className={cn(
                          "block rounded-xl border px-3 py-2.5 transition-colors",
                          active
                            ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
                            : "border-transparent text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        )}
                      >
                        <p className="truncate text-sm font-medium">{item.jobTitle}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.companyName}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {getSessionLabel(item.status)}
                        </p>
                      </Link>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
    </aside>
  );
}
