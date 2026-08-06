import { describe, expect, it } from "vitest";

import { capScoreForEvidence, validateAndRenderEvidence } from "../evidence";
import type { CandidateMatchingProfile, JobMatchingProfile } from "../schemas";

const candidate: CandidateMatchingProfile = {
  recentTitles: [],
  experienceYearsBucket: "unknown",
  facts: [{ id: "skill-react", category: "skill", canonicalId: "react", label: "React" }],
};

describe("match evidence", () => {
  it("renders only canonically aligned, compatible facts", () => {
    const job: JobMatchingProfile = {
      facts: [
        {
          id: "job-react",
          category: "required_skill",
          canonicalId: "react",
          label: "React",
        },
      ],
    };

    expect(
      validateAndRenderEvidence(candidate, job, [
        { candidateFactId: "skill-react", jobFactId: "job-react" },
      ]),
    ).toEqual([
      {
        candidateFactId: "skill-react",
        jobFactId: "job-react",
        text: "Your React experience matches a required skill.",
      },
    ]);
  });

  it("discards fabricated canonical alignment", () => {
    const job: JobMatchingProfile = {
      facts: [{ id: "job-rust", category: "required_skill", canonicalId: "rust", label: "Rust" }],
    };

    expect(
      validateAndRenderEvidence(candidate, job, [
        { candidateFactId: "skill-react", jobFactId: "job-rust" },
      ]),
    ).toEqual([]);
  });

  it("discards unknown and duplicate evidence identifiers", () => {
    const job: JobMatchingProfile = {
      facts: [
        {
          id: "job-react",
          category: "required_skill",
          canonicalId: "react",
          label: "React",
        },
      ],
    };

    expect(
      validateAndRenderEvidence(candidate, job, [
        { candidateFactId: "unknown", jobFactId: "job-react" },
        { candidateFactId: "skill-react", jobFactId: "job-react" },
        { candidateFactId: "skill-react", jobFactId: "job-react" },
      ]),
    ).toEqual([
      {
        candidateFactId: "skill-react",
        jobFactId: "job-react",
        text: "Your React experience matches a required skill.",
      },
    ]);
  });

  it("fills missing model evidence from deterministic canonical overlaps", () => {
    const job: JobMatchingProfile = {
      facts: [
        {
          id: "job-react",
          category: "required_skill",
          canonicalId: "react",
          label: "React",
        },
      ],
    };

    expect(validateAndRenderEvidence(candidate, job, [])).toEqual([
      {
        candidateFactId: "skill-react",
        jobFactId: "job-react",
        text: "Your React experience matches a required skill.",
      },
    ]);
  });

  it("omits unsupported jobs and keeps single-evidence jobs out of good and strong bands", () => {
    expect(capScoreForEvidence(95, 0)).toBeNull();
    expect(capScoreForEvidence(95, 1)).toBe(59);
    expect(capScoreForEvidence(95, 2)).toBe(95);
  });
});
