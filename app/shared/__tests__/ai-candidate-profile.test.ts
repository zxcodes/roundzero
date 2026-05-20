import { describe, expect, it } from "vitest";
import {
  buildCandidateProfilePromptPayload,
  buildCandidateProfileSummary,
  parseCandidateProfileSnapshot,
} from "../ai-candidate-profile";

describe("candidate AI profile helpers", () => {
  const candidateMeta = {
    headline: "Senior Backend Engineer",
    skills: ["TypeScript", "PostgreSQL", "Cloudflare Workers"],
    links: {
      github: "https://github.com/example",
      linkedin: "https://linkedin.com/in/example",
    },
  };

  it("parses structured profile metadata", () => {
    const snapshot = parseCandidateProfileSnapshot(candidateMeta);

    expect(snapshot.headline).toBe("Senior Backend Engineer");
    expect(snapshot.skills).toEqual(["TypeScript", "PostgreSQL", "Cloudflare Workers"]);
    expect(snapshot.links).toEqual([
      { label: "github", url: "https://github.com/example" },
      { label: "linkedin", url: "https://linkedin.com/in/example" },
    ]);
  });

  it("builds a structured prompt payload with fallbacks", () => {
    const payload = buildCandidateProfilePromptPayload(candidateMeta);

    expect(payload.skills).toEqual(["TypeScript", "PostgreSQL", "Cloudflare Workers"]);
    expect(payload.links).toEqual([
      "github: https://github.com/example",
      "linkedin: https://linkedin.com/in/example",
    ]);
  });

  it("builds a readable candidate summary for interview context", () => {
    const summary = buildCandidateProfileSummary(candidateMeta);

    expect(summary).toContain("Headline: Senior Backend Engineer");
    expect(summary).toContain("Skills: TypeScript, PostgreSQL, Cloudflare Workers");
    expect(summary).toContain("Links:");
  });

  it("returns empty defaults for missing metadata", () => {
    const snapshot = parseCandidateProfileSnapshot(null);
    const summary = buildCandidateProfileSummary({});

    expect(snapshot.skills).toEqual([]);
    expect(summary).toBe("");
  });
});
