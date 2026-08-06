import { describe, expect, it } from "vitest";

import {
  validateCandidateMatchingProfile,
  validateJobMatchingProfile,
} from "../profile-sanitization";
import { candidateProfile, jobProfile } from "./fixtures";

describe("matching profile usability", () => {
  it("accepts rich privacy-safe profiles", () => {
    expect(validateCandidateMatchingProfile(candidateProfile).summary).toBe(
      candidateProfile.summary,
    );
    expect(validateJobMatchingProfile(jobProfile).roleIdentity.label).toBe(
      jobProfile.roleIdentity.label,
    );
  });

  it("assigns deterministic global IDs idempotently and normalizes families", () => {
    const candidate = validateCandidateMatchingProfile({
      ...candidateProfile,
      adjacentFunctionalFamilies: ["other", "data_ai", "software_engineering", "data_ai"],
    });
    expect(validateCandidateMatchingProfile(candidate)).toEqual(candidate);
    expect(candidate.adjacentFunctionalFamilies).toEqual(["data_ai"]);
    expect(candidate.roleIdentities[0].id).toBe("role-1");
    expect(candidate.capabilities[0].id).toBe("capability-1");

    const job = validateJobMatchingProfile({
      ...jobProfile,
      functionalFamilies: ["software_engineering", "other", "software_engineering"],
    });
    expect(validateJobMatchingProfile(job)).toEqual(job);
    expect(job.functionalFamilies).toEqual(["software_engineering"]);
  });

  it("rejects generic schema-valid job output", () => {
    expect(() =>
      validateJobMatchingProfile({
        ...jobProfile,
        requiredCapabilities: [
          { id: "required-skill", label: "required-skill", context: "Needed for this position" },
        ],
      }),
    ).toThrow(/generic/);
  });

  it("rejects identifying candidate text", () => {
    expect(() =>
      validateCandidateMatchingProfile({
        ...candidateProfile,
        summary: "Senior software engineer; email person@example.com for more information.",
      }),
    ).toThrow(/private/);
  });

  it("accepts legitimate technical language and rejects vague-only labels", () => {
    expect(() =>
      validateCandidateMatchingProfile({
        ...candidateProfile,
        capabilities: [
          { id: "model-id", label: "Cloud cost optimization", context: "Optimized for AWS" },
        ],
      }),
    ).not.toThrow();
    for (const label of ["Professional", "transferable skills", "communication skills"]) {
      expect(() =>
        validateCandidateMatchingProfile({
          ...candidateProfile,
          capabilities: [{ id: "model-id", label, context: "Broad workplace capability" }],
        }),
      ).toThrow(/generic/);
    }
  });

  it("requires a non-other primary family", () => {
    expect(() =>
      validateCandidateMatchingProfile({
        ...candidateProfile,
        primaryFunctionalFamily: "other",
        adjacentFunctionalFamilies: ["software_engineering"],
      }),
    ).toThrow(/functional identity/);
    expect(() =>
      validateJobMatchingProfile({ ...jobProfile, functionalFamilies: ["other"] }),
    ).toThrow(/functional identity/);
  });
});
