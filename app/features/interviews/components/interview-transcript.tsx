import { BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type InterviewTranscriptMessage = {
  id?: string;
  role: "assistant" | "candidate";
  content: string;
};

type InterviewTranscriptProps = {
  messages: InterviewTranscriptMessage[];
  userLabel?: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function InterviewTranscript({
  messages,
  userLabel = "You",
  emptyTitle,
  emptyDescription,
}: InterviewTranscriptProps) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full min-h-72 items-center justify-center px-6 py-10">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center text-muted-foreground">
          <div className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-card shadow-sm">
            <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-5 text-primary" />
          </div>
          <p className="text-sm leading-relaxed">{emptyTitle}</p>
          <p className="text-xs text-muted-foreground/80">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 px-5 py-6 md:px-7 md:py-7">
      {messages.map((message, index) => {
        const isCandidate = message.role === "candidate";

        return (
          <div
            key={message.id ?? `${message.role}-${index}-${message.content.slice(0, 16)}`}
            className={isCandidate ? "flex justify-end" : "flex justify-start"}
          >
            <div className="max-w-[86%] md:max-w-[66%]">
              <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/90">
                {isCandidate ? userLabel : "Zero"}
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
    </div>
  );
}
