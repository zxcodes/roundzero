import { BubbleChatIcon, SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
  onSend: (content: string) => void;
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

    onSend(trimmed);
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/20">
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
                  <div className="max-w-[88%] md:max-w-[68%]">
                    <p className="mb-1 px-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {isCandidate ? "You" : "Zero"}
                    </p>
                    <div
                      className={
                        isCandidate
                          ? "rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm"
                          : "rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground shadow-sm"
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
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 p-10 text-center text-muted-foreground">
            <div className="flex size-12 items-center justify-center rounded-2xl border bg-muted">
              <HugeiconsIcon
                icon={BubbleChatIcon}
                strokeWidth={2}
                className="size-5 text-primary"
              />
            </div>
            <p className="text-sm">Your interview with Zero starts here.</p>
          </div>
        )}
      </ScrollArea>

      {isEnded ? (
        <div className="shrink-0 border-t border-border/50 bg-card px-5 py-4 text-sm text-muted-foreground md:px-6">
          This interview has ended.
        </div>
      ) : (
        <div className="shrink-0 bg-card px-4 pb-4 pt-3 md:px-6 md:pb-5">
          <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-background p-2.5 shadow-sm">
            <Textarea
              ref={composerRef}
              value={content}
              onChange={onComposerChange}
              onKeyDown={onComposerKeyDown}
              placeholder={canSend ? "Write your answer..." : "Start the interview to answer"}
              disabled={!canSend}
              className="min-h-10 flex-1 resize-none border-0 bg-transparent p-2 text-foreground placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0"
              rows={1}
            />
            <Button
              type="button"
              size="icon"
              className="shrink-0 rounded-xl"
              onMouseDown={onSendMouseDown}
              onClick={onSubmit}
              disabled={!canSend || isStreaming || content.trim().length === 0}
            >
              <HugeiconsIcon icon={SentIcon} strokeWidth={2} className="size-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
