import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";
import { InterviewContentSkeleton } from "@/components/route-skeletons";
import { getMyInterview, getMyInterviewMessages } from "@/features/interviews/server/functions";
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
    const chatState = await getMyInterviewMessages({
      data: { interviewId: params.interviewId },
    });
    if (!chatState) {
      throw notFound();
    }
    return {
      interview,
      expiresAt: getInterviewExpiresAt(interview.metadata)?.toISOString() ?? null,
      initialMessages: chatState.messages,
    };
  },
  pendingComponent: InterviewContentSkeleton,
  component: InterviewOutlet,
});

function InterviewOutlet() {
  return <Outlet />;
}
