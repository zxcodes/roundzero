import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
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
  component: InterviewWorkspaceLayout,
});

function InterviewWorkspaceLayout() {
  return (
    <div className="min-h-[calc(100vh-1rem)] overflow-hidden rounded-3xl border bg-background shadow-sm animate-fade-in">
      <div className="h-full min-h-[calc(100vh-1rem)]">
        <Outlet />
      </div>
    </div>
  );
}
