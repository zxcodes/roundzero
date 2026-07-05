import { describe, expect, it } from "vitest";
import {
  normalizeCommunicationAssessmentInput,
  parseCommunicationAssessment,
} from "@/prompts/communication-assessment";

describe("normalizeCommunicationAssessmentInput", () => {
  it("coerces flat model output into nested dimension objects", () => {
    const raw = {
      clarity: 4,
      evidenceClarity: ["What?", "Well, the durable object is managed."],
      articulation: 4.5,
      evidenceArticulation: ["I explain the pros and cons."],
      conciseness: 5,
      evidenceConciseness: ["I make them understand easily."],
      listening: 3,
      evidenceListening: ["What?", "Let's move on."],
      confidence: 3.5,
      evidenceConfidence: ["I don't know.", "I write down why my decision is better."],
      overallScore: 3.6,
      summary: "The candidate struggles to deliver clear responses.",
    };

    const normalized = normalizeCommunicationAssessmentInput(raw);
    const parsed = parseCommunicationAssessment(normalized);

    expect(parsed).not.toBeNull();
    expect(parsed?.clarity).toEqual({
      score: 4,
      evidence: ["What?", "Well, the durable object is managed."],
    });
    expect(parsed?.overallScore).toBe(3.6);
    expect(parsed?.summary).toBe("The candidate struggles to deliver clear responses.");
  });

  it("clamps nested 0–100 voice scores onto the 0–10 scale", () => {
    const raw = {
      clarity: { score: 72, evidence: ["clear answer"] },
      articulation: { score: 68, evidence: ["precise wording"] },
      conciseness: { score: 70, evidence: ["short reply"] },
      listening: { score: 75, evidence: ["answered the question"] },
      confidence: { score: 71, evidence: ["steady tone"] },
      overallScore: 72,
      summary: "Out-of-range voice assessment.",
    };

    const parsed = parseCommunicationAssessment(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.clarity.score).toBe(7.2);
    expect(parsed?.overallScore).toBe(7.2);
  });

  it("passes through already-nested output unchanged", () => {
    const raw = {
      clarity: { score: 7, evidence: ["clear answer"] },
      articulation: { score: 7.2, evidence: ["precise wording"] },
      conciseness: { score: 6.8, evidence: ["short reply"] },
      listening: { score: 7.5, evidence: ["answered the question"] },
      confidence: { score: 7.1, evidence: ["steady tone"] },
      overallScore: 7.2,
      summary: "Solid verbal communication overall.",
    };

    expect(parseCommunicationAssessment(raw)).toEqual(raw);
  });
});
