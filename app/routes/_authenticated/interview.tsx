import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { InterviewWorkspaceSkeleton } from "@/components/route-skeletons";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { InterviewSidebar } from "@/features/interviews/components/interview-sidebar";
import { getMyInterviews } from "@/features/interviews/server/functions";
import { useCommandPaletteShortcut } from "@/hooks/use-command-palette-shortcut";

export const Route = createFileRoute("/_authenticated/interview")({
  beforeLoad: ({ context }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async () => {
    const interviews = await getMyInterviews();
    return { interviews };
  },
  pendingComponent: InterviewWorkspaceSkeleton,
  component: InterviewWorkspaceLayout,
});

function InterviewWorkspaceContent() {
  const { state } = useSidebar();

  return (
    <div
      className={
        "flex h-dvh min-h-0 w-full bg-background pb-2 pr-2 pt-2 text-foreground" +
        (state === "collapsed" ? " pl-2" : "")
      }
    >
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <Outlet />
      </section>
    </div>
  );
}

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
    <div>
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
          <InterviewWorkspaceContent />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
