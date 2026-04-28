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
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-5" />
          </EmptyMedia>
          <EmptyTitle>No interview sessions yet</EmptyTitle>
          <EmptyDescription>Active and past interviews will appear here.</EmptyDescription>
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
