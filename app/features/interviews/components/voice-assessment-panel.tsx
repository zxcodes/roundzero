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
  const [clientError, setClientError] = useState<string | null>(null);

  const { status: doStatus, agentError } = useVoiceAssessmentState(interviewId);

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
  const effectiveStatus: VoiceAssessmentStatus | null = doStatus ?? dbStatus ?? null;

  const initFn = useServerFn(initializeMyVoiceAssessment);
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

  useEffect(() => {
    initMutation.mutate({ data: { interviewId } });
  }, [interviewId]);

  const errorMessage = clientError ?? agentError;

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

  const needsResume = effectiveStatus === "in_call";

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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skipMutation.mutate({ data: { interviewId } })}
              disabled={skipMutation.isPending}
            >
              Skip
            </Button>
          </div>

          {/* Error state */}
          {errorMessage ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="text-sm text-danger">{errorMessage}</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setClientError(null)}>
                  Try Again
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => skipMutation.mutate({ data: { interviewId } })}
                >
                  Skip
                </Button>
              </div>
            </div>
          ) : (
            <VoiceCallController
              interviewId={interviewId}
              needsResume={needsResume}
              onClientError={setClientError}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Only mounts useVoiceAgent once the user clicks Start/Resume.
 * This prevents premature WebSocket connections that confuse
 * the voice mixin's onCallStart lifecycle.
 */
function VoiceCallController({
  interviewId,
  needsResume,
  onClientError,
}: {
  interviewId: string;
  needsResume: boolean;
  onClientError: (msg: string | null) => void;
}) {
  const [phase, setPhase] = useState<"ready" | "active">("ready");

  const onStart = () => {
    onClientError(null);
    setPhase("active");
  };

  const onEnd = () => {
    setPhase("ready");
  };

  if (phase === "active") {
    return (
      <ActiveVoiceCall interviewId={interviewId} onEnd={onEnd} onClientError={onClientError} />
    );
  }

  return (
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
      <Button size="lg" onClick={onStart}>
        <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="mr-2 size-5" />
        {needsResume ? "Resume Call" : "Start Voice Assessment"}
      </Button>
    </div>
  );
}

function ActiveVoiceCall({
  interviewId,
  onEnd,
  onClientError,
}: {
  interviewId: string;
  onEnd: () => void;
  onClientError: (msg: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isEnding, setIsEnding] = useState(false);

  const voice = useVoiceAgent({
    agent: "VoiceAssessmentAgent",
    name: interviewId,
  });

  const endIntentFn = useServerFn(markMyVoiceAssessmentEndIntent);

  // Wait for the WebSocket to connect before calling startCall().
  // useVoiceAgent manages the connection automatically, but startCall()
  // requires the socket to be ready first.
  const hasStartedCall = useRef(false);
  useEffect(() => {
    if (voice.connected && !hasStartedCall.current) {
      hasStartedCall.current = true;
      voice.startCall().catch(() => {
        onClientError("Could not start voice call. Please check your microphone permissions.");
      });
    }
  }, [voice.connected, interviewId, voice.startCall, onClientError]);

  useEffect(() => {
    if (voice.error) {
      onClientError(voice.error);
    }
  }, [voice.error, onClientError]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [voice.transcript]);

  const onEndCall = async () => {
    if (isEnding) return;
    setIsEnding(true);
    onClientError(null);
    try {
      await endIntentFn({ data: { interviewId } });
    } catch {
      // non-fatal
    }
    voice.endCall();
    onEnd();
  };

  const isVoiceActive =
    voice.status === "listening" || voice.status === "speaking" || voice.status === "thinking";

  // Only show assistant transcript lines that have actual text.
  // If the agent is currently thinking/speaking but the latest assistant
  // turn is still empty, we show a typing indicator instead.
  const visibleTranscript = voice.transcript.filter(
    (msg) => msg.role === "user" || msg.text.trim().length > 0,
  );

  const lastMsg = voice.transcript[voice.transcript.length - 1];
  const isAgentResponding =
    isVoiceActive && lastMsg?.role === "assistant" && lastMsg.text.trim().length === 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-end">
        <Button size="sm" variant="destructive" onClick={onEndCall} disabled={isEnding}>
          <HugeiconsIcon icon={PhoneOff01Icon} strokeWidth={2} className="mr-1.5 size-4" />
          End Call
        </Button>
      </div>

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
          {voice.status === "idle" ? "Ready" : null}
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
              <span className="mt-0.5 text-xs font-semibold text-muted-foreground">Zero:</span>
              <p className="text-sm text-muted-foreground">...</p>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
