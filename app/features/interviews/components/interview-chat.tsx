import { ArrowUp01Icon, BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

type InterviewChatProps = {
  messages: Array<{
    id: string;
    role: "assistant" | "candidate";
    content: string;
  }>;
  canSend: boolean;
  isEnded: boolean;
  isStreaming: boolean;
  onSend: (content: string) => Promise<void>;
};

export function InterviewChat({
  messages,
  canSend,
  isEnded,
  isStreaming,
  onSend,
}: InterviewChatProps) {
  const [content, setContent] = useState("");
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const wasStreamingRef = useRef(false);
  const lastMessageContent = messages[messages.length - 1]?.content ?? "";

  const scrollChatToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollChatToBottom();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [messages.length, lastMessageContent]);

  useEffect(() => {
    if (!isStreaming) {
      return;
    }

    let frame = 0;
    const syncWhileStreaming = () => {
      scrollChatToBottom();
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
    if (!trimmed || !canSend || isStreaming) {
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
      <ScrollArea ref={transcriptRef} className="min-h-0 flex-1">
        {messages.length > 0 ? (
          <div className="space-y-7 px-5 py-6 md:px-7 md:py-7">
            {messages.map((message) => {
              const isCandidate = message.role === "candidate";

              return (
                <div
                  key={message.id}
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
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={transcriptEndRef} className="h-1" />
          </div>
        ) : (
          <div className="flex h-full min-h-72 items-center justify-center px-6 py-10">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center text-muted-foreground">
              <div className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-card shadow-sm">
                <HugeiconsIcon
                  icon={BubbleChatIcon}
                  strokeWidth={2}
                  className="size-5 text-primary"
                />
              </div>
              <p className="text-sm leading-relaxed">Your interview with Zero starts here.</p>
              <p className="text-xs text-muted-foreground/80">
                {canSend ? "Say hi to begin." : "Press Start when you are ready."}
              </p>
            </div>
          </div>
        )}
      </ScrollArea>

      {isEnded ? (
        <div className="shrink-0 border-t border-border/50 bg-card px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">This interview has ended.</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/applications">Back to applications</Link>
            </Button>
          </div>
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
              disabled={!canSend}
              className="field-sizing-content max-h-44 min-h-10 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-2 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0"
              rows={1}
            />
            <Button
              type="button"
              size="icon"
              className="mb-0.5 size-9 shrink-0 rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] disabled:scale-100 disabled:bg-muted disabled:text-muted-foreground"
              onMouseDown={onSendMouseDown}
              onClick={onSubmit}
              disabled={!canSend || isStreaming || content.trim().length === 0}
            >
              <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2.2} className="size-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
