import { ArrowLeft01Icon, BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type InterviewSidebarProps = {
  interviewId: string;
  interviews: Array<{
    id: string;
    jobTitle: string;
    companyName: string;
    status: string;
  }>;
  className?: string;
};

const getSessionLabel = (value: string) => {
  if (value === "in_progress") return "In progress";
  if (value === "pending") return "Ready";
  if (value === "completed") return "Completed";
  if (value === "cancelled") return "Cancelled";
  if (value === "expired") return "Expired";
  return value;
};

export function InterviewSidebar({ interviewId, interviews, className }: InterviewSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-2xl bg-sidebar text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border",
        className,
      )}
    >
      <header className="p-2">
        <div className="mb-0.5 flex items-center gap-2">
          <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-4 text-primary" />
          <p className="text-sm font-semibold tracking-wide">Interviews</p>
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Live interview sessions
        </p>
      </header>

      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="space-y-1 p-2">
            {interviews.map((item) => {
              const isActive = item.id === interviewId;

              return (
                <Link
                  key={item.id}
                  to="/interview/$interviewId"
                  params={{ interviewId: item.id }}
                  className={cn(
                    "block rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <p className="truncate text-sm font-medium">{item.jobTitle}</p>
                  <p
                    className={cn(
                      "truncate text-xs",
                      isActive ? "text-sidebar-accent-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {item.companyName}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[11px]",
                      isActive ? "text-sidebar-accent-foreground/75" : "text-muted-foreground",
                    )}
                  >
                    {getSessionLabel(item.status)}
                  </p>
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <footer className="p-2">
        <Button
          asChild
          variant="ghost"
          className="w-full justify-start rounded-xl px-3 py-2 text-sm"
        >
          <Link to="/dashboard">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Exit to main app
          </Link>
        </Button>
      </footer>
    </aside>
  );
}
