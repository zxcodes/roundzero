import { describe, expect, it } from "vitest";

import {
  normalizeJobMatchingProfile,
  sanitizeCandidateMatchingProfile,
} from "../profile-sanitization";
import { candidateMatchingProfileSchema } from "../schemas";

describe("candidate matching profile sanitization", () => {
  it("removes model-authored titles and prohibited facts before persistence", () => {
    const sanitized = sanitizeCandidateMatchingProfile({
      recentTitles: ["Engineer at Google"],
      experienceYearsBucket: "3-5",
      facts: [
        { id: "raw-react", category: "skill", canonicalId: "react", label: "React at Google" },
        {
          id: "raw-school",
          category: "education",
          canonicalId: "harvard-university",
          label: "Harvard University",
        },
        {
          id: "raw-protected",
          category: "domain",
          canonicalId: "female-candidates",
          label: "Female candidates",
        },
        {
          id: "raw-employer",
          category: "domain",
          canonicalId: "google",
          label: "Google",
        },
        {
          id: "raw-degree",
          category: "education",
          canonicalId: "bachelors-computer-science",
          label: "BSc, 2022",
        },
      ],
    });

    expect(sanitized.recentTitles).toEqual([]);
    expect(sanitized.facts).toEqual([
      { id: "skill-react", category: "skill", canonicalId: "react", label: "React" },
      {
        id: "education-bachelors-computer-science",
        category: "education",
        canonicalId: "bachelors-computer-science",
        label: "Bachelors computer science",
      },
    ]);
  });

  it("deduplicates facts using privacy-safe generated identifiers", () => {
    const sanitized = sanitizeCandidateMatchingProfile({
      recentTitles: [],
      experienceYearsBucket: "unknown",
      facts: [
        { id: "first", category: "skill", canonicalId: "react", label: "React" },
        { id: "second", category: "skill", canonicalId: "react", label: "React.js" },
      ],
    });

    expect(sanitized.facts).toHaveLength(1);
    expect(sanitized.facts[0]?.id).toBe("skill-react");
  });

  it("produces a profile that survives persisted schema round trips", () => {
    const sanitized = sanitizeCandidateMatchingProfile({
      recentTitles: [],
      experienceYearsBucket: "3-5",
      facts: [
        {
          id: "raw-role",
          category: "role_family",
          canonicalId: "frontend-engineer",
          label: "Frontend Engineer at Acme Corp",
        },
        {
          id: "raw-required",
          category: "responsibility",
          canonicalId: "frontend-architecture",
          label: "Frontend architecture",
        },
      ],
    });

    expect(sanitized.facts.map((fact) => fact.id)).toEqual([
      "role-family-frontend-engineer",
      "responsibility-frontend-architecture",
    ]);
    expect(candidateMatchingProfileSchema.parse(sanitized)).toEqual(sanitized);
  });

  it("normalizes category-prefixed and common technology aliases", () => {
    const candidate = sanitizeCandidateMatchingProfile({
      recentTitles: [],
      experienceYearsBucket: "3-5",
      facts: [
        { id: "one", category: "skill", canonicalId: "node", label: "Node" },
        { id: "two", category: "skill", canonicalId: "cicd", label: "CI/CD" },
      ],
    });
    const job = normalizeJobMatchingProfile({
      facts: [
        {
          id: "one",
          category: "required_skill",
          canonicalId: "skill-node-js",
          label: "Node.js",
        },
        {
          id: "two",
          category: "required_skill",
          canonicalId: "skill-ci-cd",
          label: "CI/CD",
        },
      ],
    });

    expect(candidate.facts.map((fact) => fact.canonicalId)).toEqual(["node-js", "ci-cd"]);
    expect(job.facts.map((fact) => fact.canonicalId)).toEqual(["node-js", "ci-cd"]);
  });
});
