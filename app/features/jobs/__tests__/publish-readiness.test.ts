import { describe, expect, it } from "vitest";

import { getMissingPublishFields, missingPublishFieldsMessage } from "../publish-readiness";

describe("publish readiness", () => {
  it("identifies classifications required before publishing", () => {
    const missing = getMissingPublishFields({
      workplaceType: null,
      employmentType: "full_time",
      experienceLevel: null,
    });
    expect(missing).toEqual(["workplaceType", "experienceLevel"]);
    expect(missingPublishFieldsMessage(missing)).toBe("workplace type, seniority");
  });

  it("accepts complete classifications", () => {
    expect(
      getMissingPublishFields({
        workplaceType: "hybrid",
        employmentType: "contract",
        experienceLevel: "mid",
      }),
    ).toEqual([]);
  });
});
