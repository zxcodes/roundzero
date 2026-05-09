import { describe, expect, it } from "vitest";
import { SLOP_DETECTION_SYSTEM_PROMPT } from "@/prompts/slop-detection";
import { buildSlopDetectionPrompt, shouldInviteFromDeterministicRules } from "../policy";

describe("pre-evaluation routing rules", () => {
  it("allows strong-fit interview candidates through deterministic routing", () => {
    expect(
      shouldInviteFromDeterministicRules({
        score: 78,
        consistencyScore: null,
        modelNextStep: "interview_invited",
      }),
    ).toBe(true);
  });

  it("blocks candidates the model explicitly marked as hold", () => {
    expect(
      shouldInviteFromDeterministicRules({
        score: 78,
        consistencyScore: 92,
        modelNextStep: "hold",
      }),
    ).toBe(false);
  });

  it("blocks severe authenticity-risk cases even when fit is otherwise high", () => {
    expect(
      shouldInviteFromDeterministicRules({
        score: 82,
        consistencyScore: 12,
        modelNextStep: "interview_invited",
      }),
    ).toBe(false);
  });
});

describe("slop detection prompt construction", () => {
  it("includes full structured profile context, not just headline and skills", () => {
    const prompt = buildSlopDetectionPrompt(
      {
        headline: "Platform Engineer",
        bio: "Built internal tooling.",
        skills: ["TypeScript", "Postgres"],
        workHistory: [
          {
            company: "Acme",
            title: "Engineer",
            startMonth: "2022-01",
            endMonth: "2024-01",
            currentlyWorkingHere: false,
            description: "Built hiring systems.",
          },
        ],
        links: {
          github: "https://github.com/example",
        },
      },
      "Resume text here",
    );

    const parsed = JSON.parse(prompt) as {
      profileMetadata: {
        workHistory: Array<{ company: string; title: string }>;
        links: string[];
      };
    };

    expect(parsed.profileMetadata.workHistory).toEqual([
      {
        company: "Acme",
        title: "Engineer",
        startMonth: "2022-01",
        endMonth: "2024-01",
        currentlyWorkingHere: false,
        description: "Built hiring systems.",
      },
    ]);
    expect(parsed.profileMetadata.links).toEqual(["github: https://github.com/example"]);
  });

  it("treats profile-resume overlap as expected in the system prompt", () => {
    expect(SLOP_DETECTION_SYSTEM_PROMPT).toContain("Profile and resume overlap is expected.");
    expect(SLOP_DETECTION_SYSTEM_PROMPT).toContain("Absence is not contradiction.");
  });
});
