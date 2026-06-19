import { describe, expect, it } from "vitest";
import {
  normalizeCommunicationAssessmentInput,
  parseCommunicationAssessment,
} from "@/prompts/communication-assessment";

describe("normalizeCommunicationAssessmentInput", () => {
  it("coerces flat model output into nested dimension objects", () => {
    const raw = {
      clarity: 40,
      evidenceClarity: ["What?", "Well, the durable object is managed."],
      articulation: 45,
      evidenceArticulation: ["I explain the pros and cons."],
      conciseness: 50,
      evidenceConciseness: ["I make them understand easily."],
      listening: 30,
      evidenceListening: ["What?", "Let's move on."],
      confidence: 35,
      evidenceConfidence: ["I don't know.", "I write down why my decision is better."],
      overallScore: 36,
      summary: "The candidate struggles to deliver clear responses.",
    };

    const normalized = normalizeCommunicationAssessmentInput(raw);
    const parsed = parseCommunicationAssessment(normalized);

    expect(parsed).not.toBeNull();
    expect(parsed?.clarity).toEqual({
      score: 40,
      evidence: ["What?", "Well, the durable object is managed."],
    });
    expect(parsed?.overallScore).toBe(36);
    expect(parsed?.summary).toBe("The candidate struggles to deliver clear responses.");
  });

  it("passes through already-nested output unchanged", () => {
    const raw = {
      clarity: { score: 70, evidence: ["clear answer"] },
      articulation: { score: 72, evidence: ["precise wording"] },
      conciseness: { score: 68, evidence: ["short reply"] },
      listening: { score: 75, evidence: ["answered the question"] },
      confidence: { score: 71, evidence: ["steady tone"] },
      overallScore: 72,
      summary: "Solid verbal communication overall.",
    };

    expect(parseCommunicationAssessment(raw)).toEqual(raw);
  });
});
