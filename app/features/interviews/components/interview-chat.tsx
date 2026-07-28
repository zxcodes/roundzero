import {
  Alert02Icon,
  ArrowUp01Icon,
  BubbleChatIcon,
  Loading03Icon,
  Mic01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  CompletedInterviewBar,
  type InterviewEndVariant,
  interviewEndVisuals,
} from "@/features/interviews/components/interview-end-visuals";
import {
  InterviewThinkingBubble,
  InterviewTranscript,
} from "@/features/interviews/components/interview-transcript";
import {
  appendCopySource,
  emptyComposeIntegritySnapshot,
  type MessageIntegritySnapshot,
} from "@/features/interviews/shared/integrity";
import { cn } from "@/lib/utils";

type InterviewChatProps = {
  messages: Array<{
    id: string;
    role: "assistant" | "candidate";
    content: string;
  }>;
  canSend: boolean;
  isEnded: boolean;
  isCancelled: boolean;
  isExpired: boolean;
  isStreaming: boolean;
  hasError: boolean;
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
  onSend: (content: string, integrity: MessageIntegritySnapshot) => Promise<void>;
  onRetry: () => Promise<void>;
};

export function InterviewChat({
  messages,
  canSend,
  isEnded,
  isCancelled,
  isExpired,
  isStreaming,
  hasError,
  isThinking,
  onContinueToVoice,
  voiceCtaLabel,
  onSend,
  onRetry,
}: InterviewChatProps) {
  const [content, setContent] = useState("");
  const composeIntegrityRef = useRef<MessageIntegritySnapshot>(emptyComposeIntegritySnapshot());
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

  const onSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || !canSend || isStreaming || isThinking || hasError) {
      return;
    }

    const integrity: MessageIntegritySnapshot = {
      ...composeIntegrityRef.current,
      submittedCharCount: trimmed.length,
    };
    const integrityBackup: MessageIntegritySnapshot = {
      ...integrity,
      copiedFrom: integrity.copiedFrom.map((entry) => ({ ...entry })),
    };

    composeIntegrityRef.current = emptyComposeIntegritySnapshot();
    setContent("");

    try {
      await onSend(trimmed, integrity);
      requestAnimationFrame(() => {
        composerRef.current?.focus();
      });
    } catch {
      composeIntegrityRef.current = integrityBackup;
      setContent(trimmed);
    }
  };

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void onSubmit();
  };

  const onComposerChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
  };

  const onComposerPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = event.clipboardData.getData("text");
    composeIntegrityRef.current = {
      ...composeIntegrityRef.current,
      pasteCount: composeIntegrityRef.current.pasteCount + 1,
      pasteCharCount: composeIntegrityRef.current.pasteCharCount + pasted.length,
    };
  };

  const onCopyFromMessage = (messageId: string, charCount: number) => {
    composeIntegrityRef.current = appendCopySource(
      composeIntegrityRef.current,
      messageId,
      charCount,
    );
  };

  const onSendMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const endedVariant: InterviewEndVariant = isCancelled
    ? "cancelled"
    : isExpired
      ? "expired"
      : "completed";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30">
      {!messages.length && !isThinking ? (
        isCancelled ? (
          <EmptyInterviewComponent
            description="This interview was cancelled."
            title="Interview cancelled"
            variant="cancelled"
          />
        ) : isExpired ? (
          <EmptyInterviewComponent
            description="This interview window has closed."
            title="Interview expired"
            variant="expired"
          />
        ) : (
          <EmptyInterviewComponent
            description="Press start when you are ready."
            title="Your interview with Zero starts here"
          />
        )
      ) : (
        <ScrollArea ref={transcriptRef} className="min-h-0 flex-1">
          <InterviewTranscript
            messages={messages}
            userLabel="You"
            onCopyFromMessage={onCopyFromMessage}
          />
          {isThinking ? (
            <div className="px-5 pb-2 md:px-7">
              <InterviewThinkingBubble />
            </div>
          ) : null}
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
                variant={endedVariant}
                title={
                  isCancelled
                    ? "Interview cancelled"
                    : isExpired
                      ? "Interview expired"
                      : "Interview complete"
                }
                description={
                  isCancelled
                    ? "This interview was cancelled. No report will be generated."
                    : isExpired
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
          {hasError ? (
            <Alert variant="destructive" className="mb-3">
              <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
              <AlertTitle>Zero couldn&apos;t respond</AlertTitle>
              <AlertDescription>
                Your answer is saved. Retry to continue the interview.
              </AlertDescription>
              <AlertAction>
                <Button variant="outline" size="sm" onClick={onRetry} disabled={isStreaming}>
                  {isStreaming ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      strokeWidth={2}
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-4" />
                  )}
                  {isStreaming ? "Retrying" : "Retry"}
                </Button>
              </AlertAction>
            </Alert>
          ) : null}
          <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2 transition-colors focus-within:border-primary/40">
            <Textarea
              ref={composerRef}
              value={content}
              onChange={onComposerChange}
              onPaste={onComposerPaste}
              onKeyDown={onComposerKeyDown}
              placeholder={
                hasError
                  ? "Retry the previous answer to continue"
                  : canSend
                    ? "Write your answer..."
                    : "Start the interview to answer"
              }
              disabled={!canSend || isThinking || hasError}
              className="field-sizing-content max-h-44 min-h-10 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-2 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0"
              rows={1}
            />
            <Button
              type="button"
              size="icon"
              className="mb-0.5 size-9 shrink-0 rounded-full bg-primary text-primary-foreground transition-transform hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] disabled:scale-100 disabled:bg-muted disabled:text-muted-foreground"
              onMouseDown={onSendMouseDown}
              onClick={onSubmit}
              disabled={
                !canSend || isStreaming || isThinking || hasError || content.trim().length === 0
              }
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

export function EmptyInterviewComponent({
  title,
  description,
  variant = "ready",
}: {
  title: string;
  description: string;
  variant?: InterviewEndVariant | "ready";
}) {
  const visual =
    variant === "ready"
      ? { icon: BubbleChatIcon, bg: "bg-card", tone: "text-primary" }
      : interviewEndVisuals[variant];

  return (
    <div className="flex h-full items-center justify-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center text-muted-foreground">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-full border border-border/60 bg-muted/30",
            visual.bg,
          )}
        >
          <HugeiconsIcon icon={visual.icon} strokeWidth={2} className={cn("size-5", visual.tone)} />
        </div>
        <p className="text-sm leading-relaxed">{title}.</p>
        <p className="text-xs text-muted-foreground/80">{description}</p>
      </div>
    </div>
  );
}
