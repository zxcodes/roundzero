import type { UIMessage } from "@tanstack/ai";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import type { getMyInterviewMessages } from "@/features/interviews/server/functions";

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
  const chat = useChat({
    connection: fetchServerSentEvents("/api/interview-chat"),
    forwardedProps: { interviewId },
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

  return {
    messages,
    sendMessage: chat.sendMessage,
    status: chat.status,
    isStreaming: chat.status === "streaming",
    sessionStatus: null,
  };
}
