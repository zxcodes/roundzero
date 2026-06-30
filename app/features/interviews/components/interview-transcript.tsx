type InterviewTranscriptMessage = {
  id?: string;
  role: "assistant" | "candidate";
  content: string;
};

type InterviewTranscriptProps = {
  messages: InterviewTranscriptMessage[];
  userLabel?: string;
  onCopyFromMessage?: (messageId: string, charCount: number) => void;
};

type TranscriptBubbleProps = {
  message: InterviewTranscriptMessage;
  userLabel: string;
  onCopyFromMessage?: (messageId: string, charCount: number) => void;
};

export function TranscriptBubble({ message, userLabel, onCopyFromMessage }: TranscriptBubbleProps) {
  const isCandidate = message.role === "candidate";

  const onBubbleCopy = () => {
    if (!message.id || !onCopyFromMessage) {
      return;
    }

    const selection = window.getSelection();
    const charCount = selection?.toString().length ?? 0;
    if (charCount === 0) {
      return;
    }

    onCopyFromMessage(message.id, charCount);
  };

  return (
    <div className={isCandidate ? "flex justify-end" : "flex justify-start"}>
      <div className="max-w-[86%] md:max-w-[66%]">
        <p className="mb-1 px-1 text-xs text-muted-foreground">
          {isCandidate ? userLabel : "Zero"}
        </p>
        <div
          onCopy={message.id ? onBubbleCopy : undefined}
          className={
            isCandidate
              ? "whitespace-pre-wrap wrap-break-word rounded-2xl border border-primary/35 bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground"
              : "whitespace-pre-wrap wrap-break-word rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm leading-6 text-foreground"
          }
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

export function InterviewThinkingBubble({ label = "Zero" }: { label?: string }) {
  return (
    <div className="flex justify-start" aria-live="polite">
      <div className="max-w-[86%] md:max-w-[66%]">
        <p className="mb-1 px-1 text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
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

export function InterviewInterimBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[86%] md:max-w-[66%]">
        <p className="mb-1 px-1 text-xs text-muted-foreground">You</p>
        <div className="whitespace-pre-wrap wrap-break-word rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm italic leading-6 text-primary/80">
          {content}
        </div>
      </div>
    </div>
  );
}

export function InterviewTranscript({
  messages,
  userLabel = "You",
  onCopyFromMessage,
}: InterviewTranscriptProps) {
  return (
    <div className="space-y-7 px-5 py-6 md:px-7 md:py-7">
      {messages.map((message, index) => (
        <TranscriptBubble
          key={message.id ?? `${message.role}-${index}-${message.content.slice(0, 16)}`}
          message={message}
          userLabel={userLabel}
          onCopyFromMessage={onCopyFromMessage}
        />
      ))}
    </div>
  );
}
