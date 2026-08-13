import { describe, expect, it } from "vitest";

import {
  buildVoiceDisplayMessages,
  waitForCandidateUtteranceCommit,
} from "@/features/interviews/shared/voice-client";

describe("buildVoiceDisplayMessages", () => {
  it("renders Cloudflare's latest streamed assistant snapshot instead of accumulating prefixes", () => {
    const firstSnapshot = buildVoiceDisplayMessages(
      [],
      [{ role: "assistant", text: "Hey", timestamp: 1 }],
    );
    const nextSnapshot = buildVoiceDisplayMessages(
      [],
      [{ role: "assistant", text: "Hey Amina, thanks for hopping on!", timestamp: 1 }],
    );

    expect(firstSnapshot).toEqual([{ role: "assistant", text: "Hey" }]);
    expect(nextSnapshot).toEqual([
      { role: "assistant", text: "Hey Amina, thanks for hopping on!" },
    ]);
  });

  it("adds live Cloudflare transcript entries after recovered history without duplicating it", () => {
    const messages = buildVoiceDisplayMessages(
      [{ role: "assistant", text: "Welcome back." }],
      [
        { role: "assistant", text: "Welcome back.", timestamp: 1 },
        { role: "user", text: "Thanks, I'm ready.", timestamp: 2 },
      ],
    );

    expect(messages).toEqual([
      { role: "assistant", text: "Welcome back." },
      { role: "user", text: "Thanks, I'm ready." },
    ]);
  });

  it("preserves repeated messages outside the recovered/live overlap", () => {
    const messages = buildVoiceDisplayMessages(
      [
        { role: "assistant", text: "Was that clear?" },
        { role: "user", text: "Yes." },
        { role: "assistant", text: "Would you do it again?" },
      ],
      [
        { role: "assistant", text: "Would you do it again?", timestamp: 1 },
        { role: "user", text: "Yes.", timestamp: 2 },
      ],
    );

    expect(messages).toEqual([
      { role: "assistant", text: "Was that clear?" },
      { role: "user", text: "Yes." },
      { role: "assistant", text: "Would you do it again?" },
      { role: "user", text: "Yes." },
    ]);
  });

  it("preserves identical consecutive entries in Cloudflare's ordered snapshot", () => {
    const messages = buildVoiceDisplayMessages(
      [],
      [
        { role: "user", text: "Yes.", timestamp: 1 },
        { role: "user", text: "Yes.", timestamp: 2 },
      ],
    );

    expect(messages).toEqual([
      { role: "user", text: "Yes." },
      { role: "user", text: "Yes." },
    ]);
  });
});

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
