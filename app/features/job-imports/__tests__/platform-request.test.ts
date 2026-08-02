import { describe, expect, it } from "vitest";

import { platformRequestFeedbackMessage, platformRequestSchema } from "../platform-request";

describe("platform request", () => {
  it("validates and formats a feature request", () => {
    const value = platformRequestSchema.parse({
      platform: "Workable",
      careersUrl: "https://apply.workable.com/acme",
      notes: "We have 40 active jobs.",
    });
    expect(platformRequestFeedbackMessage(value)).toContain("Platform: Workable");
    expect(platformRequestFeedbackMessage(value)).toContain("https://apply.workable.com/acme");
  });

  it("requires a platform name and validates an optional URL", () => {
    expect(
      platformRequestSchema.safeParse({ platform: "", careersUrl: "not-a-url", notes: "" }).success,
    ).toBe(false);
  });
});
