import { ArrowLeft01Icon, Cancel01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InterviewWorkspaceSkeleton } from "@/components/route-skeletons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { InterviewChat } from "@/features/interviews/components/interview-chat";
import { InterviewSidebar } from "@/features/interviews/components/interview-sidebar";
import { useInterviewChat } from "@/features/interviews/hooks/use-interview-chat";
import {
  cancelMyInterview,
  completeMyInterview,
  getMyInterview,
  getMyInterviews,
  startMyInterview,
} from "@/features/interviews/server/functions";
import { validateUuidParams } from "@/shared/validation";

const statusConfig: Record<string, { label: string }> = {
  pending: { label: "Ready" },
  in_progress: { label: "In progress" },
  completed: { label: "Completed" },
  cancelled: { label: "Cancelled" },
  expired: { label: "Expired" },
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const Route = createFileRoute("/_authenticated/interview/$interviewId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }

    validateUuidParams({ interviewId: params.interviewId });
  },
  loader: async ({ params }) => {
    const interviews = await getMyInterviews();
    const interview = await getMyInterview({ data: { interviewId: params.interviewId } });

    if (!interview) {
      throw notFound();
    }

    return { interview, interviews };
  },
  pendingComponent: InterviewWorkspaceSkeleton,
  component: InterviewWorkspacePage,
});

function InterviewWorkspacePage() {
  const { interview, interviews } = Route.useLoaderData();
  const router = useRouter();
  const chat = useInterviewChat(interview.id);
  const [sheetOpen, setSheetOpen] = useState(false);

  const startInterviewFn = useServerFn(startMyInterview);
  const cancelInterviewFn = useServerFn(cancelMyInterview);
  const completeInterviewFn = useServerFn(completeMyInterview);

  const startMutation = useMutation({
    mutationFn: startInterviewFn,
    onSuccess: async () => {
      toast.success("Interview started.");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not start interview. Please try again."));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelInterviewFn,
    onSuccess: async () => {
      toast.success("Interview cancelled.");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not cancel interview. Please try again."));
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeInterviewFn,
    onSuccess: async () => {
      toast.success("Interview submitted.");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not submit interview. Please try again."));
    },
  });

  const status = statusConfig[interview.status] ?? { label: interview.status };

  const canSend = interview.status === "in_progress";

  const onStart = () => {
    startMutation.mutate({ data: { interviewId: interview.id } });
  };

  const onCancel = () => {
    cancelMutation.mutate({ data: { interviewId: interview.id } });
  };

  const onComplete = () => {
    completeMutation.mutate({ data: { interviewId: interview.id } });
  };

  const onSendMessage = (content: string) => {
    void chat.sendMessage({
      role: "user",
      parts: [{ type: "text", text: content }],
    });
  };

  useEffect(() => {
    if (chat.messages.length > 0) {
      return;
    }

    if (interview.status !== "in_progress") {
      return;
    }

    // Kick the agent into greeting the candidate. The agent generates the
    // first assistant message itself (server-side via @callable + persistMessages)
    // so it shows up as Zero speaking first — never a fake candidate prompt.
    void chat.kickoff();
  }, [chat.messages.length, chat.kickoff, interview.status]);

  const onOpenSessions = () => {
    setSheetOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 w-full gap-2 bg-background text-foreground">
      <InterviewSidebar
        interviewId={interview.id}
        interviews={interviews}
        className="hidden lg:flex"
      />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-background">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-4 py-3 md:px-5">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 lg:hidden"
                    onClick={onOpenSessions}
                  >
                    Sessions
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-2">
                  <SheetTitle className="sr-only">Interview sessions</SheetTitle>
                  <InterviewSidebar
                    interviewId={interview.id}
                    interviews={interviews}
                    className="h-full"
                  />
                </SheetContent>
              </Sheet>
              <Button variant="ghost" size="sm" asChild className="-ml-2 lg:hidden">
                <Link to="/dashboard/applications">
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                  Applications
                </Link>
              </Button>
              <p className="truncate text-base font-semibold md:text-lg">{interview.jobTitle}</p>
              <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                {status.label}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground md:text-sm">
              {interview.companyName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canSend ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={cancelMutation.isPending}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
                Cancel
              </Button>
            ) : null}

            {interview.status === "pending" || interview.status === "in_progress" ? (
              <Button
                size="sm"
                onClick={interview.status === "pending" ? onStart : onComplete}
                disabled={startMutation.isPending || completeMutation.isPending}
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
                {interview.status === "pending" ? "Start" : "Submit"}
              </Button>
            ) : null}
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <InterviewChat
            messages={chat.messages}
            canSend={canSend}
            isStreaming={chat.isStreaming}
            onSend={onSendMessage}
          />
        </div>
      </section>
    </div>
  );
}
