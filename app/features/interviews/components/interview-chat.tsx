import { BubbleChatIcon, SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

type InterviewChatProps = {
  messages: Array<{
    role: "assistant" | "candidate";
    content: string;
  }>;
  canSend: boolean;
  isStreaming: boolean;
  onSend: (content: string) => void;
};

export function InterviewChat({ messages, canSend, isStreaming, onSend }: InterviewChatProps) {
  const [content, setContent] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const viewport = transcriptRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [messages.length]);

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

  return (
    <div className="grid h-full min-h-0 grid-rows-[1fr_auto] overflow-hidden rounded-2xl border bg-card">
      <ScrollArea ref={transcriptRef} className="h-full">
        {messages.length > 0 ? (
          <div className="space-y-5 p-4 md:p-6">
            {messages.map((message, index) => {
              const isCandidate = message.role === "candidate";

              return (
                <div
                  key={`${message.role}-${index}`}
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
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center text-muted-foreground">
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

      <div className="border-t bg-background p-3 md:p-4">
        <div className="flex items-end gap-2 rounded-xl border bg-background p-2">
          <Textarea
            ref={composerRef}
            value={content}
            onChange={onComposerChange}
            onKeyDown={onComposerKeyDown}
            placeholder={canSend ? "Write your answer..." : "Interview is not active"}
            disabled={!canSend || isStreaming}
            className="min-h-10 flex-1 resize-none border-0 bg-transparent p-2 text-foreground placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0"
            rows={1}
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0 rounded-xl"
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
