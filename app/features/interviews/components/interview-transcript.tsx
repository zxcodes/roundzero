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

function TranscriptBubble({ message, userLabel, onCopyFromMessage }: TranscriptBubbleProps) {
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
        <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/90">
          {isCandidate ? userLabel : "Zero"}
        </p>
        <div
          onCopy={message.id ? onBubbleCopy : undefined}
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
