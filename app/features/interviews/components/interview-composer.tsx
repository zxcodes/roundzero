import { SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type InterviewComposerProps = {
  onSend: (content: string) => void;
  isSending: boolean;
  disabled?: boolean;
};

export function InterviewComposer({ onSend, isSending, disabled }: InterviewComposerProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = content.trim();
  const canSend = trimmed.length > 0 && !isSending && !disabled;

  const onSubmit = () => {
    if (!canSend) {
      return;
    }
    onSend(trimmed);
    setContent("");
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  useEffect(() => {
    if (disabled) {
      return;
    }

    textareaRef.current?.focus();
  }, [disabled]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const onContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  return (
    <div className="flex shrink-0 items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-2">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={onContentChange}
        onKeyDown={onKeyDown}
        placeholder={disabled ? "Interview is not active" : "Type your answer…"}
        disabled={disabled}
        className="min-h-10 flex-1 resize-none border-0 bg-transparent p-2 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:border-transparent"
        rows={1}
      />
      <Button size="icon" onClick={onSubmit} disabled={!canSend} className="shrink-0 rounded-xl">
        <HugeiconsIcon icon={SentIcon} strokeWidth={2} className="size-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  );
}
