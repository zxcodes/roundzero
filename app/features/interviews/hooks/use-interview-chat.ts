import type { UIMessage } from "@tanstack/ai";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import type { getMyInterviewMessages } from "@/features/interviews/server/functions";
import type { MessageIntegritySnapshot } from "@/features/interviews/shared/integrity";

const readMessageText = (message: UIMessage) => {
  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .map((part) => {
      if (typeof part.type === "string" && part.type.startsWith("tool-")) {
        return "";
      }
      if (part.type === "text" && typeof part.content === "string") {
        return part.content;
      }
      return "";
    })
    .join("\n")
    .trim();
};

type InitialInterviewMessages = NonNullable<
  Awaited<ReturnType<typeof getMyInterviewMessages>>
>["messages"];

export function useInterviewChat(interviewId: string, initialMessages: InitialInterviewMessages) {
  const [forwardedProps, setForwardedProps] = useState<{
    interviewId: string;
    messageIntegrity?: MessageIntegritySnapshot;
  }>({ interviewId });

  const chat = useChat({
    connection: fetchServerSentEvents("/api/interview-chat"),
    forwardedProps,
    initialMessages: initialMessages.map(
      (message): UIMessage => ({
        id: message.id,
        role: message.role === "assistant" ? "assistant" : "user",
        parts: [{ type: "text", content: message.content }],
      }),
    ),
  });

  const messages: Array<{ id: string; role: "assistant" | "candidate"; content: string }> = [];

  for (const message of chat.messages) {
    if (message.role !== "assistant" && message.role !== "user") {
      continue;
    }

    const content = readMessageText(message);
    if (content.length === 0) {
      continue;
    }

    const role = message.role === "assistant" ? ("assistant" as const) : ("candidate" as const);

    messages.push({
      id: message.id,
      role,
      content,
    });
  }

  // The thinking indicator must stay visible from the moment we send a
  // message until the assistant's *current turn* starts emitting visible
  // text. We can't rely on `chat.status` alone: in agent loops with
  // server-side tools, TanStack flips `status` back to 'ready' after each
  // RUN_FINISHED — including the tool-call iteration that precedes the
  // text response — so `status === 'ready'` does NOT mean the turn is
  // done. The only signal that covers the whole turn (submit → tool
  // calls → tool execution → text stream → finish) is `chat.isLoading`,
  // which the client only clears in the `finally` of `streamResponse`.
  const lastMessage = chat.messages[chat.messages.length - 1];
  const currentTurnHasAssistantText =
    lastMessage?.role === "assistant" && readMessageText(lastMessage).length > 0;
  const isThinking = chat.isLoading && !currentTurnHasAssistantText;

  const sendMessage = async (content: string, integrity: MessageIntegritySnapshot) => {
    flushSync(() => {
      setForwardedProps({ interviewId, messageIntegrity: integrity });
    });
    try {
      await chat.sendMessage(content);
    } finally {
      setForwardedProps({ interviewId });
    }
  };

  return {
    messages,
    sendMessage,
    status: chat.status,
    isStreaming: chat.isLoading,
    isThinking,
  };
}
