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

  // Per @tanstack/ai chat-experience skill, `status` is the source of truth
  // for the model lifecycle: 'ready' → 'submitted' → 'streaming' → 'ready'.
  // The thinking indicator is visible while we are waiting for the first
  // text chunk (covers "submitted" plus the "streaming during tool calls"
  // gap where the assistant message exists but has no visible text yet).
  const lastAssistantMessage = [...chat.messages].reverse().find((m) => m.role === "assistant");
  const lastAssistantHasText = lastAssistantMessage
    ? readMessageText(lastAssistantMessage).length > 0
    : false;
  const isThinking =
    chat.status === "submitted" || (chat.status === "streaming" && !lastAssistantHasText);

  return {
    messages,
    sendMessage: chat.sendMessage,
    status: chat.status,
    isStreaming: chat.status === "streaming",
    isThinking,
  };
}
