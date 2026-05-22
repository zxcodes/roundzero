import { Cancel01Icon, CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClientOnly, createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
import { formatDeadlineLabel, formatTimeLeft } from "@/shared/date";
import { Route as ParentRoute } from "../$interviewId";

type InterviewDetail = NonNullable<
  Awaited<ReturnType<typeof import("@/features/interviews/server/functions").getMyInterview>>
>;

const statusConfig: Record<string, { label: string; tone: string }> = {
  pending: { label: "Ready", tone: "border-warning/20 bg-warning/10 text-warning" },
  in_progress: { label: "In progress", tone: "bg-primary/10 text-primary" },
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
  const { interview, expiresAt } = ParentRoute.useLoaderData();

  return (
    <ClientOnly>
      <InterviewWorkspaceContent key={interview.id} interview={interview} expiresAt={expiresAt} />
    </ClientOnly>
  );
}
function InterviewWorkspaceContent({
  interview,
  expiresAt,
}: {
  interview: InterviewDetail;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const chat = useInterviewChat(interview.id);
  const agentSessionStatus = chat.sessionStatus;
  const effectiveStatus =
    interview.status === "in_progress" && agentSessionStatus && agentSessionStatus !== "in_progress"
      ? agentSessionStatus
      : interview.status;

  const isPending = effectiveStatus === "pending";
  const isInProgress = effectiveStatus === "in_progress";

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

  const status = statusConfig[effectiveStatus] ?? {
    label: effectiveStatus,
    tone: "bg-muted text-muted-foreground",
  };

  const canSend = effectiveStatus === "in_progress";
  const isEnded = effectiveStatus === "completed" || effectiveStatus === "cancelled";
  const isCompleted = effectiveStatus === "completed";
  const isStarting = isPending && startMutation.isPending;
  const isSubmitting = isInProgress && completeMutation.isPending;
  const deadline = formatDeadlineLabel(expiresAt);
  const timeLeft = formatTimeLeft(expiresAt);

  const [activeTab, setActiveTab] = useState<"chat" | "voice">("chat");
  const hasAutoSwitchedRef = useRef(false);

  // Voice assessment status drives the tab badge and auto-switch nudge.
  // We only fetch this once the chat is completed so we don't pay the
  // round-trip during the chat itself.
  const voiceAssessmentQuery = useQuery({
    queryKey: ["voice-assessment", interview.id],
    queryFn: async () => {
      const result = await getMyVoiceAssessment({ data: { interviewId: interview.id } });
      return result?.assessment ?? null;
    },
    enabled: isCompleted,
  });

  const voiceStatus = voiceAssessmentQuery.data?.status ?? null;
  const voiceTabAvailable = isCompleted;
  const voiceTabBadge = getVoiceTabBadge(voiceStatus, isCompleted);

  // Auto-switch to the voice tab once when the chat is completed and the
  // voice assessment is still pending/in-progress. This covers both the
  // live "submit the chat" transition and the returning-user case. We only
  // fire this once per mount so a manual switch back to chat is respected.
  useEffect(() => {
    if (hasAutoSwitchedRef.current) return;
    if (!isCompleted) return;
    if (!voiceAssessmentQuery.isFetched) return;
    if (voiceStatus === null || voiceStatus === "pending" || voiceStatus === "in_progress") {
      hasAutoSwitchedRef.current = true;
      setActiveTab("voice");
    }
  }, [isCompleted, voiceStatus, voiceAssessmentQuery.isFetched]);

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

  const onSendMessage = async (content: string) => {
    await chat.sendMessage({
      role: "user",
      parts: [{ type: "text", text: content }],
    });
    await router.invalidate();
  };

  return (
    <>
      <header className="flex shrink-0 flex-col gap-3 border-b border-border/60 bg-card px-4 py-3.5 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <SidebarTrigger className="-ml-1.5" />
            <p className="truncate text-base font-semibold md:text-lg">{interview.jobTitle}</p>
            <Badge className={`text-[11px] ${status.tone}`}>{status.label}</Badge>
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
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
              )}
              {isPending ? "Start" : "Submit"}
            </Button>
          ) : null}
        </div>
      </header>

      {isStarting || isSubmitting ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-sm text-muted-foreground md:px-6">
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
          <span>
            {isStarting
              ? "Starting interview and preparing your first question..."
              : "Submitting interview and generating your report..."}
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
                    {voiceTabBadge ? (
                      <Badge
                        className={cn("h-5 px-1.5 text-[10px] font-medium", voiceTabBadge.tone)}
                      >
                        {voiceTabBadge.label}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              {!voiceTabAvailable ? (
                <TooltipContent>Available after you submit the chat interview</TooltipContent>
              ) : null}
            </Tooltip>
          </TooltipProvider>
        </TabsList>
        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col">
          <InterviewChat
            messages={chat.messages}
            canSend={canSend}
            isEnded={isEnded}
            isStreaming={chat.isStreaming}
            isWaiting={chat.status === "submitted"}
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

function getVoiceTabBadge(
  voiceStatus: string | null | undefined,
  isCompleted: boolean,
): { label: string; tone: string } | null {
  if (!isCompleted) return null;
  if (voiceStatus === "completed") {
    return { label: "Done", tone: "border-success/20 bg-success/10 text-success" };
  }
  if (voiceStatus === "skipped") {
    return { label: "Skipped", tone: "bg-muted text-muted-foreground" };
  }
  if (voiceStatus === "in_progress") {
    return { label: "In progress", tone: "bg-primary/10 text-primary" };
  }
  return { label: "New", tone: "border-warning/20 bg-warning/10 text-warning" };
}
