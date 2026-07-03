import { describe, expect, it } from "vitest";
import { pickPreferredInterviewId } from "@/features/interviews/shared/candidate-display";

describe("pickPreferredInterviewId", () => {
  it("prefers actionable interviews over expired ones", () => {
    const preferred = pickPreferredInterviewId([
      { id: "expired-1", status: "expired" },
      { id: "pending-1", status: "pending" },
    ]);

    expect(preferred).toBe("pending-1");
  });

  it("returns null when only expired interviews exist", () => {
    const preferred = pickPreferredInterviewId([
      { id: "expired-1", status: "expired" },
      { id: "expired-2", status: "expired" },
    ]);

    expect(preferred).toBeNull();
  });
});
