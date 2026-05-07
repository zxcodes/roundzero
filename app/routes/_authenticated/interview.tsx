import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { InterviewWorkspaceSkeleton } from "@/components/route-skeletons";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { InterviewSidebar } from "@/features/interviews/components/interview-sidebar";
import { getMyInterviews } from "@/features/interviews/server/functions";
import { getInterviewExpiresAt } from "@/features/interviews/shared/expiry";
import { useCommandPaletteShortcut } from "@/hooks/use-command-palette-shortcut";

export const Route = createFileRoute("/_authenticated/interview")({
  beforeLoad: ({ context }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async () => {
    const interviews = await getMyInterviews();
    return {
      interviews: interviews.map((interview) => ({
        ...interview,
        expiresAt: getInterviewExpiresAt(interview.metadata)?.toISOString() ?? null,
      })),
    };
  },
  pendingComponent: InterviewWorkspaceSkeleton,
  component: InterviewWorkspaceLayout,
});

function InterviewWorkspaceLayout() {
  const { interviews } = Route.useLoaderData();
  const routerState = useRouterState();
  const [commandOpen, setCommandOpen] = useState(false);

  const pathname = routerState.location.pathname;
  const interviewMatch = pathname.match(/\/interview\/([^/]+)/);
  const activeInterviewId = interviewMatch ? interviewMatch[1] : undefined;

  useCommandPaletteShortcut(() => {
    setCommandOpen((prev) => !prev);
  });

  return (
    <div className="animate-fade-in">
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
          } as { [key: string]: string }
        }
      >
        <CommandPalette
          isCompany={false}
          atLimit={false}
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />
        <InterviewSidebar activeInterviewId={activeInterviewId} interviews={interviews} />
        <SidebarInset>
          <div className="flex h-dvh min-h-0 w-full bg-background p-2 text-foreground">
            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              <Outlet />
            </section>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
