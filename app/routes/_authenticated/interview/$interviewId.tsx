import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";
import { InterviewContentSkeleton } from "@/components/route-skeletons";
import { getMyInterview } from "@/features/interviews/server/functions";
import { getInterviewExpiresAt } from "@/features/interviews/shared/expiry";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/interview/$interviewId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }

    validateUuidParams({ interviewId: params.interviewId });
  },
  loader: async ({ params }) => {
    const interview = await getMyInterview({ data: { interviewId: params.interviewId } });
    if (!interview) {
      throw notFound();
    }
    return {
      interview,
      expiresAt: getInterviewExpiresAt(interview.metadata)?.toISOString() ?? null,
    };
  },
  pendingComponent: InterviewContentSkeleton,
  component: InterviewOutlet,
});

function InterviewOutlet() {
  return <Outlet />;
}
