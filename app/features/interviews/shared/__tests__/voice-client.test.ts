import { describe, expect, it } from "vitest";

import { waitForCandidateUtteranceCommit } from "@/features/interviews/shared/voice-client";

describe("waitForCandidateUtteranceCommit", () => {
  it("waits for the interim text to clear and a new candidate message to commit", async () => {
    let now = 0;
    let interimTranscript: string | null = "I led the";
    let candidateMessageCount = 2;

    const result = await waitForCandidateUtteranceCommit({
      initialCandidateMessageCount: 2,
      readSnapshot: () => ({ interimTranscript, candidateMessageCount }),
      timeoutMs: 6_000,
      pollIntervalMs: 50,
      now: () => now,
      sleep: async (milliseconds) => {
        now += milliseconds;
        if (now >= 100) {
          interimTranscript = null;
          candidateMessageCount = 3;
        }
      },
    });

    expect(result).toBe("committed");
  });

  it("times out without treating an uncommitted interim utterance as safe to discard", async () => {
    let now = 0;

    const result = await waitForCandidateUtteranceCommit({
      initialCandidateMessageCount: 2,
      readSnapshot: () => ({ interimTranscript: "I was still speaking", candidateMessageCount: 2 }),
      timeoutMs: 200,
      pollIntervalMs: 50,
      now: () => now,
      sleep: async (milliseconds) => {
        now += milliseconds;
      },
    });

    expect(result).toBe("timeout");
  });
});
