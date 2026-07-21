import { describe, expect, it } from "vitest";

import { candidateMatchingProfileSchema, rerankerOutputSchema } from "../schemas";

describe("matching schemas", () => {
  it("rejects extra candidate profile fields that could leak raw data", () => {
    const result = candidateMatchingProfileSchema.safeParse({
      recentTitles: [],
      experienceYearsBucket: "unknown",
      facts: [],
      candidateName: "Private Name",
    });
    expect(result.success).toBe(false);
  });

  it("allows no evidence when a fallback job has no positive overlap", () => {
    const result = rerankerOutputSchema.safeParse({
      matches: [{ jobId: crypto.randomUUID(), score: 80, evidencePairs: [] }],
    });
    expect(result.success).toBe(true);
  });
});
