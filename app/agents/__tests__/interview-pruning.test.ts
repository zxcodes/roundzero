import type { ModelMessage } from "@ai-sdk/provider-utils";
import { describe, expect, it } from "vitest";
import { buildInterviewPromptMessages } from "../interview-pruning";

describe("buildInterviewPromptMessages", () => {
  it("does not produce orphaned tool calls/results after pruning", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [{ type: "text", text: "Let's proceed." }],
      },
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "tc-1",
            toolName: "record_screening_coverage",
            input: "{}",
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "tc-1",
            toolName: "record_screening_coverage",
            output: { type: "json", value: { ok: true } },
          },
        ],
      },
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "tc-2",
            toolName: "check_resume_gap",
            input: "{}",
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "tc-2",
            toolName: "check_resume_gap",
            output: { type: "json", value: { matched: true } },
          },
        ],
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "Next question?" }],
      },
    ];

    const out = buildInterviewPromptMessages(messages);

    const callIds = new Set<string>();
    const resultIds = new Set<string>();

    for (const message of out) {
      if (typeof message.content === "string") continue;
      for (const part of message.content) {
        if (part.type === "tool-call") callIds.add(part.toolCallId);
        if (part.type === "tool-result") resultIds.add(part.toolCallId);
      }
    }

    for (const id of callIds) {
      expect(resultIds.has(id)).toBe(true);
    }
    for (const id of resultIds) {
      expect(callIds.has(id)).toBe(true);
    }
  });
});
