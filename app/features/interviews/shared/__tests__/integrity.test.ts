import { describe, expect, it } from "vitest";

import {
  appendCopySource,
  applyIntegrityScoreAdjustment,
  assessIntegrityRisk,
  clampMessageIntegritySnapshot,
  mergeInterviewIntegrity,
  messageIntegritySnapshotSchema,
} from "@/features/interviews/shared/integrity";

describe("interview integrity", () => {
  it("merges per-message integrity into interview metadata", () => {
    const merged = mergeInterviewIntegrity(undefined, "11111111-1111-4111-8111-111111111111", {
      copiedFrom: [],
      pasteCount: 1,
      pasteCharCount: 120,
      submittedCharCount: 150,
    });

    expect(merged.pasteCount).toBe(1);
    expect(merged.messages).toHaveLength(1);
    expect(merged.messages[0]?.messageId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("accumulates copy sources by transcript message id", () => {
    const sourceId = "22222222-2222-4222-8222-222222222222";
    const first = appendCopySource(
      { copiedFrom: [], pasteCount: 0, pasteCharCount: 0, submittedCharCount: 0 },
      sourceId,
      40,
    );
    const second = appendCopySource(first, sourceId, 25);

    expect(second.copiedFrom).toEqual([{ messageId: sourceId, charCount: 65 }]);
  });

  it("accepts client-generated (non-uuid) copy-source ids from live bubbles", () => {
    const parsed = messageIntegritySnapshotSchema.safeParse({
      copiedFrom: [{ messageId: "msg-1719000000000-abc3", charCount: 80 }],
      pasteCount: 1,
      pasteCharCount: 80,
      submittedCharCount: 120,
    });

    expect(parsed.success).toBe(true);
  });

  it("flags high risk when paste volume is large", () => {
    const risk = assessIntegrityRisk({
      pasteCount: 3,
      pasteCharCount: 400,
      messages: [
        {
          messageId: "11111111-1111-4111-8111-111111111111",
          copiedFrom: [],
          pasteCount: 3,
          pasteCharCount: 400,
          submittedCharCount: 500,
        },
      ],
    });

    expect(risk.level).toBe("high");
  });

  it("caps scores when paste risk is high", () => {
    const integrity = {
      pasteCount: 3,
      pasteCharCount: 400,
      messages: [
        {
          messageId: "11111111-1111-4111-8111-111111111111",
          copiedFrom: [
            {
              messageId: "22222222-2222-4222-8222-222222222222",
              charCount: 200,
            },
          ],
          pasteCount: 3,
          pasteCharCount: 400,
          submittedCharCount: 500,
        },
      ],
    };
    const adjusted = applyIntegrityScoreAdjustment(
      {
        communication: 8,
        ownership: 7.5,
        overall: 7.8,
        recommendation: "yes",
      },
      integrity,
    );

    expect(adjusted.overall).toBeLessThanOrEqual(5);
    expect(adjusted.ownership).toBeLessThanOrEqual(4.5);
    expect(adjusted.recommendation).toBe("lean_no");
    expect(assessIntegrityRisk(integrity).explanation).toContain("transcript message");
  });

  it("replaces per-message integrity without double-counting totals", () => {
    const messageId = "11111111-1111-4111-8111-111111111111";
    const first = mergeInterviewIntegrity(undefined, messageId, {
      copiedFrom: [],
      pasteCount: 2,
      pasteCharCount: 80,
      submittedCharCount: 100,
    });
    const second = mergeInterviewIntegrity(first, messageId, {
      copiedFrom: [],
      pasteCount: 1,
      pasteCharCount: 40,
      submittedCharCount: 100,
    });

    expect(second.pasteCount).toBe(1);
    expect(second.pasteCharCount).toBe(40);
    expect(second.messages).toHaveLength(1);
  });

  it("clamps char counts to message length but preserves paste event counts", () => {
    const clamped = clampMessageIntegritySnapshot(
      {
        copiedFrom: [{ messageId: "22222222-2222-4222-8222-222222222222", charCount: 500 }],
        pasteCount: 99,
        pasteCharCount: 500,
        submittedCharCount: 500,
      },
      "ok",
    );

    expect(clamped.submittedCharCount).toBe(2);
    expect(clamped.pasteCharCount).toBe(2);
    expect(clamped.pasteCount).toBe(99);
    expect(clamped.copiedFrom[0]?.charCount).toBe(2);
  });

  it("treats a single tiny paste as low risk", () => {
    const risk = assessIntegrityRisk({
      pasteCount: 1,
      pasteCharCount: 3,
      messages: [
        {
          messageId: "11111111-1111-4111-8111-111111111111",
          copiedFrom: [],
          pasteCount: 1,
          pasteCharCount: 3,
          submittedCharCount: 200,
        },
      ],
    });

    expect(risk.level).toBe("low");
  });
});
