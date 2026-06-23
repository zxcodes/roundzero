import { describe, expect, it } from "vitest";
import { getOverallScore, parseStoredReport } from "@/features/reports/schemas";

const baseReportRow = {
  summary: "Solid candidate overall.",
  strengths: ["Clear communication"],
  weaknesses: ["Limited scale experience"],
  insights: ["Would ramp quickly"],
  evidence: ["Explained tradeoffs well"],
  screeningAnswers: [],
  recommendation: "yes" as const,
  answerAuthenticity: null,
};

describe("report score parsing", () => {
  it("reads overall scores on the 0–10 scale", () => {
    const scores = {
      communication: 8.2,
      problemSolving: 7.5,
      ownership: 7.1,
      roleFit: 8,
      overall: 7.7,
    };

    expect(getOverallScore(scores)).toBe(7.7);
    expect(parseStoredReport({ ...baseReportRow, scores })).toMatchObject({ scores });
  });

  it("rejects scores outside the 0–10 scale", () => {
    const invalidScores = {
      communication: 85,
      problemSolving: 72,
      ownership: 68,
      roleFit: 80,
      overall: 76,
    };

    expect(getOverallScore(invalidScores)).toBeNull();
    expect(parseStoredReport({ ...baseReportRow, scores: invalidScores })).toBeNull();
  });

  it("returns null for malformed score payloads", () => {
    expect(getOverallScore({ overall: 8 })).toBeNull();
    expect(parseStoredReport({ ...baseReportRow, scores: { overall: 8.5 } })).toBeNull();
  });
});
