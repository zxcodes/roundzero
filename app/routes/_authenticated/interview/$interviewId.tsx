import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";

import { InterviewContentSkeleton } from "@/components/route-skeletons";
import { getMyInterview } from "@/features/interviews/server/functions";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/interview/$interviewId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }

    validateUuidParams({ interviewId: params.interviewId });
  },
  loader: async ({ params }) => {
    const data = await getMyInterview({ data: { interviewId: params.interviewId } });
    if (!data) {
      throw notFound();
    }
    return {
      interview: data.interview,
      expiresAt: data.interview.expiresAt,
      initialMessages: data.messages,
    };
  },
  pendingComponent: InterviewContentSkeleton,
  component: InterviewOutlet,
});

function InterviewOutlet() {
  return <Outlet />;
}
