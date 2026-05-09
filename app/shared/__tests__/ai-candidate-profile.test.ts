import { describe, expect, it } from "vitest";
import {
  buildCandidateProfilePromptPayload,
  buildCandidateProfileSummary,
  parseCandidateProfileSnapshot,
} from "../ai-candidate-profile";

describe("candidate AI profile helpers", () => {
  const candidateMeta = {
    headline: "Senior Backend Engineer",
    bio: "Built workflow systems for hiring and developer tooling.",
    skills: ["TypeScript", "PostgreSQL", "Cloudflare Workers"],
    workHistory: [
      {
        company: "RoundZero",
        title: "Founding Engineer",
        startMonth: "2024-01",
        endMonth: null,
        currentlyWorkingHere: true,
        description: "Built the application and AI workflow layer.",
      },
    ],
    links: {
      github: "https://github.com/example",
      linkedin: "https://linkedin.com/in/example",
    },
  };

  it("parses structured profile metadata", () => {
    const snapshot = parseCandidateProfileSnapshot(candidateMeta);

    expect(snapshot.headline).toBe("Senior Backend Engineer");
    expect(snapshot.skills).toEqual(["TypeScript", "PostgreSQL", "Cloudflare Workers"]);
    expect(snapshot.workHistory).toHaveLength(1);
    expect(snapshot.links).toEqual([
      { label: "github", url: "https://github.com/example" },
      { label: "linkedin", url: "https://linkedin.com/in/example" },
    ]);
  });

  it("builds a structured prompt payload with fallbacks", () => {
    const payload = buildCandidateProfilePromptPayload(candidateMeta);

    expect(payload.skills).toEqual(["TypeScript", "PostgreSQL", "Cloudflare Workers"]);
    expect(payload.workHistory).toEqual([
      {
        company: "RoundZero",
        title: "Founding Engineer",
        startMonth: "2024-01",
        endMonth: null,
        currentlyWorkingHere: true,
        description: "Built the application and AI workflow layer.",
      },
    ]);
    expect(payload.links).toEqual([
      "github: https://github.com/example",
      "linkedin: https://linkedin.com/in/example",
    ]);
  });

  it("builds a readable candidate summary for interview context", () => {
    const summary = buildCandidateProfileSummary(candidateMeta);

    expect(summary).toContain("Headline: Senior Backend Engineer");
    expect(summary).toContain("Skills: TypeScript, PostgreSQL, Cloudflare Workers");
    expect(summary).toContain("- Founding Engineer at RoundZero (2024-01 to Present)");
    expect(summary).toContain("Links:");
  });

  it("returns empty defaults for missing metadata", () => {
    const snapshot = parseCandidateProfileSnapshot(null);
    const summary = buildCandidateProfileSummary({});

    expect(snapshot.skills).toEqual([]);
    expect(snapshot.workHistory).toEqual([]);
    expect(summary).toBe("");
  });
});
