import { BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const Route = createFileRoute("/_authenticated/interview/")({
  component: InterviewIndexPage,
});

function InterviewIndexPage() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} />
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
