import { BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { InterviewWorkspaceSkeleton } from "@/components/route-skeletons";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getMyInterviews } from "@/features/interviews/server/functions";

export const Route = createFileRoute("/_authenticated/interview/")({
  loader: async () => {
    const interviews = await getMyInterviews();

    if (interviews.length > 0) {
      throw redirect({
        to: "/interview/$interviewId",
        params: { interviewId: interviews[0].id },
      });
    }

    return { interviews };
  },
  pendingComponent: InterviewWorkspaceSkeleton,
  component: InterviewIndexPage,
});

function InterviewIndexPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-5" />
          </EmptyMedia>
          <EmptyTitle>No interview sessions yet</EmptyTitle>
          <EmptyDescription>
            Interview invitations will appear here after pre-evaluation selects your application.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/dashboard/applications" className="text-sm underline-offset-4 hover:underline">
            View my applications
          </Link>
        </EmptyContent>
      </Empty>
    </div>
  );
}
