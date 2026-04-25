import { BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type InterviewAgentMessage = {
  role: "assistant" | "candidate";
  content: string;
  createdAt: string;
};

type InterviewTranscriptProps = {
  messages: InterviewAgentMessage[];
  className?: string;
};

export function InterviewTranscript({ messages, className }: InterviewTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages.length]);

  return (
    <ScrollArea
      ref={scrollRef}
      className={cn("rounded-xl border border-zinc-800 bg-black", className)}
    >
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-900">
            <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-5 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-400">Your conversation will appear here</p>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          {messages.map((message, index) => {
            const isCandidate = message.role === "candidate";

            return (
              <div
                key={`${message.role}-${index}`}
                className={`flex flex-col ${isCandidate ? "items-end" : "items-start"}`}
              >
                <span className="mb-1 px-1 text-[11px] font-medium text-zinc-400">
                  {isCandidate ? "You" : "Zero"}
                </span>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isCandidate ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-100"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
}
