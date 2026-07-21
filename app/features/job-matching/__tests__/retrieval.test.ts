import { describe, expect, it } from "vitest";

import { retrieveJobs, scoreRetrievalJob } from "../retrieval";
import type { CandidateMatchingProfile, JobMatchingProfile } from "../schemas";

const candidate: CandidateMatchingProfile = {
  recentTitles: ["Frontend Engineer"],
  experienceYearsBucket: "3-5",
  facts: [
    {
      id: "candidate-role",
      category: "role_family",
      canonicalId: "frontend-engineering",
      label: "Frontend engineering",
    },
    { id: "candidate-react", category: "skill", canonicalId: "react", label: "React" },
    { id: "candidate-senior", category: "seniority", canonicalId: "senior", label: "Senior scope" },
  ],
};

const profile = (facts: JobMatchingProfile["facts"]): JobMatchingProfile => ({ facts });

describe("deterministic matching retrieval", () => {
  it("awards positive overlap without penalizing missing evidence", () => {
    const score = scoreRetrievalJob(
      candidate,
      profile([
        {
          id: "job-role",
          category: "role_family",
          canonicalId: "frontend-engineering",
          label: "Frontend engineering",
        },
        { id: "job-react", category: "required_skill", canonicalId: "react", label: "React" },
        { id: "job-rust", category: "required_skill", canonicalId: "rust", label: "Rust" },
      ]),
    );

    expect(score).toBe(52.5);
  });

  it("fills a sparse positive set with newest otherwise-eligible jobs", () => {
    const jobs = Array.from({ length: 20 }, (_, index) => ({
      id: String(index).padStart(2, "0"),
      createdAt: new Date(2026, 0, index + 1),
      profile: profile(
        index === 0
          ? [
              {
                id: "role",
                category: "role_family",
                canonicalId: "frontend-engineering",
                label: "Frontend",
              },
            ]
          : [
              {
                id: `skill-${index}`,
                category: "required_skill",
                canonicalId: `skill-${index}`,
                label: `Skill ${index}`,
              },
            ],
      ),
    }));

    const retrieved = retrieveJobs(candidate, jobs);
    expect(retrieved).toHaveLength(15);
    expect(retrieved[0].id).toBe("00");
    expect(retrieved[1].id).toBe("19");
  });

  it("returns newest fallback jobs for a candidate with no extracted facts", () => {
    const sparseCandidate: CandidateMatchingProfile = {
      recentTitles: [],
      experienceYearsBucket: "unknown",
      facts: [],
    };
    const jobs = Array.from({ length: 20 }, (_, index) => ({
      id: String(index).padStart(2, "0"),
      createdAt: new Date(2026, 0, index + 1),
      profile: profile([]),
    }));

    const retrieved = retrieveJobs(sparseCandidate, jobs);
    expect(retrieved).toHaveLength(15);
    expect(retrieved[0].id).toBe("19");
    expect(retrieved[14].id).toBe("05");
  });
});
