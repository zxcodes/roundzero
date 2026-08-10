import { useVoiceAgent, type TranscriptMessage } from "@cloudflare/voice/react";
import { Loading03Icon, Mic01Icon, PhoneOff01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CompletedInterviewBar } from "@/features/interviews/components/interview-end-visuals";
import {
  InterviewInterimBubble,
  InterviewThinkingBubble,
  TranscriptBubble,
} from "@/features/interviews/components/interview-transcript";
import {
  getMyVoiceAssessment,
  getMyVoiceAssessmentTranscript,
  prepareMyVoiceConnection,
  requestMyVoiceFinalization,
} from "@/features/interviews/server/functions";
import type { VoiceFinalizationResult } from "@/features/interviews/server/voice-assessment";
import {
  buildVoiceDisplayMessages,
  type VoiceDisplayMessage,
  waitForCandidateUtteranceCommit,
} from "@/features/interviews/shared/voice-client";
import { cn } from "@/lib/utils";

type VoiceAssessmentStatus = "pending" | "in_call" | "completed" | "skipped" | "error";

const customVoiceMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("voice_history"),
      messages: z
        .array(
          z
            .object({
              role: z.enum(["assistant", "user"]),
              content: z.string(),
            })
            .strict(),
        )
        .max(200),
    })
    .strict(),
  z
    .object({
      type: z.literal("assessment_complete"),
      reason: z.enum(["agent_complete", "duration_limit"]),
    })
    .strict(),
]);

function getEffectiveStatus(status: string | null | undefined): VoiceAssessmentStatus | null {
  if (!status) return null;
  if (status === "in_progress") return "in_call";
  if (status === "pending" || status === "completed" || status === "skipped") return status;
  return "error";
}

export function VoiceAssessmentPanel({ interviewId }: { interviewId: string }) {
  const [recoveredMessages, setRecoveredMessages] = useState<VoiceDisplayMessage[]>([]);
  const prepareConnection = useServerFn(prepareMyVoiceConnection);

  const assessmentQuery = useQuery({
    queryKey: ["voice-assessment", interviewId],
    queryFn: async () => await getMyVoiceAssessment({ data: { interviewId } }),
    refetchInterval: (query) => {
      const status = query.state.data?.assessment?.status;
      return status === "completed" || status === "skipped" ? false : 2_000;
    },
  });

  const effectiveStatus = getEffectiveStatus(assessmentQuery.data?.assessment?.status);
  const isTerminal = effectiveStatus === "completed" || effectiveStatus === "skipped";
  const canPrepare = assessmentQuery.data?.interviewStatus === "awaiting_voice" && !isTerminal;

  const preparationQuery = useQuery({
    queryKey: ["voice-connection-preparation", interviewId],
    queryFn: async () => await prepareConnection({ data: { interviewId } }),
    enabled: canPrepare,
    retry: false,
    staleTime: 20 * 60 * 1000,
  });

  const historicalTranscriptQuery = useQuery({
    queryKey: ["voice-assessment-transcript", interviewId],
    queryFn: async () => {
      const result = await getMyVoiceAssessmentTranscript({ data: { interviewId } });
      return result.messages;
    },
    enabled: isTerminal,
    staleTime: 30_000,
  });

  const onRetryPreparation = () => {
    void preparationQuery.refetch();
  };

  const refreshCapability = async () => {
    const refreshed = await preparationQuery.refetch();
    if (refreshed.error) throw refreshed.error;
  };

  if (effectiveStatus === "completed") {
    const completedMessages: VoiceDisplayMessage[] = (historicalTranscriptQuery.data ?? []).map(
      (message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        text: message.content,
      }),
    );

    return <CompletedVoiceAssessment messages={completedMessages} />;
  }

  if (effectiveStatus === "skipped") {
    return (
      <CompletedState
        icon={
          <HugeiconsIcon
            icon={PhoneOff01Icon}
            strokeWidth={2}
            className="size-6 text-muted-foreground"
          />
        }
        iconBg="bg-muted"
        title="Voice assessment skipped"
        description="Your report is based on the text interview only."
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link to="/dashboard/applications">Back to applications</Link>
          </Button>
        }
      />
    );
  }

  if (assessmentQuery.isPending || preparationQuery.isPending || !preparationQuery.data) {
    if (assessmentQuery.error || preparationQuery.error) {
      const error = assessmentQuery.error ?? preparationQuery.error;
      return (
        <PreparationError
          message={error instanceof Error ? error.message : "Could not prepare voice assessment."}
          onRetry={onRetryPreparation}
        />
      );
    }
    return <PreparingVoiceAssessment />;
  }

  return (
    <PreparedVoiceAssessment
      key={preparationQuery.data.expiresAt}
      interviewId={interviewId}
      recoveredMessages={recoveredMessages}
      onRecoveredMessagesChange={setRecoveredMessages}
      onRefreshCapability={refreshCapability}
    />
  );
}

function PreparedVoiceAssessment({
  interviewId,
  recoveredMessages,
  onRecoveredMessagesChange,
  onRefreshCapability,
}: {
  interviewId: string;
  recoveredMessages: VoiceDisplayMessage[];
  onRecoveredMessagesChange: (messages: VoiceDisplayMessage[]) => void;
  onRefreshCapability: () => Promise<void>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const finalizeAssessment = useServerFn(requestMyVoiceFinalization);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const historyRequestedRef = useRef(false);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const interimTranscriptRef = useRef<string | null>(null);
  const onRecoveredMessagesChangeRef = useRef(onRecoveredMessagesChange);
  const finalizeRef = useRef<() => Promise<void>>(async () => {});
  const [clientError, setClientError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [endRequested, setEndRequested] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationResult, setFinalizationResult] = useState<VoiceFinalizationResult | null>(
    null,
  );
  const [agentCompletionReason, setAgentCompletionReason] = useState<
    "agent_complete" | "duration_limit" | null
  >(null);

  const voice = useVoiceAgent({
    agent: "VoiceAssessmentAgent",
    name: interviewId,
    enabled: true,
  });

  transcriptRef.current = voice.transcript;
  interimTranscriptRef.current = voice.interimTranscript;
  onRecoveredMessagesChangeRef.current = onRecoveredMessagesChange;

  const { connected, sendJSON } = voice;

  const isInCall = voice.status !== "idle";
  const isConnecting = !voice.connected;
  const interim = voice.interimTranscript?.trim() ?? "";
  const messages = buildVoiceDisplayMessages(recoveredMessages, voice.transcript);
  const lastMessageText = messages.at(-1)?.text;

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  }, [interim, lastMessageText, messages.length]);

  useEffect(() => {
    if (!connected) {
      historyRequestedRef.current = false;
      return;
    }
    if (historyRequestedRef.current) return;
    historyRequestedRef.current = true;
    sendJSON({ type: "request_voice_history" });
  }, [connected, sendJSON]);

  useEffect(() => {
    const parsed = customVoiceMessageSchema.safeParse(voice.lastCustomMessage);
    if (!parsed.success) return;

    if (parsed.data.type === "voice_history") {
      const recovered = parsed.data.messages.map((message) => ({
        role: message.role,
        text: message.content,
      }));
      onRecoveredMessagesChangeRef.current(recovered);
      return;
    }

    setAgentCompletionReason(parsed.data.reason);
  }, [voice.lastCustomMessage]);

  useEffect(() => {
    if (voice.error) {
      setClientError(voice.error);
      return;
    }
    if (voice.connected) {
      setClientError(null);
    }
  }, [voice.connected, voice.error]);

  finalizeRef.current = async () => {
    if (isFinalizing) return;

    setIsFinalizing(true);
    setFinalizationResult(null);
    try {
      const result = await finalizeAssessment({ data: { interviewId } });
      setFinalizationResult(result);
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: ["voice-assessment", interviewId] });
        await queryClient.invalidateQueries({
          queryKey: ["voice-assessment-transcript", interviewId],
        });
        await router.invalidate();
        return;
      }

      if (result.reason === "terminal_state" || result.reason === "assessment_unavailable") {
        await router.invalidate();
      }
    } catch (error) {
      setFinalizationResult({ ok: false, reason: "retryable_failure" });
      toast.error(error instanceof Error ? error.message : "Could not save voice assessment.");
    } finally {
      setIsFinalizing(false);
      setEndRequested(false);
    }
  };

  const onStartCall = () => {
    if (!voice.connected) {
      setClientError("Voice connection is still preparing. Please try again in a moment.");
      return;
    }

    setClientError(null);
    setFinalizationResult(null);
    setAgentCompletionReason(null);
    setEndRequested(false);
    setIsStarting(true);
    const startPromise = voice.startCall();
    void startPromise
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Microphone access failed. Check your browser permission and try again.";
        setClientError(message);
      })
      .finally(() => {
        setIsStarting(false);
      });
  };

  const requestIntentionalEnd = async () => {
    if (endRequested) return;

    setClientError(null);
    setEndRequested(true);
    const candidateMessageCount = transcriptRef.current.filter(
      (message) => message.role === "user",
    ).length;

    if (interimTranscriptRef.current?.trim()) {
      const waitResult = await waitForCandidateUtteranceCommit({
        initialCandidateMessageCount: candidateMessageCount,
        readSnapshot: () => ({
          interimTranscript: interimTranscriptRef.current,
          candidateMessageCount: transcriptRef.current.filter((message) => message.role === "user")
            .length,
        }),
      });
      if (waitResult === "timeout") {
        setEndRequested(false);
        setClientError(
          "Zero is still capturing your last response. Pause for a moment, then try End call again.",
        );
        return;
      }
    }

    voice.endCall();
    await finalizeRef.current();
  };

  const onEndCall = () => {
    void requestIntentionalEnd();
  };

  const onRetryFinalization = () => {
    void finalizeRef.current();
  };

  const onDismissError = () => {
    setClientError(null);
  };

  const onReconnect = () => {
    setClientError(null);
    void onRefreshCapability().catch((error) => {
      setClientError(error instanceof Error ? error.message : "Could not refresh voice access.");
    });
  };

  const endingAfterFarewell = agentCompletionReason !== null;
  const endButtonDisabled =
    endRequested || isFinalizing || (endingAfterFarewell && voice.status === "speaking");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30">
      <div className="shrink-0 border-b border-border/60 bg-muted/20 px-5 py-3 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusDot
              tone={
                clientError
                  ? "danger"
                  : endingAfterFarewell
                    ? "success"
                    : voice.status === "thinking"
                      ? "amber"
                      : voice.status === "speaking"
                        ? "primary"
                        : voice.status === "listening"
                          ? "success"
                          : "muted"
              }
            />
            <div>
              <p className="text-sm font-medium">
                {clientError
                  ? "Connection issue"
                  : endingAfterFarewell
                    ? "Assessment complete"
                    : isConnecting
                      ? "Connecting"
                      : voice.status === "listening"
                        ? "Listening"
                        : voice.status === "thinking"
                          ? "Connected"
                          : voice.status === "speaking"
                            ? "Zero is speaking"
                            : isFinalizing
                              ? "Finalising results"
                              : "Voice communication assessment"}
              </p>
              <p className="text-xs text-muted-foreground">
                {endingAfterFarewell
                  ? "Confirm once you have heard Zero's full closing."
                  : isInCall
                    ? "Speak naturally. Zero will follow up when you pause."
                    : "A short voice conversation to assess communication skills."}
              </p>
            </div>
          </div>

          {isInCall ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={onEndCall}
              disabled={endButtonDisabled}
            >
              {endRequested ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
              ) : (
                <HugeiconsIcon icon={PhoneOff01Icon} strokeWidth={2} className="size-4" />
              )}
              {endingAfterFarewell ? "I heard Zero — finish" : "End call"}
            </Button>
          ) : null}
        </div>
      </div>

      {messages.length === 0 && !interim ? (
        <VoiceEmptyState finalising={isFinalizing} error={clientError} />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-7 px-5 py-6 md:px-7 md:py-7">
            {messages.map((message, index) => (
              <TranscriptBubble
                key={`${index}-${message.role}`}
                message={{
                  role: message.role === "user" ? "candidate" : "assistant",
                  content: message.text,
                }}
                userLabel="You"
              />
            ))}

            {voice.status === "thinking" ? <InterviewThinkingBubble /> : null}
            {interim ? <InterviewInterimBubble content={interim} /> : null}
            <div ref={transcriptEndRef} className="h-1" />
          </div>
        </ScrollArea>
      )}

      <div className="shrink-0 border-t border-border/50 bg-card px-4 py-4 md:px-6 md:py-5">
        {clientError ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-danger">{clientError}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onDismissError}>
                Dismiss
              </Button>
              {!voice.connected ? (
                <Button size="sm" onClick={onReconnect}>
                  Reconnect
                </Button>
              ) : null}
            </div>
          </div>
        ) : isFinalizing ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
            Finalising results
          </div>
        ) : finalizationResult?.ok === false &&
          finalizationResult.reason === "retryable_failure" ? (
          <FinalizationRetry onRetry={onRetryFinalization} />
        ) : finalizationResult?.ok === false &&
          finalizationResult.reason === "no_candidate_speech" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              No candidate response was captured. Start the assessment and try again.
            </p>
            <Button size="sm" onClick={onStartCall} disabled={!voice.connected || isStarting}>
              <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-4" />
              Start voice assessment
            </Button>
          </div>
        ) : finalizationResult?.ok === false ? (
          <p className="text-center text-sm text-muted-foreground">
            This voice assessment is no longer available. Refreshing the interview status…
          </p>
        ) : isInCall ? (
          <ActiveCallFooter audioLevel={voice.audioLevel} status={voice.status} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {voice.connected
                ? "Make sure you're in a quiet spot with your microphone working."
                : "Preparing the secure voice connection…"}
            </p>
            <Button size="sm" onClick={onStartCall} disabled={!voice.connected || isStarting}>
              {isStarting ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
              ) : (
                <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-4" />
              )}
              Start voice assessment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CompletedVoiceAssessment({ messages }: { messages: VoiceDisplayMessage[] }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30">
      {messages.length > 0 ? (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-7 px-5 py-6 md:px-7 md:py-7">
            {messages.map((message, index) => (
              <TranscriptBubble
                key={`completed-${index}-${message.role}-${message.text.length}`}
                message={{
                  role: message.role === "user" ? "candidate" : "assistant",
                  content: message.text,
                }}
                userLabel="You"
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
            <div className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-muted/30">
              <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-5 text-primary" />
            </div>
            <p className="text-sm text-foreground">Transcript unavailable</p>
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-border/50 bg-card px-5 py-4 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <CompletedInterviewBar
            title="Voice assessment complete"
            description="Your results are included in the report."
          />
          <Button size="sm" variant="outline" asChild>
            <Link to="/dashboard/applications">Back to applications</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreparingVoiceAssessment() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2}
            className="size-6 animate-spin text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">Preparing voice assessment</p>
        </div>
      </div>
    </div>
  );
}

function PreparationError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <CompletedState
      icon={<HugeiconsIcon icon={PhoneOff01Icon} strokeWidth={2} className="size-6 text-danger" />}
      iconBg="bg-danger/10"
      title="Could not prepare voice assessment"
      description={message}
      actions={
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}

function FinalizationRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Could not save your assessment. Your committed transcript is safe; please try again.
      </p>
      <Button size="sm" onClick={onRetry} className="px-5">
        Try again
      </Button>
    </div>
  );
}

function ActiveCallFooter({
  audioLevel,
  status,
}: {
  audioLevel: number;
  status: "idle" | "listening" | "thinking" | "speaking";
}) {
  const bars = Array.from({ length: 14 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick((current) => (current + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const time = tick / 6;

  return (
    <div className="flex h-12 items-end justify-center gap-1 py-1" aria-hidden="true">
      {bars.map((_, index) => {
        const idle = (Math.sin(time + index * 0.6) + 1) / 2;
        const active =
          status === "listening"
            ? Math.min(1, audioLevel * 4 + idle * 0.15)
            : status === "speaking"
              ? 0.4 + idle * 0.4
              : status === "thinking"
                ? 0.15 + idle * 0.15
                : 0.05;
        const height = Math.max(0.08, active);
        return (
          <span
            key={index}
            className={cn(
              "w-1 rounded-full transition-[background-color] duration-100",
              status === "listening"
                ? "bg-success"
                : status === "speaking"
                  ? "bg-primary"
                  : status === "thinking"
                    ? "bg-amber-500"
                    : "bg-muted-foreground/40",
            )}
            style={{ height: `${Math.round(height * 36) + 4}px` }}
          />
        );
      })}
    </div>
  );
}

function StatusDot({ tone }: { tone: "primary" | "success" | "amber" | "danger" | "muted" }) {
  return (
    <span className="relative flex size-2.5 shrink-0 items-center justify-center">
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
          tone === "primary"
            ? "bg-primary"
            : tone === "success"
              ? "bg-success"
              : tone === "amber"
                ? "bg-amber-500"
                : tone === "danger"
                  ? "bg-danger"
                  : "bg-muted-foreground/50",
        )}
      />
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          tone === "primary"
            ? "bg-primary"
            : tone === "success"
              ? "bg-success"
              : tone === "amber"
                ? "bg-amber-500"
                : tone === "danger"
                  ? "bg-danger"
                  : "bg-muted-foreground/60",
        )}
      />
    </span>
  );
}

function VoiceEmptyState({ finalising, error }: { finalising: boolean; error: string | null }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-muted/30">
          <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-5 text-primary" />
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          {error
            ? "Something went wrong"
            : finalising
              ? "Wrapping up your assessment…"
              : "Voice assessment with Zero starts here."}
        </p>
        <p className="text-xs text-muted-foreground/80">
          {error
            ? error
            : finalising
              ? "We're saving your responses now."
              : "Speak naturally about your experience. There are no wrong answers."}
        </p>
      </div>
    </div>
  );
}

function CompletedState({
  icon,
  iconBg,
  title,
  description,
  actions,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30">
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className={cn("flex size-14 items-center justify-center rounded-full", iconBg)}>
            {icon}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {actions ? <div className="flex items-center gap-2 pt-1">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
