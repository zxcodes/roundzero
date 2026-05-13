import { useVoiceAgent } from "@cloudflare/voice/react";
import { Loading03Icon, Mic01Icon, PhoneOff01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAgent } from "agents/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getMyVoiceAssessment,
  getMyVoiceAssessmentTranscript,
  initializeMyVoiceAssessment,
  markMyVoiceAssessmentEndIntent,
  skipMyVoiceAssessment,
} from "@/features/interviews/server/functions";

type VoiceAssessmentStatus = "pending" | "in_call" | "completed" | "skipped" | "error";

type VoiceAgentState = {
  status: VoiceAssessmentStatus;
  intentionalEnd: boolean;
  startedAt: string | null;
  errorMessage: string | null;
  updatedAt: string;
};

function useVoiceAssessmentState(interviewId: string) {
  const agent = useAgent<{ get state(): VoiceAgentState }, VoiceAgentState>({
    agent: "VoiceAssessmentAgent",
    name: interviewId,
    onIdentityChange: () => {},
  });

  const rawState = agent.state;
  const status: VoiceAssessmentStatus | null =
    rawState &&
    typeof rawState.status === "string" &&
    ["pending", "in_call", "completed", "skipped", "error"].includes(rawState.status)
      ? rawState.status
      : null;

  return { status, agentError: rawState?.errorMessage ?? null };
}

export function VoiceAssessmentPanel({ interviewId }: { interviewId: string }) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  // DO state for completed/skipped end states
  const { status: doStatus, agentError } = useVoiceAssessmentState(interviewId);

  // DB state for initial load + fallback
  const { data: dbData, isPending: dbPending } = useQuery({
    queryKey: ["voice-assessment", interviewId],
    queryFn: async () => {
      const result = await getMyVoiceAssessment({ data: { interviewId } });
      return result?.assessment ?? null;
    },
  });

  const dbStatus: VoiceAssessmentStatus | undefined =
    dbData?.status === "in_progress"
      ? "in_call"
      : (dbData?.status as VoiceAssessmentStatus | undefined);

  // Prefer DO state for real-time updates, fall back to DB
  const effectiveStatus: VoiceAssessmentStatus | null = doStatus ?? dbStatus ?? null;
  const needsResume = effectiveStatus === "in_call";

  // Voice hook — ALWAYS mounted unconditionally at top level.
  // The WebSocket warms in the background; startCall() / endCall()
  // gate the actual voice protocol.
  const voice = useVoiceAgent({
    agent: "VoiceAssessmentAgent",
    name: interviewId,
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

  // Fetch historical transcript from DO when resuming so the UI shows
  // the full conversation, not just the current WebSocket session.
  const { data: historicalTranscript } = useQuery({
    queryKey: ["voice-assessment-transcript", interviewId],
    queryFn: async () => {
      const result = await getMyVoiceAssessmentTranscript({ data: { interviewId } });
      return result.messages;
    },
    enabled: needsResume,
    staleTime: Number.POSITIVE_INFINITY,
  });

  type ChatMessage = { role: string; text: string };

  // Merge historical (from DO SQLite) + live (from current voice session).
  // Historical messages use `content`; live messages use `text`.
  const mergedTranscript: ChatMessage[] = [
    ...(historicalTranscript ?? []).map((m) => ({ role: m.role, text: m.content })),
    ...voice.transcript.map((m) => ({ role: m.role, text: m.text })),
  ];

  // Filter out empty assistant turns (they appear while the model is thinking).
  const visibleTranscript = mergedTranscript.filter(
    (msg) => msg.role === "user" || msg.text.trim().length > 0,
  );

  const lastMsg = mergedTranscript[mergedTranscript.length - 1];
  const isAgentResponding =
    voice.status !== "idle" && lastMsg?.role === "assistant" && lastMsg.text.trim().length === 0;

  useEffect(() => {
    initMutation.mutate({ data: { interviewId } });
  }, [interviewId]);

  useEffect(() => {
    if (voice.error) {
      setClientError(voice.error);
    }
  }, [voice.error]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleTranscript]);

  if (dbPending || initMutation.isPending) {
    return (
      <div className="flex items-center justify-center border-t border-border/60 bg-muted/20 p-6">
        <div className="flex flex-col items-center gap-3">
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2}
            className="size-6 animate-spin text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">Preparing voice assessment...</p>
        </div>
      </div>
    );
  }

  if (effectiveStatus === "completed") {
    return (
      <div className="border-t border-border/60 bg-muted/20 p-4 md:p-6">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
              <HugeiconsIcon icon={Tick01Icon} strokeWidth={2} className="size-6 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium">Voice Communication Assessment</p>
              <p className="text-xs text-success">Completed — results included in your report</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (effectiveStatus === "skipped") {
    return (
      <div className="border-t border-border/60 bg-muted/20 p-4 md:p-6">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon
                icon={PhoneOff01Icon}
                strokeWidth={2}
                className="size-6 text-muted-foreground"
              />
            </div>
            <div>
              <p className="text-sm font-medium">Voice Communication Assessment</p>
              <p className="text-xs text-muted-foreground">
                Skipped — report based on text interview only
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const errorMessage = clientError ?? agentError;

  const onStartCall = () => {
    setClientError(null);
    voice.startCall().catch(() => {
      setClientError("Could not start voice call. Please check your microphone permissions.");
    });
  };

  const onEndCall = async () => {
    setClientError(null);
    try {
      await endIntentFn({ data: { interviewId } });
    } catch {
      // non-fatal — endCall below will still fire
    }
    voice.endCall();
  };

  const onSkip = () => {
    skipMutation.mutate({ data: { interviewId } });
  };

  const isInCall = voice.status !== "idle";

  return (
    <div className="border-t border-border/60 bg-muted/20 p-4 md:p-6">
      <Card>
        <CardContent className="space-y-5 p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Voice Communication Assessment</p>
                <p className="text-xs text-muted-foreground">
                  A quick ~5 minute voice conversation to assess communication skills
                </p>
              </div>
            </div>
            {isInCall ? (
              <Button size="sm" variant="destructive" onClick={onEndCall}>
                <HugeiconsIcon icon={PhoneOff01Icon} strokeWidth={2} className="mr-1.5 size-4" />
                End Call
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onSkip} disabled={skipMutation.isPending}>
                Skip
              </Button>
            )}
          </div>

          {/* Error state */}
          {errorMessage ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="text-sm text-danger">{errorMessage}</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setClientError(null)}>
                  Try Again
                </Button>
                <Button variant="ghost" onClick={onSkip}>
                  Skip
                </Button>
              </div>
            </div>
          ) : null}

          {/* Idle state — ready to start/resume */}
          {!isInCall && !errorMessage ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-8 text-primary" />
              </div>
              <div className="max-w-sm">
                <p className="text-sm text-muted-foreground">
                  {needsResume
                    ? "Your voice call was interrupted. Click below to resume where you left off."
                    : "Speak naturally about your experience — there are no wrong answers. Make sure you are in a quiet environment and your microphone works."}
                </p>
              </div>
              <Button size="lg" onClick={onStartCall}>
                <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="mr-2 size-5" />
                {needsResume ? "Resume Call" : "Start Voice Assessment"}
              </Button>
            </div>
          ) : null}

          {/* Active call state */}
          {isInCall ? (
            <div className="space-y-4">
              {/* Mic viz */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div
                  className="flex size-20 items-center justify-center rounded-full transition-all duration-150"
                  style={{
                    backgroundColor:
                      voice.status === "listening"
                        ? `hsl(142 76% 36% / ${0.1 + voice.audioLevel * 0.4})`
                        : "hsl(var(--muted))",
                    boxShadow:
                      voice.audioLevel > 0
                        ? `0 0 24px hsl(142 76% 36% / ${voice.audioLevel * 0.3})`
                        : "none",
                  }}
                >
                  <HugeiconsIcon
                    icon={Mic01Icon}
                    strokeWidth={2}
                    className={`size-10 transition-colors ${
                      voice.status === "listening" ? "text-success" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {voice.status === "listening" ? "Listening..." : null}
                  {voice.status === "thinking" ? "Thinking..." : null}
                  {voice.status === "speaking" ? "Speaking..." : null}
                </p>
              </div>

              {/* Transcript */}
              <ScrollArea
                ref={scrollRef}
                className="h-56 rounded-xl border border-border/60 bg-muted/30 p-3"
              >
                <div className="flex flex-col gap-2.5">
                  {visibleTranscript.map((msg, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="mt-0.5 text-xs font-semibold text-muted-foreground">
                        {msg.role === "assistant" ? "Zero" : "You"}:
                      </span>
                      <p
                        className={`text-sm ${
                          msg.role === "assistant" ? "text-foreground" : "text-primary"
                        }`}
                      >
                        {msg.text}
                      </p>
                    </div>
                  ))}
                  {isAgentResponding ? (
                    <div className="flex gap-2">
                      <span className="mt-0.5 text-xs font-semibold text-muted-foreground">
                        Zero:
                      </span>
                      <p className="text-sm text-muted-foreground">...</p>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
