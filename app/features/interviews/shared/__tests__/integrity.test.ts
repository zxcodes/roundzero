import { describe, expect, it } from "vitest";
import {
  applyIntegrityScoreAdjustment,
  assessIntegrityRisk,
  clampMessageIntegritySnapshot,
  getIntegrityWeaknesses,
  mergeInterviewIntegrity,
} from "@/features/interviews/shared/integrity";

describe("interview integrity", () => {
  it("merges per-message integrity into interview metadata", () => {
    const merged = mergeInterviewIntegrity(undefined, "11111111-1111-4111-8111-111111111111", {
      copyCount: 0,
      pasteCount: 1,
      pasteCharCount: 120,
      submittedCharCount: 150,
    });

    expect(merged.pasteCount).toBe(1);
    expect(merged.messages).toHaveLength(1);
    expect(merged.messages[0]?.messageId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("flags high risk when paste volume is large", () => {
    const risk = assessIntegrityRisk({
      copyCount: 0,
      pasteCount: 3,
      pasteCharCount: 400,
      messages: [
        {
          messageId: "11111111-1111-4111-8111-111111111111",
          copyCount: 0,
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
      copyCount: 0,
      pasteCount: 3,
      pasteCharCount: 400,
      messages: [
        {
          messageId: "11111111-1111-4111-8111-111111111111",
          copyCount: 0,
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
    expect(getIntegrityWeaknesses(integrity).length).toBeGreaterThan(0);
  });

  it("replaces per-message integrity without double-counting totals", () => {
    const messageId = "11111111-1111-4111-8111-111111111111";
    const first = mergeInterviewIntegrity(undefined, messageId, {
      copyCount: 0,
      pasteCount: 2,
      pasteCharCount: 80,
      submittedCharCount: 100,
    });
    const second = mergeInterviewIntegrity(first, messageId, {
      copyCount: 0,
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
        copyCount: 99,
        pasteCount: 99,
        pasteCharCount: 500,
        submittedCharCount: 500,
      },
      "ok",
    );

    expect(clamped.submittedCharCount).toBe(2);
    expect(clamped.pasteCharCount).toBe(2);
    expect(clamped.pasteCount).toBe(99);
  });

  it("treats a single tiny paste as low risk", () => {
    const risk = assessIntegrityRisk({
      copyCount: 0,
      pasteCount: 1,
      pasteCharCount: 3,
      messages: [
        {
          messageId: "11111111-1111-4111-8111-111111111111",
          copyCount: 0,
          pasteCount: 1,
          pasteCharCount: 3,
          submittedCharCount: 200,
        },
      ],
    });

    expect(risk.level).toBe("low");
  });
});
