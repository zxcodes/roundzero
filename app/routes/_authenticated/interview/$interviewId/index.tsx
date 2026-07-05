import { Cancel01Icon, CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClientOnly, createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InterviewWorkspacePageSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InterviewChat } from "@/features/interviews/components/interview-chat";
import { VoiceAssessmentPanel } from "@/features/interviews/components/voice-assessment-panel";
import { useInterviewChat } from "@/features/interviews/hooks/use-interview-chat";
import {
  cancelMyInterview,
  completeMyInterview,
  getMyVoiceAssessment,
  startMyInterview,
} from "@/features/interviews/server/functions";
import type { MessageIntegritySnapshot } from "@/features/interviews/shared/integrity";
import { formatDeadlineLabel, formatTimeLeft } from "@/shared/date";
import { Route as ParentRoute } from "../$interviewId";

type InterviewDetail = NonNullable<
  Awaited<ReturnType<typeof import("@/features/interviews/server/functions").getMyInterview>>
>;

const statusConfig: Record<string, { label: string; tone: string }> = {
  pending: { label: "Ready", tone: "border-warning/20 bg-warning/10 text-warning" },
  in_progress: { label: "In progress", tone: "bg-primary/10 text-primary" },
  awaiting_voice: { label: "Voice pending", tone: "border-warning/20 bg-warning/10 text-warning" },
  completed: { label: "Completed", tone: "border-success/20 bg-success/10 text-success" },
  cancelled: { label: "Cancelled", tone: "bg-muted text-muted-foreground" },
  expired: { label: "Expired", tone: "border-danger/20 bg-danger/10 text-danger" },
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const Route = createFileRoute("/_authenticated/interview/$interviewId/")({
  component: InterviewWorkspacePage,
  pendingComponent: InterviewWorkspacePageSkeleton,
});

function InterviewWorkspacePage() {
  const { interview, expiresAt, initialMessages } = ParentRoute.useLoaderData();

  return (
    <ClientOnly>
      {/* Remount on status transitions so useChat re-reads `initialMessages`
          after the server seeds the greeting (pending → in_progress) and
          after the agent calls end_interview (in_progress → completed).
          useChat consumes initialMessages on mount only. */}
      <InterviewWorkspaceContent
        key={`${interview.id}:${interview.status}`}
        interview={interview}
        expiresAt={expiresAt}
        initialMessages={initialMessages}
      />
    </ClientOnly>
  );
}
function InterviewWorkspaceContent({
  interview,
  expiresAt,
  initialMessages,
}: {
  interview: InterviewDetail;
  expiresAt: string | null;
  initialMessages: ReturnType<typeof ParentRoute.useLoaderData>["initialMessages"];
}) {
  const router = useRouter();
  const chat = useInterviewChat(interview.id, initialMessages);

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
      toast.success("Chat interview submitted. One last step — quick voice check.");
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
  const isAwaitingVoice = interview.status === "awaiting_voice";
  const isEnded =
    interview.status === "completed" ||
    interview.status === "awaiting_voice" ||
    interview.status === "cancelled" ||
    interview.status === "expired";
  const isCompleted = interview.status === "completed";
  const isCancelled = interview.status === "cancelled";
  const isExpired = interview.status === "expired";
  const isStarting = isPending && startMutation.isPending;
  const isSubmitting = isInProgress && completeMutation.isPending;
  const deadline = formatDeadlineLabel(expiresAt);
  const timeLeft = formatTimeLeft(expiresAt);

  // Auto-detect mid-session expiry. Without this the candidate could sit on
  // the page past `expiresAt`, keep typing, and only learn the interview is
  // dead when the next POST returns 400. Invalidating the route at the
  // deadline lets the server-side loader flip the interview to `expired`, then
  // the UI rerenders with the proper expired-state composer + footer.
  useEffect(() => {
    if (!expiresAt) return;
    if (interview.status !== "pending" && interview.status !== "in_progress") return;

    const msUntilExpiry = new Date(expiresAt).getTime() - Date.now();
    // 1s buffer so the server clock has rolled past `expiresAt` by the time
    // the loader re-runs; otherwise `shouldAutoExpireInterview` may still
    // return false and the route will look unchanged on invalidation.
    const handle = setTimeout(() => {
      void router.invalidate();
    }, Math.max(0, msUntilExpiry) + 1000);

    return () => clearTimeout(handle);
  }, [expiresAt, interview.status, router]);

  const [activeTab, setActiveTab] = useState<"chat" | "voice">("chat");

  // Voice assessment status drives the tab badge and the completion nudge.
  // We only fetch this once the chat is completed so we don't pay the
  // round-trip during the chat itself.
  const voiceAssessmentQuery = useQuery({
    queryKey: ["voice-assessment", interview.id],
    queryFn: async () => {
      const result = await getMyVoiceAssessment({ data: { interviewId: interview.id } });
      return result?.assessment ?? null;
    },
    enabled: isAwaitingVoice || isCompleted,
  });

  const voiceStatus = voiceAssessmentQuery.data?.status ?? null;
  const voiceTabAvailable = isAwaitingVoice || isCompleted;

  // We deliberately do NOT auto-switch to the voice tab when the chat ends.
  // Yanking the candidate off the transcript the moment the agent signs off is
  // jarring and hides the closing message. Instead the chat's ended-state footer
  // surfaces an explicit "Start voice assessment" action (via onContinueToVoice)
  // and the candidate switches when they're ready.
  const onContinueToVoice =
    voiceTabAvailable &&
    (voiceStatus === null || voiceStatus === "pending" || voiceStatus === "in_progress")
      ? () => setActiveTab("voice")
      : undefined;
  const voiceCtaLabel =
    voiceStatus === "in_progress" ? "Resume voice assessment" : "Start voice assessment";

  const onStart = () => {
    startMutation.mutate({ data: { interviewId: interview.id } });
  };

  const onCancel = () => {
    cancelMutation.mutate({ data: { interviewId: interview.id } });
  };

  const onComplete = () => {
    completeMutation.mutate({ data: { interviewId: interview.id } });
  };

  const onSendMessage = async (content: string, integrity: MessageIntegritySnapshot) => {
    try {
      await chat.sendMessage(content, integrity);
      await router.invalidate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not send your answer. Please try again."));
      throw error;
    }
  };

  return (
    <>
      <header className="flex shrink-0 flex-col gap-3 border-b border-border/60 bg-card px-4 py-3.5 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <SidebarTrigger className="-ml-1.5" />
            <p className="truncate text-base font-semibold md:text-lg">{interview.jobTitle}</p>
            <Badge variant="outline" className={`text-[11px] ${status.tone}`}>
              {status.label}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground md:text-sm">
            {interview.companyName}
          </p>
          {isPending || isInProgress ? (
            deadline ? (
              <p className="truncate text-xs text-muted-foreground">
                Interview deadline: {deadline}
                {timeLeft ? ` (${timeLeft})` : ""}
              </p>
            ) : null
          ) : null}
        </div>

        <div className="flex w-full flex-wrap justify-end gap-2 md:w-auto">
          {canSend ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
              ) : (
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
              )}
              {cancelMutation.isPending ? "Cancelling" : "Cancel"}
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
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
              )}
              {isStarting
                ? "Starting"
                : isSubmitting
                  ? "Submitting"
                  : isPending
                    ? "Start"
                    : "Submit"}
            </Button>
          ) : null}
        </div>
      </header>

      {isStarting || isSubmitting ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-sm text-muted-foreground md:px-6">
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
          <span>
            {isStarting
              ? "Starting interview and preparing your first question"
              : "Submitting your chat interview"}
          </span>
        </div>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "chat" | "voice")}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-4 mt-3 md:mx-6">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value="voice" disabled={!voiceTabAvailable} className="gap-2">
                    <span>Voice</span>
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              {!voiceTabAvailable ? (
                <TooltipContent>
                  {isCancelled
                    ? "Voice assessment is not available for cancelled interviews"
                    : isExpired
                      ? "Voice assessment is not available for expired interviews"
                      : "Available after you submit the chat interview"}
                </TooltipContent>
              ) : null}
            </Tooltip>
          </TooltipProvider>
        </TabsList>
        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col">
          <InterviewChat
            messages={chat.messages}
            canSend={canSend}
            isEnded={isEnded}
            isCancelled={interview.status === "cancelled"}
            isExpired={interview.status === "expired"}
            isStreaming={chat.isStreaming}
            isThinking={chat.isThinking}
            onSend={onSendMessage}
            onContinueToVoice={onContinueToVoice}
            voiceCtaLabel={voiceCtaLabel}
          />
        </TabsContent>
        <TabsContent value="voice" className="mt-0 flex min-h-0 flex-1 flex-col">
          <VoiceAssessmentPanel interviewId={interview.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
