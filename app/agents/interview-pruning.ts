import type { ModelMessage } from "@ai-sdk/provider-utils";
import { pruneMessages } from "ai";

export function buildInterviewPromptMessages(messages: ModelMessage[]): ModelMessage[] {
  return pruneMessages({
    messages,
    reasoning: "before-last-message",
    toolCalls: [
      { type: "before-last-2-messages" },
      {
        type: "before-last-20-messages",
        tools: ["check_resume_gap", "end_interview", "invalid"],
      },
    ],
  });
}
