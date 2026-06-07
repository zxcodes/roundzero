import { Loading03Icon, Mic01Icon, PhoneOff01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { RealtimeToken } from "@tanstack/ai";
import { useRealtimeChat } from "@tanstack/ai-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  completeMyVoiceAssessment,
  getMyVoiceAssessment,
  getMyVoiceAssessmentTranscript,
  getMyVoiceToken,
  registerMyVoiceAssessmentSession,
  skipMyVoiceAssessment,
} from "@/features/interviews/server/functions";
import { voiceRealtimeAdapter } from "@/features/interviews/shared/voice-realtime-adapter";
import { cn } from "@/lib/utils";

type VoiceAssessmentStatus = "pending" | "in_call" | "completed" | "skipped" | "error";

type ChatMessage = { role: "assistant" | "user"; text: string };

const normMessage = (m: ChatMessage): string =>
  `${m.role}:${m.text.replace(/\s+/g, " ").trim().toLowerCase()}`;

export function VoiceAssessmentPanel({ interviewId }: { interviewId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const completeCalledRef = useRef(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [justEnded, setJustEnded] = useState(false);

  const { data: dbData, isPending: dbPending } = useQuery({
    queryKey: ["voice-assessment", interviewId],
    queryFn: async () => {
      const result = await getMyVoiceAssessment({ data: { interviewId } });
      return result?.assessment ?? null;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "skipped" ? false : 2000;
    },
  });

  const effectiveStatus: VoiceAssessmentStatus | null = (() => {
    if (!dbData?.status) return null;
    if (dbData.status === "in_progress") return "in_call";
    if (
      dbData.status === "pending" ||
      dbData.status === "completed" ||
      dbData.status === "skipped"
    ) {
      return dbData.status;
    }
    return "error";
  })();

  const isTerminal = effectiveStatus === "completed" || effectiveStatus === "skipped";

  const skipFn = useServerFn(skipMyVoiceAssessment);
  const completeFn = useServerFn(completeMyVoiceAssessment);
  const getTokenFn = useServerFn(getMyVoiceToken);
  const registerSessionFn = useServerFn(registerMyVoiceAssessmentSession);

  const registerSessionMutation = useMutation({
    mutationFn: registerSessionFn,
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not register the voice session.");
    },
  });

  const registerConversationRef = useRef<(conversationId: string) => Promise<void>>(async () => {});
  registerConversationRef.current = async (conversationId: string) => {
    await registerSessionMutation.mutateAsync({
      data: {
        interviewId,
        conversationId,
      },
    });
  };

  const chat = useRealtimeChat({
    getToken: () =>
      getTokenFn({
        data: { interviewId },
      }) as Promise<RealtimeToken>,
    adapter: voiceRealtimeAdapter({
      onConversationStarted: (conversationId) => registerConversationRef.current(conversationId),
    }),
    onError: (error) => {
      setClientError(error.message);
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeFn,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["voice-assessment", interviewId] });
      queryClient.invalidateQueries({
        queryKey: ["voice-assessment-transcript", interviewId],
      });
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save voice assessment.");
    },
  });

  const skipMutation = useMutation({
    mutationFn: skipFn,
    onSuccess: async () => {
      toast.success("Voice assessment skipped.");
      queryClient.invalidateQueries({ queryKey: ["voice-assessment", interviewId] });
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not skip assessment.");
    },
  });

  const isInCall = chat.status === "connected" || chat.status === "connecting";
  const isConnecting = chat.status === "connecting";

  const { data: historicalTranscript } = useQuery({
    queryKey: ["voice-assessment-transcript", interviewId],
    queryFn: async () => {
      const result = await getMyVoiceAssessmentTranscript({ data: { interviewId } });
      return result.messages;
    },
    enabled: isTerminal,
    staleTime: 30_000,
  });

  // Derive a chat-shaped transcript. Live messages from the realtime hook are
  // role+parts; we flatten them down to plain text and tag candidate-role.
  const liveTranscript: ChatMessage[] = chat.messages
    .map((msg): ChatMessage | null => {
      if (msg.role !== "assistant" && msg.role !== "user") return null;
      const text = msg.parts
        .map((part) => {
          if (part.type === "text") return part.content;
          if (part.type === "audio") return part.transcript;
          return "";
        })
        .join(" ")
        .trim();
      if (!text) return null;
      return { role: msg.role, text };
    })
    .filter((m): m is ChatMessage => m !== null);

  // Keep the latest live transcript in a ref so the auto-submit effect below
  // can read it without listing the (always-new) array in its dependencies.
  // Without this, the 2s dbData refetch re-renders the component and would
  // continuously reset the auto-submit timer so it never fires.
  const liveTranscriptRef = useRef<ChatMessage[]>([]);
  liveTranscriptRef.current = liveTranscript;

  const historicalChat: ChatMessage[] = (historicalTranscript ?? []).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    text: m.content,
  }));
  const historicalKeys = new Set(historicalChat.map(normMessage));
  const visibleTranscript: ChatMessage[] = [
    ...historicalChat,
    ...liveTranscript.filter((m) => !historicalKeys.has(normMessage(m))),
  ].filter((msg) => msg.role === "user" || msg.text.trim().length > 0);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  }, [visibleTranscript.length, chat.pendingUserTranscript]);

  // Reset transient flags when the DB confirms a terminal state.
  useEffect(() => {
    if (effectiveStatus === "completed" || effectiveStatus === "skipped") {
      setJustEnded(false);
      completeCalledRef.current = false;
    }
  }, [effectiveStatus]);

  // Detect the call ending for ANY reason — the candidate clicking "End call",
  // the ElevenLabs agent invoking its `end_call` tool, or an unexpected drop.
  // We mark `justEnded` so the finalisation path below runs regardless of who
  // hung up. (Manual end also sets this; the flag is idempotent.)
  const wasConnectedRef = useRef(false);
  useEffect(() => {
    if (chat.status === "connected") {
      wasConnectedRef.current = true;
      return;
    }
    if (chat.status === "idle" && wasConnectedRef.current) {
      wasConnectedRef.current = false;
      // On an error disconnect the adapter sets `clientError`; let the candidate
      // dismiss/retry/skip instead of finalising a half-finished transcript.
      if (clientError) return;
      setJustEnded(true);
      queryClient.invalidateQueries({ queryKey: ["voice-assessment", interviewId] });
    }
  }, [chat.status, clientError, queryClient, interviewId]);

  // Give the ElevenLabs webhook a chance to persist the transcript first.
  // If that never happens, fall back to the browser transcript so local dev
  // and webhook outages do not permanently strand the assessment.
  useEffect(() => {
    if (chat.status !== "idle") return;
    if (!justEnded) return;
    if (completeCalledRef.current) return;
    if (effectiveStatus === "completed" || effectiveStatus === "skipped") return;
    if (liveTranscriptRef.current.length === 0) return;

    const timeoutId = window.setTimeout(() => {
      const transcript = liveTranscriptRef.current;
      if (completeCalledRef.current || transcript.length === 0) return;
      completeCalledRef.current = true;
      completeMutation.mutate({
        data: {
          interviewId,
          messages: transcript.map((m) => ({ role: m.role, content: m.text })),
        },
      });
    }, 8_000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [chat.status, justEnded, effectiveStatus, interviewId, completeMutation.mutate]);

  const onStartCall = () => {
    setClientError(null);
    chat.connect().catch((error) => {
      const message = error instanceof Error ? error.message : "Could not start voice call.";
      setClientError(message);
    });
  };

  const onEndCall = async () => {
    setClientError(null);
    setJustEnded(true);
    try {
      await chat.disconnect();
    } catch {
      // non-fatal — the fallback effect above still runs once status is idle
    }
    queryClient.invalidateQueries({ queryKey: ["voice-assessment", interviewId] });
  };

  const onSkip = () => {
    skipMutation.mutate({ data: { interviewId } });
  };

  // Manual submit — the guaranteed path to persist the assessment once the call
  // has ended, without waiting on the webhook grace period. Mirrors the text
  // interview's explicit submit so the candidate is never stranded.
  const onSubmitTranscript = () => {
    if (completeCalledRef.current || completeMutation.isPending) return;
    const transcript = liveTranscriptRef.current;
    if (transcript.length === 0) {
      toast.error("No conversation was recorded. Try starting the assessment again.");
      return;
    }
    completeCalledRef.current = true;
    completeMutation.mutate({
      data: {
        interviewId,
        messages: transcript.map((m) => ({ role: m.role, content: m.text })),
      },
    });
  };

  // ---------- Terminal states ----------

  if (effectiveStatus === "completed") {
    return (
      <CompletedState
        icon={<HugeiconsIcon icon={Tick01Icon} strokeWidth={2} className="size-6 text-success" />}
        iconBg="bg-success/10"
        title="Voice assessment complete"
        description="Your results are included in the report."
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link to="/dashboard/applications">Back to applications</Link>
          </Button>
        }
      />
    );
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

  // ---------- Loading ----------

  if (dbPending) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <HugeiconsIcon
              icon={Loading03Icon}
              strokeWidth={2}
              className="size-6 animate-spin text-muted-foreground"
            />
            <p className="text-sm text-muted-foreground">Preparing voice assessment…</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Active workspace ----------

  const finalising = (justEnded && !isInCall) || completeMutation.isPending;
  const showStartScreen = !isInCall && !finalising;
  const interim = chat.mode === "listening" ? (chat.pendingUserTranscript?.trim() ?? "") : "";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30">
      <div className="shrink-0 border-b border-border/50 bg-card/60 px-5 py-3 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusDot
              tone={
                clientError
                  ? "danger"
                  : isInCall
                    ? chat.mode === "thinking"
                      ? "amber"
                      : chat.mode === "speaking"
                        ? "primary"
                        : "success"
                    : "muted"
              }
            />
            <div>
              <p className="text-sm font-medium">
                {clientError
                  ? "Connection issue"
                  : isConnecting
                    ? "Connecting…"
                    : isInCall
                      ? chat.mode === "listening"
                        ? "Listening…"
                        : chat.mode === "thinking"
                          ? "Thinking…"
                          : chat.mode === "speaking"
                            ? "Zero is speaking…"
                            : "Connected"
                      : finalising
                        ? completeMutation.isPending
                          ? "Finalising results…"
                          : "Call ended"
                        : "Voice communication assessment"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isInCall
                  ? "Speak naturally. Zero will follow up when you pause."
                  : "A short voice conversation to assess communication skills."}
              </p>
            </div>
          </div>

          {isInCall ? (
            <Button size="sm" variant="destructive" onClick={onEndCall}>
              <HugeiconsIcon icon={PhoneOff01Icon} strokeWidth={2} className="size-4" />
              End call
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onSkip} disabled={skipMutation.isPending}>
              {skipMutation.isPending ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
              ) : null}
              {skipMutation.isPending ? "Skipping..." : "Skip"}
            </Button>
          )}
        </div>
      </div>

      {visibleTranscript.length === 0 && !interim ? (
        <VoiceEmptyState finalising={finalising} error={clientError} />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-7 px-5 py-6 md:px-7 md:py-7">
            {visibleTranscript.map((msg, i) => {
              const isCandidate = msg.role === "user";
              return (
                <div
                  key={`${i}-${msg.role}-${msg.text.length}`}
                  className={isCandidate ? "flex justify-end" : "flex justify-start"}
                >
                  <div className="max-w-[86%] md:max-w-[66%]">
                    <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/90">
                      {isCandidate ? "You" : "Zero"}
                    </p>
                    <div
                      className={
                        isCandidate
                          ? "whitespace-pre-wrap wrap-break-word rounded-2xl border border-primary/35 bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm ring-1 ring-primary/20"
                          : "whitespace-pre-wrap wrap-break-word rounded-2xl border border-border/70 bg-background/95 px-4 py-3 text-sm leading-6 text-foreground shadow-sm ring-1 ring-border/35"
                      }
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {chat.mode === "thinking" ? (
              <div className="flex justify-start">
                <div className="max-w-[86%] md:max-w-[66%]">
                  <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/90">
                    Zero
                  </p>
                  <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/95 px-4 py-3 text-sm leading-6 text-muted-foreground shadow-sm ring-1 ring-border/35">
                    <span className="inline-flex items-end gap-1" aria-hidden="true">
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                    </span>
                    <span className="text-xs text-muted-foreground/80">Thinking…</span>
                  </div>
                </div>
              </div>
            ) : null}

            {interim ? (
              <div className="flex justify-end">
                <div className="max-w-[86%] md:max-w-[66%]">
                  <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/90">
                    You
                  </p>
                  <div className="whitespace-pre-wrap wrap-break-word rounded-2xl border border-primary/30 border-dashed bg-primary/5 px-4 py-3 text-sm italic leading-6 text-primary/80 shadow-none">
                    {interim}
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={transcriptEndRef} className="h-1" />
          </div>
        </ScrollArea>
      )}

      <div className="shrink-0 border-t border-border/50 bg-card px-4 py-4 md:px-6 md:py-5">
        {clientError ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-danger">{clientError}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setClientError(null)}>
                Dismiss
              </Button>
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip
              </Button>
            </div>
          </div>
        ) : isInCall ? (
          <ActiveCallFooter audioLevel={chat.inputLevel} mode={chat.mode} />
        ) : finalising ? (
          completeMutation.isPending ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
              Finalising results…
            </div>
          ) : liveTranscript.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Call ended. Submit your assessment to finish.
              </p>
              <Button size="sm" onClick={onSubmitTranscript} className="px-5">
                <HugeiconsIcon icon={Tick01Icon} strokeWidth={2} className="size-4" />
                Submit assessment
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                No conversation was recorded. Start the assessment to try again.
              </p>
              <Button size="sm" onClick={onStartCall} className="px-5">
                <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-4" />
                Start voice assessment
              </Button>
            </div>
          )
        ) : showStartScreen ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Make sure you're in a quiet spot with your microphone working.
            </p>
            <Button size="sm" onClick={onStartCall} className="px-5">
              <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-4" />
              Start voice assessment
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActiveCallFooter({
  audioLevel,
  mode,
}: {
  audioLevel: number;
  mode: "idle" | "listening" | "thinking" | "speaking";
}) {
  const bars = Array.from({ length: 14 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick((n) => (n + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const t = tick / 6;

  return (
    <div className="flex h-12 items-end justify-center gap-1 py-1" aria-hidden="true">
      {bars.map((_, i) => {
        const idle = (Math.sin(t + i * 0.6) + 1) / 2;
        const active =
          mode === "listening"
            ? Math.min(1, audioLevel * 4 + idle * 0.15)
            : mode === "speaking"
              ? 0.4 + idle * 0.4
              : mode === "thinking"
                ? 0.15 + idle * 0.15
                : 0.05;
        const heightPct = Math.max(0.08, active);
        return (
          <span
            key={i}
            className={cn(
              "w-1 rounded-full transition-[background-color] duration-100",
              mode === "listening"
                ? "bg-success"
                : mode === "speaking"
                  ? "bg-primary"
                  : mode === "thinking"
                    ? "bg-amber-500"
                    : "bg-muted-foreground/40",
            )}
            style={{ height: `${Math.round(heightPct * 36) + 4}px` }}
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
        <div className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-card shadow-sm">
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
              ? "We're scoring your responses now."
              : "Speak naturally about your experience — there are no wrong answers."}
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
