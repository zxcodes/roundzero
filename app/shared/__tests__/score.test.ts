import { describe, expect, it } from "vitest";

import {
  candidateScoreProgressPercent,
  clampCandidateScore,
  formatCandidateScore,
  formatCandidateScoreWithScale,
} from "@/shared/score";

describe("candidate score scale", () => {
  it("clamps and formats stored 0–10 scores", () => {
    expect(clampCandidateScore(8.44)).toBe(8.4);
    expect(formatCandidateScore(8.4)).toBe("8.4");
    expect(formatCandidateScoreWithScale(8.4)).toBe("8.4/10");
  });

  it("formats whole numbers without a trailing decimal", () => {
    expect(formatCandidateScore(8)).toBe("8");
    expect(formatCandidateScore(10)).toBe("10");
    expect(formatCandidateScoreWithScale(7)).toBe("7/10");
  });

  it("returns an em dash for missing scores", () => {
    expect(formatCandidateScore(null)).toBe("—");
    expect(formatCandidateScoreWithScale(undefined)).toBe("—");
  });

  it("maps progress bars from the 0–10 scale", () => {
    expect(candidateScoreProgressPercent(8.4)).toBe(84);
    expect(candidateScoreProgressPercent(10)).toBe(100);
    expect(candidateScoreProgressPercent(0)).toBe(0);
  });

  it("clamps out-of-range values to 0–10", () => {
    expect(clampCandidateScore(78)).toBe(10);
    expect(clampCandidateScore(10.8)).toBe(10);
    expect(clampCandidateScore(-3)).toBe(0);
    expect(clampCandidateScore(150)).toBe(10);
  });

  it("uses the fallback for non-numeric input", () => {
    expect(clampCandidateScore("nope", 4.2)).toBe(4.2);
    expect(clampCandidateScore(undefined)).toBe(5);
  });
});
