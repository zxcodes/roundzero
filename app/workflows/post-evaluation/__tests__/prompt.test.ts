import { beforeEach, describe, expect, it, vi } from "vitest";

import { createWorkflowLogger } from "@/shared/logger";

const generateTextMock = vi.hoisted(() =>
  vi.fn(async (_args: { prompt: string }) => ({
    output: {
      summary: "Summary",
      strengths: ["Strength"],
      weaknesses: ["Weakness"],
      insights: ["Insight"],
      evidence: ["Evidence"],
      screeningAnswers: [],
      scores: {
        communication: 5,
        problemSolving: 5,
        ownership: 5,
        roleFit: 5,
        overall: 5,
      },
      recommendation: "lean_no",
    },
    usage: { inputTokens: 10, outputTokens: 10 },
  })),
);

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal()),
  generateText: generateTextMock,
}));

vi.mock("@/shared/openrouter", () => ({
  createChatModel: () => ({}),
  getModelChain: () => ({ model: "test-model", fallbacks: [] }),
}));

import { generateReport } from "../steps";

const buildInterviewData = (jobRequirements: string[]) => ({
  interview: {
    jobTitle: "Backend Engineer",
    companyName: "Runtime Co",
    candidateName: "Jordan",
  },
  transcript: "Interviewer: Tell me about your work.\n\nCandidate: I built APIs.",
  screeningCoverage: {},
  moderation: { quality: "normal" as const },
  runtimeContext: {
    interviewId: crypto.randomUUID(),
    applicationId: crypto.randomUUID(),
    type: "full" as const,
    jobTitle: "Backend Engineer",
    companyName: "Runtime Co",
    jobDescription: "Build APIs.\n\n## Requirements\n\n- Go",
    jobRequirements,
    candidateName: "Jordan",
    candidateSummary: "Built APIs.",
    customQuestions: [],
    preEvaluation: {
      score: null,
      missingRequirements: [],
      consistencyScore: null,
      authenticityFlags: [],
      authenticityExplanation: null,
    },
  },
});

describe("post-evaluation prompt", () => {
  beforeEach(() => generateTextMock.mockClear());

  it("omits obsolete empty snapshot requirements", async () => {
    await generateReport(
      buildInterviewData([]),
      createWorkflowLogger("post-evaluation-test", crypto.randomUUID()),
    )();

    const prompt = JSON.parse(generateTextMock.mock.calls[0]![0].prompt);
    expect(prompt).not.toHaveProperty("jobRequirements");
  });

  it("retains legacy non-empty snapshot requirements", async () => {
    await generateReport(
      buildInterviewData(["Go"]),
      createWorkflowLogger("post-evaluation-test", crypto.randomUUID()),
    )();

    const prompt = JSON.parse(generateTextMock.mock.calls[0]![0].prompt);
    expect(prompt.jobRequirements).toContain("Go");
  });
});
