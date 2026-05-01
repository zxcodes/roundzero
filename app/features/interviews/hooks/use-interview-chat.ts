import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAgent } from "agents/react";
import type { UIMessage } from "ai";
import { clientEnv } from "@/shared/env.client";

type InterviewAgentClient = {
  get state(): unknown;
  kickoff: () => Promise<{ greeted: boolean }>;
};

type InterviewSessionStatus = "pending" | "in_progress" | "completed" | "cancelled" | "expired";

const interviewSessionStatuses: InterviewSessionStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
];

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

export function useInterviewChat(interviewId: string, agentToken: string) {
  // useAgent connects via WebSocket to the InterviewAgent Durable Object
  // identified by the interview UUID. AIChatAgent persists messages in its
  // own SQLite, so do NOT pass `getInitialMessages: null` — the default
  // behaviour fetches the persisted history on connect, which is exactly
  // how refresh-resume is supposed to work.
  const agent = useAgent<InterviewAgentClient, unknown>({
    agent: "InterviewAgent",
    name: interviewId,
    host: clientEnv.VITE_EDGE_WORKER_URL,
    query: {
      token: agentToken,
    },
    onIdentityChange: () => {
      // Expected in dev during HMR/reconnect churn; identity is derived by server-side routing.
    },
  });

  const chat = useAgentChat({
    agent,
  });

  const rawAgentState = agent.state as { status?: unknown } | undefined;
  const sessionStatus =
    typeof rawAgentState?.status === "string" &&
    interviewSessionStatuses.includes(rawAgentState.status as InterviewSessionStatus)
      ? (rawAgentState.status as InterviewSessionStatus)
      : null;

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

  const kickoff = async () => {
    return await agent.stub.kickoff();
  };

  return {
    messages,
    sendMessage: chat.sendMessage,
    status: chat.status,
    isStreaming: chat.isStreaming,
    kickoff,
    sessionStatus,
  };
}
