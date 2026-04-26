import { Cancel01Icon, CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CommandPalette } from "@/components/command-palette";
import { InterviewWorkspaceSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
import { useCommandPaletteShortcut } from "@/hooks/use-command-palette-shortcut";
import { validateUuidParams } from "@/shared/validation";

const statusConfig: Record<string, { label: string; tone: string }> = {
  pending: { label: "Ready", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  in_progress: { label: "In progress", tone: "bg-primary/10 text-primary" },
  completed: {
    label: "Completed",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  cancelled: { label: "Cancelled", tone: "bg-muted text-muted-foreground" },
  expired: { label: "Expired", tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
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
  const { isCompany } = Route.useRouteContext();
  const router = useRouter();
  const chat = useInterviewChat(interview.id);
  const [commandOpen, setCommandOpen] = useState(false);

  const isPending = interview.status === "pending";
  const isInProgress = interview.status === "in_progress";

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

  const status = statusConfig[interview.status] ?? {
    label: interview.status,
    tone: "bg-muted text-muted-foreground",
  };

  const canSend = interview.status === "in_progress";
  const isEnded = interview.status === "completed" || interview.status === "cancelled";
  const isStarting = isPending && startMutation.isPending;
  const isSubmitting = isInProgress && completeMutation.isPending;

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

  useCommandPaletteShortcut(() => {
    setCommandOpen((prev) => !prev);
  });

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
        } as { [key: string]: string }
      }
    >
      <CommandPalette isCompany={isCompany} open={commandOpen} onOpenChange={setCommandOpen} />
      <InterviewSidebar interviewId={interview.id} interviews={interviews} />
      <SidebarInset>
        <div className="flex h-full min-h-0 w-full bg-background p-2 text-foreground">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <header className="flex shrink-0 flex-col gap-3 border-b border-border/60 bg-card px-4 py-3.5 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <SidebarTrigger className="-ml-1.5" />
                  <p className="truncate text-base font-semibold md:text-lg">
                    {interview.jobTitle}
                  </p>
                  <Badge className={`text-[11px] ${status.tone}`}>{status.label}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground md:text-sm">
                  {interview.companyName}
                </p>
              </div>

              <div className="flex w-full flex-wrap justify-end gap-2 md:w-auto">
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

                {isPending || isInProgress ? (
                  <Button
                    size="sm"
                    onClick={isPending ? onStart : onComplete}
                    disabled={startMutation.isPending || completeMutation.isPending}
                  >
                    {isStarting || isSubmitting ? (
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        strokeWidth={2}
                        className="size-4 animate-spin"
                      />
                    ) : (
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        strokeWidth={2}
                        className="size-4"
                      />
                    )}
                    {isPending ? "Start" : "Submit"}
                  </Button>
                ) : null}
              </div>
            </header>

            {isStarting || isSubmitting ? (
              <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-sm text-muted-foreground md:px-6">
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
                <span>
                  {isStarting
                    ? "Starting interview and preparing your first question..."
                    : "Submitting interview and generating your report..."}
                </span>
              </div>
            ) : null}

            <div className="min-h-0 flex-1">
              <InterviewChat
                messages={chat.messages}
                canSend={canSend}
                isEnded={isEnded}
                isStreaming={chat.isStreaming}
                onSend={onSendMessage}
              />
            </div>
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
