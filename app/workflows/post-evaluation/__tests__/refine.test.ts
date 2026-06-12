import { describe, expect, it, vi } from "vitest";
import { refineReport } from "../refine";

vi.mock("ai", () => ({
  Output: { object: () => ({}) },
  generateText: vi.fn(async () => {
    throw new Error("audit unavailable");
  }),
}));

vi.mock("@/shared/openrouter", () => ({
  createChatModel: () => ({}),
  getModelChain: () => ({ model: "test-model", fallbacks: [] }),
}));

describe("refineReport", () => {
  it("adds screening coverage delta insight and audits unasked screening entries", async () => {
    const draft = {
      summary: "Candidate gave concise answers and described one project in moderate detail.",
      strengths: ["Candidate gave a concise answer about delivery tradeoffs in their API project."],
      weaknesses: ["Candidate did not provide specific metrics for the migration impact."],
      insights: ["Candidate appears open to ownership but needs deeper architecture probing."],
      evidence: ['Candidate: "I migrated our API to reduce latency by around 40 percent."'],
      screeningAnswers: [
        {
          question: "What is your notice period?",
          answer: "30 days",
          concern: "none" as const,
          notes: "Answered directly.",
        },
      ],
      scores: {
        communication: 70,
        problemSolving: 68,
        ownership: 66,
        roleFit: 69,
        overall: 68,
      },
      recommendation: "lean_no" as const,
      answerAuthenticity: null,
    };

    const transcript = [
      "Interviewer: Tell me about a system you improved recently.",
      "Candidate: I migrated our API and reduced latency by about 40 percent.",
      "Interviewer: What tradeoffs did you make?",
      "Candidate: I accepted slightly higher infra cost for stability.",
    ].join("\n\n");

    const refined = await refineReport({
      draft,
      transcript,
      customQuestions: ["What is your notice period?"],
      messages: [
        { role: "assistant", content: "Tell me about a system you improved recently." },
        {
          role: "candidate",
          content: "I migrated our API and reduced latency by about 40 percent.",
        },
        { role: "assistant", content: "What tradeoffs did you make?" },
        { role: "candidate", content: "I accepted slightly higher infra cost for stability." },
      ],
      screeningCoverage: { 1: "answered" },
      log: {
        step: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        result: () => {},
        ai: () => {},
      },
    });

    expect(
      refined.insights.some((item) =>
        item.includes("agent marked 1/1 covered; transcript audit found 0/1 asked"),
      ),
    ).toBe(true);
    expect(refined.screeningAnswers[0]?.answer).toBeNull();
    expect(refined.screeningAnswers[0]?.notes).toContain("never asked");
  });
});
