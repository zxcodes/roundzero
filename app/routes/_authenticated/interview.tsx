import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { InterviewWorkspaceSkeleton } from "@/components/route-skeletons";
import { getMyInterviews } from "@/features/interviews/server/functions";

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

function InterviewWorkspaceLayout() {
  return (
    <div className="h-[100dvh] min-h-0 bg-background animate-fade-in">
      <div className="h-full min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
