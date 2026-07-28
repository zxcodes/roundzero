import type { UIMessage } from "@tanstack/ai";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { useMemo, useRef } from "react";

import type { getMyInterview } from "@/features/interviews/server/functions";
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

type InitialInterviewMessages = NonNullable<Awaited<ReturnType<typeof getMyInterview>>>["messages"];

export function useInterviewChat(interviewId: string, initialMessages: InitialInterviewMessages) {
  const pendingIntegrityRef = useRef<MessageIntegritySnapshot | null>(null);

  const connection = useMemo(() => {
    const base = fetchServerSentEvents("/api/interview-chat");
    return {
      connect: async function* (
        messages: Parameters<typeof base.connect>[0],
        data: Parameters<typeof base.connect>[1],
        abortSignal: Parameters<typeof base.connect>[2],
        runContext: Parameters<typeof base.connect>[3],
      ) {
        const messageIntegrity = pendingIntegrityRef.current;
        const mergedData = messageIntegrity === null ? data : { ...data, messageIntegrity };
        yield* base.connect(messages, mergedData, abortSignal, runContext);
      },
    };
  }, []);

  const chat = useChat({
    connection,
    threadId: interviewId,
    forwardedProps: { interviewId },
    queue: "drop",
    initialMessages: initialMessages.map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      parts: [{ type: "text", content: message.content }],
    })),
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
    pendingIntegrityRef.current = integrity;
    try {
      await chat.sendMessage(content);
    } finally {
      pendingIntegrityRef.current = null;
    }
  };

  const retryMessage = async () => {
    await chat.reload();
  };

  return {
    error: chat.error,
    messages,
    retryMessage,
    sendMessage,
    status: chat.status,
    isStreaming: chat.isLoading,
    isThinking,
  };
}
