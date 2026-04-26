import { BubbleChatIcon, SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type InterviewChatProps = {
  messages: Array<{
    id: string;
    role: "assistant" | "candidate";
    content: string;
  }>;
  canSend: boolean;
  isStreaming: boolean;
  onSend: (content: string) => void;
};

export function InterviewChat({ messages, canSend, isStreaming, onSend }: InterviewChatProps) {
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
    <div className="flex h-full min-h-0 flex-col rounded-b-2xl bg-background">
      <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto">
        {messages.length > 0 ? (
          <div className="space-y-5 px-4 py-5 md:px-6">
            {messages.map((message) => {
              const isCandidate = message.role === "candidate";

              return (
                <div
                  key={message.id}
                  className={isCandidate ? "flex justify-end" : "flex justify-start"}
                >
                  <div className="max-w-[88%] md:max-w-[72%]">
                    <p className="mb-1 px-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {isCandidate ? "You" : "Zero"}
                    </p>
                    <div
                      className={
                        isCandidate
                          ? "rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground"
                          : "rounded-2xl border bg-muted px-4 py-3 text-sm text-foreground"
                      }
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={transcriptEndRef} />
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
      </div>

      <div className="shrink-0 border-t bg-background px-3 py-3 md:px-4">
        <div className="flex items-end gap-2 rounded-xl border bg-background p-2">
          <Textarea
            ref={composerRef}
            value={content}
            onChange={onComposerChange}
            onKeyDown={onComposerKeyDown}
            placeholder={canSend ? "Write your answer..." : "Interview is not active"}
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
    </div>
  );
}
