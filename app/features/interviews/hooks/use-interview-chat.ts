import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAgent } from "agents/react";
import type { UIMessage } from "ai";

const getEdgeHost = () => {
  if (typeof window === "undefined") {
    const value = process.env.VITE_EDGE_WORKER_URL ?? process.env.EDGE_WORKER_URL;
    return value && value.length > 0 ? value : "http://localhost:8787";
  }

  const value = import.meta.env.VITE_EDGE_WORKER_URL;
  return value && value.length > 0 ? value : "http://localhost:8787";
};

const readMessageText = (message: UIMessage) => {
  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .map((part) => {
      // Hide every tool-* part (tool-call, tool-input-streaming, tool-output, etc.)
      // so the candidate never sees raw tool JSON in the chat surface.
      if (typeof part.type === "string" && part.type.startsWith("tool-")) {
        return "";
      }
      if (part.type === "text" && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("\n")
    .trim();
};

type InterviewAgentRpc = {
  kickoff: () => Promise<{ greeted: boolean }>;
};

export function useInterviewChat(interviewId: string) {
  // useAgent connects via WebSocket to the InterviewAgent Durable Object
  // identified by the interview UUID. AIChatAgent persists messages in its
  // own SQLite, so do NOT pass `getInitialMessages: null` — the default
  // behaviour fetches the persisted history on connect, which is exactly
  // how refresh-resume is supposed to work.
  const agent = useAgent({
    agent: "InterviewAgent",
    name: interviewId,
    host: getEdgeHost(),
    onIdentityChange: () => {
      // Expected in dev during HMR/reconnect churn; identity is derived by server-side routing.
    },
  });

  const chat = useAgentChat({
    agent,
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
    const previous = messages[messages.length - 1];
    if (role === "assistant" && previous?.role === "assistant") {
      if (previous.content.trim() === content.trim()) {
        continue;
      }
    }

    messages.push({
      id: message.id,
      role,
      content,
    });
  }

  const kickoff = async () => {
    const rpc = agent.stub as unknown as InterviewAgentRpc;
    return await rpc.kickoff();
  };

  return {
    messages,
    sendMessage: chat.sendMessage,
    status: chat.status,
    isStreaming: chat.isStreaming,
    kickoff,
  };
}
