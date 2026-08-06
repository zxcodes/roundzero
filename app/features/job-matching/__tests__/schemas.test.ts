import { describe, expect, it } from "vitest";

import {
  candidateMatchingProfileGenerationSchema,
  candidateMatchingProfileSchema,
  createRerankerOutputGenerationSchema,
  jobMatchingProfileGenerationSchema,
  jobMatchingProfileSchema,
  rerankerOutputSchema,
} from "../schemas";
import { candidateProfile } from "./fixtures";

describe("rich matching schemas", () => {
  it("rejects empty candidate and job profiles", () => {
    expect(candidateMatchingProfileSchema.safeParse({}).success).toBe(false);
    expect(jobMatchingProfileSchema.safeParse({}).success).toBe(false);
  });

  it("requires dimension scores and structured evidence references", () => {
    expect(
      rerankerOutputSchema.safeParse({
        matches: [{ jobId: crypto.randomUUID(), score: 80, evidencePairs: [] }],
      }).success,
    ).toBe(false);
    expect(
      rerankerOutputSchema.safeParse({
        matches: [
          {
            jobId: crypto.randomUUID(),
            score: 80,
            dimensions: {
              roleFunction: 90,
              capabilitiesResponsibilities: 80,
              technologies: 70,
              seniority: 70,
              domain: 50,
            },
            evidencePairs: [{ candidateItemId: "cap-api", jobItemId: "resp-services" }],
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("keeps labels concise independently from context", () => {
    expect(
      candidateMatchingProfileSchema.safeParse({
        ...candidateProfile,
        capabilities: [{ ...candidateProfile.capabilities[0], label: "x".repeat(111) }],
      }).success,
    ).toBe(false);
    expect(
      candidateMatchingProfileSchema.safeParse({
        ...candidateProfile,
        capabilities: [{ ...candidateProfile.capabilities[0], context: "x".repeat(200) }],
      }).success,
    ).toBe(true);
  });

  it("keeps provider generation profiles broad while strict profiles enforce limits", () => {
    const broadCandidate = {
      ...candidateProfile,
      summary: "x",
      roleIdentities: [],
      capabilities: [{ id: "NOT A STRICT ID", label: "x".repeat(111), context: "x".repeat(241) }],
    };
    expect(candidateMatchingProfileGenerationSchema.safeParse(broadCandidate).success).toBe(true);
    expect(candidateMatchingProfileSchema.safeParse(broadCandidate).success).toBe(false);

    const broadJob = {
      roleIdentity: { id: "INVALID ID", label: "x", summary: "x" },
      functionalFamilies: [],
      seniority: "unknown",
      responsibilities: [],
      requiredCapabilities: [],
      preferredCapabilities: [],
      requiredTechnologies: [],
      preferredTechnologies: [],
      domains: [],
    };
    expect(jobMatchingProfileGenerationSchema.safeParse(broadJob).success).toBe(true);
    expect(jobMatchingProfileSchema.safeParse(broadJob).success).toBe(false);
  });

  it("keeps provider reranker output broad while strict output enforces IDs and limits", () => {
    const rerankerOutputGenerationSchema = createRerankerOutputGenerationSchema(["job-1"]);
    const broadOutput = {
      matches: [
        {
          jobId: "job-1",
          score: -1_000,
          dimensions: {
            roleFunction: 1_000,
            capabilitiesResponsibilities: -1_000,
            technologies: 1_000,
            seniority: -1_000,
            domain: 1_000,
          },
          evidencePairs: Array.from({ length: 4 }, () => ({
            candidateItemId: "INVALID ID",
            jobItemId: "INVALID ID",
          })),
        },
      ],
    };
    expect(rerankerOutputGenerationSchema.safeParse(broadOutput).success).toBe(true);
    expect(rerankerOutputSchema.safeParse(broadOutput).success).toBe(false);
  });

  it("constrains generated job IDs to the supplied transport references", () => {
    const schema = createRerankerOutputGenerationSchema(["job-1", "job-2"]);
    const match = {
      jobId: "job-3",
      score: 50,
      dimensions: {
        roleFunction: 50,
        capabilitiesResponsibilities: 50,
        technologies: 50,
        seniority: 50,
        domain: 50,
      },
      evidencePairs: [],
    };
    expect(schema.safeParse({ matches: [match] }).success).toBe(false);
    expect(schema.safeParse({ matches: [{ ...match, jobId: "job-2" }] }).success).toBe(true);
  });
});
