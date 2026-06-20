import {
  ArrowUp01Icon,
  BubbleChatIcon,
  Loading03Icon,
  Mic01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { InterviewTranscript } from "@/features/interviews/components/interview-transcript";
import { CompletedInterviewBar } from "@/features/interviews/components/voice-assessment-panel";

type InterviewChatProps = {
  messages: Array<{
    id: string;
    role: "assistant" | "candidate";
    content: string;
  }>;
  canSend: boolean;
  isEnded: boolean;
  isExpired: boolean;
  isStreaming: boolean;
  /**
   * True while the model is between turns — sent but no visible text yet
   * (status `submitted`, or `streaming` with only tool-call parts so far).
   * Drives the typing indicator and locks the composer.
   */
  isThinking: boolean;
  /**
   * Optional callback rendered as the primary CTA in the ended-state footer.
   * When provided, candidates are nudged toward the voice assessment instead
   * of being pushed away to applications.
   */
  onContinueToVoice?: () => void;
  voiceCtaLabel?: string;
  onSend: (content: string) => Promise<void>;
};

export function InterviewChat({
  messages,
  canSend,
  isEnded,
  isExpired,
  isStreaming,
  isThinking,
  onContinueToVoice,
  voiceCtaLabel,
  onSend,
}: InterviewChatProps) {
  const [content, setContent] = useState("");
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      transcriptEndRef.current?.scrollIntoView({ block: "end" });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  });

  useEffect(() => {
    if (!isStreaming) {
      return;
    }

    let frame = 0;
    const syncWhileStreaming = () => {
      transcriptEndRef.current?.scrollIntoView({ block: "end" });
      frame = requestAnimationFrame(syncWhileStreaming);
    };

    frame = requestAnimationFrame(syncWhileStreaming);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isStreaming]);

  useEffect(() => {
    if (!wasStreamingRef.current && isStreaming) {
      wasStreamingRef.current = true;
      return;
    }

    if (wasStreamingRef.current && !isStreaming && canSend) {
      composerRef.current?.focus();
      wasStreamingRef.current = false;
    }
  }, [isStreaming, canSend]);

  const onSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed || !canSend || isStreaming || isThinking) {
      return;
    }

    void onSend(trimmed);
    setContent("");
    requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  };

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    onSubmit();
  };

  const onComposerChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
  };

  const onSendMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30">
      {!messages.length && !isThinking ? (
        isExpired ? (
          <EmptyInterviewComponent
            description="This interview window has closed."
            title="Interview expired"
          />
        ) : (
          <EmptyInterviewComponent
            description="Press start when you are ready."
            title="Your interview with Zero starts here"
          />
        )
      ) : (
        <ScrollArea ref={transcriptRef} className="min-h-0 flex-1">
          <InterviewTranscript messages={messages} userLabel="You" />
          {isThinking ? <ThinkingBubble /> : null}
          <div ref={transcriptEndRef} className="h-1" />
        </ScrollArea>
      )}

      {isEnded ? (
        <div className="shrink-0 border-t border-border/50 bg-card px-5 py-4 md:px-6">
          {onContinueToVoice ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">One last step</p>
                  <p className="text-xs text-muted-foreground">
                    A quick ~5 minute voice check to round out your evaluation.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={onContinueToVoice}>
                <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-4" />
                {voiceCtaLabel ?? "Start voice assessment"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CompletedInterviewBar
                title={isExpired ? "Interview expired" : "Interview complete"}
                description={
                  isExpired
                    ? "This interview window has closed."
                    : "Your results are included in the report."
                }
              />
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/applications">Back to applications</Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="shrink-0 bg-card px-4 pb-4 pt-3 md:px-6 md:pb-5">
          <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 shadow-sm ring-1 ring-transparent transition-[border-color,box-shadow] focus-within:border-primary/40 focus-within:shadow-md focus-within:ring-primary/20">
            <Textarea
              ref={composerRef}
              value={content}
              onChange={onComposerChange}
              onKeyDown={onComposerKeyDown}
              placeholder={canSend ? "Write your answer..." : "Start the interview to answer"}
              disabled={!canSend || isThinking}
              className="field-sizing-content max-h-44 min-h-10 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-2 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0"
              rows={1}
            />
            <Button
              type="button"
              size="icon"
              className="mb-0.5 size-9 shrink-0 rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] disabled:scale-100 disabled:bg-muted disabled:text-muted-foreground"
              onMouseDown={onSendMouseDown}
              onClick={onSubmit}
              disabled={!canSend || isStreaming || isThinking || content.trim().length === 0}
            >
              {isStreaming || isThinking ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2.2}
                  className="size-4 animate-spin"
                />
              ) : (
                <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2.2} className="size-4" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start px-5 pb-2 md:px-7" aria-live="polite">
      <div className="max-w-[86%] md:max-w-[66%]">
        <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/90">
          Zero
        </p>
        <div className="flex items-center justify-center rounded-2xl border border-border/70 bg-background/95 px-4 py-3 text-sm leading-6 text-muted-foreground shadow-sm ring-1 ring-border/35">
          <span className="sr-only">Awaiting response</span>
          <span className="inline-flex items-end gap-1" aria-hidden="true">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function EmptyInterviewComponent({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-card shadow-sm">
          <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-5 text-primary" />
        </div>
        <p className="text-sm leading-relaxed">{title}.</p>
        <p className="text-xs text-muted-foreground/80">{description}</p>
      </div>
    </div>
  );
}
