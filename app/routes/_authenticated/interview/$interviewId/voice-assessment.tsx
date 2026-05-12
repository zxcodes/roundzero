import { useVoiceAgent } from "@cloudflare/voice/react";
import { Loading03Icon, Mic01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getMyVoiceAssessment,
  skipMyVoiceAssessment,
} from "@/features/interviews/server/functions";
import { Route as ParentRoute } from "../$interviewId";

export const Route = createFileRoute("/_authenticated/interview/$interviewId/voice-assessment")({
  component: VoiceAssessmentPage,
});

function VoiceAssessmentPage() {
  const { interview } = ParentRoute.useLoaderData();
  return <VoiceAssessmentContent key={interview.id} interviewId={interview.id} />;
}

function VoiceAssessmentContent({ interviewId }: { interviewId: string }) {
  const router = useRouter();
  const [showLoading, setShowLoading] = useState(true);
  const [showProcessing, setShowProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: assessment, isPending } = useQuery({
    queryKey: ["voice-assessment-status", interviewId],
    queryFn: async () => {
      const result = await getMyVoiceAssessment({ data: { interviewId } });
      return result?.assessment ?? null;
    },
    refetchInterval: (query) => {
      if (query.state.data?.status && query.state.data.status !== "pending") {
        return false;
      }
      if (showProcessing) return 2000;
      return false;
    },
  });

  const voice = useVoiceAgent({
    agent: "VoiceAssessmentAgent",
    name: interviewId,
  });

  useEffect(() => {
    if (!isPending) {
      setShowLoading(false);
    }
  }, [isPending]);

  useEffect(() => {
    if (assessment?.status === "completed" || assessment?.status === "skipped") {
      setShowProcessing(false);
    }
  }, [assessment?.status]);

  useEffect(() => {
    if (voice.error) {
      setErrorMessage(voice.error);
    }
  }, [voice.error]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [voice.transcript]);

  if (showLoading || isPending) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2}
            className="size-6 animate-spin text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (assessment?.status === "completed") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
            <HugeiconsIcon icon={Tick01Icon} strokeWidth={2} className="size-8 text-success" />
          </div>
          <h2 className="text-xl font-semibold">Assessment Complete</h2>
          <p className="text-sm text-muted-foreground">
            Your communication assessment was recorded. It will be included in your final interview
            report.
          </p>
        </div>
      </div>
    );
  }

  if (assessment?.status === "skipped") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h2 className="text-xl font-semibold">Assessment Skipped</h2>
          <p className="text-sm text-muted-foreground">
            You chose to skip the voice communication assessment. Your report will be based on the
            text interview only.
          </p>
        </div>
      </div>
    );
  }

  const isInError = errorMessage !== null;
  const isVoiceActive =
    voice.status === "listening" || voice.status === "speaking" || voice.status === "thinking";
  const pageState = showProcessing
    ? "processing"
    : isVoiceActive
      ? "in_call"
      : isInError
        ? "error"
        : "ready";

  const onStartCall = async () => {
    setErrorMessage(null);
    try {
      await voice.startCall();
    } catch {
      setErrorMessage("Could not start voice call. Please check your microphone permissions.");
    }
  };

  const onEndCall = () => {
    voice.endCall();
    setShowProcessing(true);
  };

  const onSkip = async () => {
    setShowProcessing(true);
    try {
      await skipMyVoiceAssessment({ data: { interviewId } });
      setShowProcessing(false);
      await router.invalidate();
    } catch {
      setShowProcessing(false);
      toast.error("Could not skip assessment. Please try again.");
    }
  };

  if (isInError && pageState === "error") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h2 className="text-xl font-semibold">Something Went Wrong</h2>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setErrorMessage(null)}>
              Try Again
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              Skip Assessment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-card px-4 py-3.5 md:px-6 md:py-4">
        <div>
          <h2 className="text-base font-semibold md:text-lg">Voice Communication Assessment</h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            A quick ~5 minute voice conversation to assess communication skills
          </p>
        </div>
        <div className="flex gap-2">
          {pageState === "in_call" ? (
            <Button size="sm" onClick={onEndCall}>
              End Call
            </Button>
          ) : null}
          {pageState === "ready" || pageState === "error" ? (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 p-6">
        {pageState === "ready" ? (
          <div className="flex max-w-md flex-col items-center gap-6 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-10 text-primary" />
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">
                You will have a short voice conversation to evaluate how you communicate. Speak
                naturally — there are no wrong answers.
              </p>
              <p className="text-xs text-muted-foreground">
                Make sure you are in a quiet environment and your microphone works.
              </p>
            </div>
            <Button size="lg" onClick={onStartCall}>
              <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="mr-2 size-5" />
              Start Assessment
            </Button>
          </div>
        ) : null}

        {pageState === "in_call" && !isVoiceActive ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon
                icon={Loading03Icon}
                strokeWidth={2}
                className="size-10 animate-spin text-primary"
              />
            </div>
            <p className="text-sm text-muted-foreground">Connecting...</p>
          </div>
        ) : null}

        {pageState === "in_call" && isVoiceActive ? (
          <div className="flex w-full max-w-lg flex-1 flex-col gap-4">
            <div className="flex items-center justify-center gap-4">
              <div
                className="flex size-24 items-center justify-center rounded-full transition-colors"
                style={{
                  backgroundColor:
                    voice.status === "listening"
                      ? `rgba(34, 197, 94, ${0.1 + voice.audioLevel * 0.4})`
                      : "hsl(var(--muted))",
                  boxShadow:
                    voice.audioLevel > 0
                      ? `0 0 20px rgba(34, 197, 94, ${voice.audioLevel * 0.3})`
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
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {voice.status === "listening" ? "Listening..." : null}
              {voice.status === "thinking" ? "Thinking..." : null}
              {voice.status === "speaking" ? "Speaking..." : null}
            </p>

            {voice.transcript.length > 0 ? (
              <ScrollArea
                ref={scrollRef}
                className="h-48 rounded-lg border border-border/60 bg-muted/30 p-3"
              >
                <div className="flex flex-col gap-2">
                  {voice.transcript.map((msg, i) => (
                    <p
                      key={i}
                      className={`text-sm ${msg.role === "assistant" ? "text-foreground" : "text-primary"}`}
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {msg.role === "assistant" ? "Zero" : "You"}:
                      </span>{" "}
                      {msg.text}
                    </p>
                  ))}
                </div>
              </ScrollArea>
            ) : null}
          </div>
        ) : null}

        {pageState === "processing" ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon
                icon={Loading03Icon}
                strokeWidth={2}
                className="size-10 animate-spin text-primary"
              />
            </div>
            <p className="text-sm text-muted-foreground">Analyzing your responses...</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
