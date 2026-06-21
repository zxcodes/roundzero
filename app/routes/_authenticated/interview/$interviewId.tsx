import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";
import { InterviewContentSkeleton } from "@/components/route-skeletons";
import { getMyInterview, getMyInterviewMessages } from "@/features/interviews/server/functions";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/interview/$interviewId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }

    validateUuidParams({ interviewId: params.interviewId });
  },
  loader: async ({ params }) => {
    const [interview, chatState] = await Promise.all([
      getMyInterview({ data: { interviewId: params.interviewId } }),
      getMyInterviewMessages({ data: { interviewId: params.interviewId } }),
    ]);
    if (!interview) {
      throw notFound();
    }
    if (!chatState) {
      throw notFound();
    }
    return {
      interview,
      expiresAt: interview.expiresAt,
      initialMessages: chatState.messages,
    };
  },
  pendingComponent: InterviewContentSkeleton,
  component: InterviewOutlet,
});

function InterviewOutlet() {
  return <Outlet />;
}
