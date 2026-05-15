import { useVoiceAgent } from "@cloudflare/voice/react";
import {
  Loading03Icon,
  Mic01Icon,
  MicOff01Icon,
  PhoneOff01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getMyVoiceAssessment,
  getMyVoiceAssessmentTranscript,
  initializeMyVoiceAssessment,
  markMyVoiceAssessmentEndIntent,
  skipMyVoiceAssessment,
} from "@/features/interviews/server/functions";
import { cn } from "@/lib/utils";

type VoiceAssessmentStatus = "pending" | "in_call" | "completed" | "skipped" | "error";

type ChatMessage = { role: string; text: string };

export function VoiceAssessmentPanel({ interviewId }: { interviewId: string }) {
  const router = useRouter();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const autoResumedRef = useRef(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [justEnded, setJustEnded] = useState(false);

  const { data: dbData, isPending: dbPending } = useQuery({
    queryKey: ["voice-assessment", interviewId],
    queryFn: async () => {
      const result = await getMyVoiceAssessment({ data: { interviewId } });
      return result?.assessment ?? null;
    },
  });

  const effectiveStatus: VoiceAssessmentStatus | null =
    dbData?.status === "in_progress"
      ? "in_call"
      : ((dbData?.status as VoiceAssessmentStatus | undefined) ?? null);

  const isTerminal = effectiveStatus === "completed" || effectiveStatus === "skipped";

  const voice = useVoiceAgent({
    agent: "VoiceAssessmentAgent",
    name: interviewId,
    enabled: !isTerminal,
  });

  const initFn = useServerFn(initializeMyVoiceAssessment);
  const endIntentFn = useServerFn(markMyVoiceAssessmentEndIntent);
  const skipFn = useServerFn(skipMyVoiceAssessment);

  const initMutation = useMutation({
    mutationFn: initFn,
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not initialize assessment.");
    },
  });

  const skipMutation = useMutation({
    mutationFn: skipFn,
    onSuccess: async () => {
      toast.success("Voice assessment skipped.");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not skip assessment.");
    },
  });

  const isInCall = voice.status !== "idle";
  const needsResume = effectiveStatus === "in_call" && !justEnded && !isInCall;

  const { data: historicalTranscript } = useQuery({
    queryKey: ["voice-assessment-transcript", interviewId],
    queryFn: async () => {
      const result = await getMyVoiceAssessmentTranscript({ data: { interviewId } });
      return result.messages;
    },
    enabled: needsResume,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const liveTranscript: ChatMessage[] = voice.transcript.map((m) => ({
    role: m.role,
    text: m.text,
  }));
  // Show server-persisted history before the live channel has any messages,
  // then switch to the live channel once the resumed conversation is flowing.
  // This avoids double-rendering the same message during reconnect.
  const baseTranscript: ChatMessage[] =
    liveTranscript.length === 0
      ? (historicalTranscript ?? []).map((m) => ({ role: m.role, text: m.content }))
      : liveTranscript;

  const visibleTranscript = baseTranscript.filter(
    (msg) => msg.role === "user" || msg.text.trim().length > 0,
  );

  // Initialise the agent only once per mount, and never for terminal states.
  useEffect(() => {
    if (isTerminal) return;
    initMutation.mutate({ data: { interviewId } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId, isTerminal]);

  useEffect(() => {
    if (voice.error) {
      setClientError(voice.error);
    }
  }, [voice.error]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  }, [visibleTranscript.length, voice.interimTranscript]);

  // Reset transient flags when the DB confirms a terminal state
  useEffect(() => {
    if (effectiveStatus === "completed" || effectiveStatus === "skipped") {
      setJustEnded(false);
      autoResumedRef.current = false;
    }
  }, [effectiveStatus]);

  // Auto-resume: when the DB says we're "in_call" but the WS is still idle
  // (e.g. transient drop, refresh), kick startCall once instead of forcing
  // the candidate to manually click Resume. This matches the way the chat
  // panel silently rehydrates after a refresh.
  useEffect(() => {
    if (
      effectiveStatus === "in_call" &&
      voice.status === "idle" &&
      voice.connected &&
      !justEnded &&
      !clientError &&
      !initMutation.isPending &&
      !autoResumedRef.current
    ) {
      autoResumedRef.current = true;
      voice.startCall().catch(() => {
        autoResumedRef.current = false;
        setClientError("Could not auto-resume the call. Please click Resume to continue.");
      });
    }
  }, [
    effectiveStatus,
    voice.status,
    voice.connected,
    justEnded,
    clientError,
    initMutation.isPending,
    voice.startCall,
  ]);

  const onStartCall = () => {
    setClientError(null);
    autoResumedRef.current = true;
    voice.startCall().catch(() => {
      autoResumedRef.current = false;
      setClientError("Could not start voice call. Please check your microphone permissions.");
    });
  };

  const onEndCall = async () => {
    setClientError(null);
    try {
      await endIntentFn({ data: { interviewId } });
    } catch {
      // non-fatal
    }
    voice.endCall();
    setJustEnded(true);
  };

  const onSkip = () => {
    skipMutation.mutate({ data: { interviewId } });
  };

  // ---------- Terminal states ----------

  if (effectiveStatus === "completed") {
    return (
      <CompletedState
        icon={<HugeiconsIcon icon={Tick01Icon} strokeWidth={2} className="size-6 text-success" />}
        iconBg="bg-success/10"
        title="Voice assessment complete"
        description="Your results are included in the report."
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
      />
    );
  }

  // ---------- Loading ----------

  if (dbPending || (initMutation.isPending && !visibleTranscript.length)) {
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

  const reconnecting = effectiveStatus === "in_call" && !isInCall && !clientError && !justEnded;
  const finalising = justEnded && !isInCall;
  const showStartScreen = !isInCall && !finalising && !reconnecting;
  const interim = voice.interimTranscript?.trim() ?? "";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30">
      {/* Status strip — mirrors the chat header band */}
      <div className="shrink-0 border-b border-border/50 bg-card/60 px-5 py-3 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusDot
              tone={
                clientError
                  ? "danger"
                  : isInCall
                    ? voice.status === "thinking"
                      ? "amber"
                      : voice.status === "speaking"
                        ? "primary"
                        : "success"
                    : reconnecting
                      ? "amber"
                      : "muted"
              }
            />
            <div>
              <p className="text-sm font-medium">
                {clientError
                  ? "Connection issue"
                  : isInCall
                    ? voice.status === "listening"
                      ? "Listening…"
                      : voice.status === "thinking"
                        ? "Zero is thinking…"
                        : voice.status === "speaking"
                          ? "Zero is speaking…"
                          : "Connecting…"
                    : reconnecting
                      ? "Reconnecting…"
                      : finalising
                        ? "Finalising results…"
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={voice.toggleMute}
                aria-label={voice.isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                <HugeiconsIcon
                  icon={voice.isMuted ? MicOff01Icon : Mic01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              </Button>
              <Button size="sm" variant="destructive" onClick={onEndCall}>
                <HugeiconsIcon icon={PhoneOff01Icon} strokeWidth={2} className="size-4" />
                End call
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={onSkip} disabled={skipMutation.isPending}>
              {skipMutation.isPending ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
              ) : null}
              Skip
            </Button>
          )}
        </div>
      </div>

      {/* Transcript surface — same shape as the chat ScrollArea */}
      <ScrollArea className="min-h-0 flex-1">
        {visibleTranscript.length === 0 && !interim ? (
          <VoiceEmptyState
            reconnecting={reconnecting}
            finalising={finalising}
            error={clientError}
          />
        ) : (
          <div className="space-y-7 px-5 py-6 md:px-7 md:py-7">
            {visibleTranscript.map((msg, i) => {
              const isCandidate = msg.role === "user";
              return (
                <div
                  key={`${msg.role}-${i}-${msg.text.slice(0, 16)}`}
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

            {voice.status === "thinking" ? (
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
        )}
      </ScrollArea>

      {/* Footer — composer-equivalent for the voice surface */}
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
          <ActiveCallFooter audioLevel={voice.audioLevel} status={voice.status} />
        ) : finalising ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
            Finalising results…
          </div>
        ) : reconnecting ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
              Reconnecting your call…
            </div>
            <Button variant="outline" size="sm" onClick={onStartCall}>
              <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-4" />
              Resume manually
            </Button>
          </div>
        ) : showStartScreen ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {needsResume
                ? "Your voice call was interrupted. Resume to continue."
                : "Make sure you're in a quiet spot with your microphone working."}
            </p>
            <Button size="sm" onClick={onStartCall} className="px-5">
              <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-4" />
              {needsResume ? "Resume call" : "Start voice assessment"}
            </Button>
          </div>
        ) : null}
      </div>
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
  // 14 bars driven by audioLevel + a phase offset so they don't all move in
  // lockstep. While "thinking" or "speaking", we drive a gentle idle pulse so
  // the candidate sees the panel is alive.
  const bars = Array.from({ length: 14 });
  const t = Date.now() / 200;

  return (
    <div className="flex items-end justify-center gap-1 py-1" aria-hidden="true">
      {bars.map((_, i) => {
        const idle = (Math.sin(t + i * 0.6) + 1) / 2; // 0..1
        const active =
          status === "listening"
            ? Math.min(1, audioLevel * 4 + idle * 0.15)
            : status === "speaking"
              ? 0.4 + idle * 0.4
              : status === "thinking"
                ? 0.15 + idle * 0.15
                : 0.05;
        const heightPct = Math.max(0.08, active);
        return (
          <span
            key={i}
            className={cn(
              "w-1 rounded-full transition-[height,background-color] duration-100",
              status === "listening"
                ? "bg-success"
                : status === "speaking"
                  ? "bg-primary"
                  : status === "thinking"
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

function VoiceEmptyState({
  reconnecting,
  finalising,
  error,
}: {
  reconnecting: boolean;
  finalising: boolean;
  error: string | null;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-card shadow-sm">
          <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-5 text-primary" />
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          {error
            ? "Something went wrong"
            : reconnecting
              ? "Reconnecting your call…"
              : finalising
                ? "Wrapping up your assessment…"
                : "Voice assessment with Zero starts here."}
        </p>
        <p className="text-xs text-muted-foreground/80">
          {error
            ? error
            : reconnecting
              ? "Hang tight — your conversation history is preserved."
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
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
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
        </div>
      </div>
    </div>
  );
}
