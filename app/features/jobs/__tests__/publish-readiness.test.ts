import { describe, expect, it } from "vitest";

import {
  getJobPublishBlockReason,
  getMissingPublishFields,
  missingPublishFieldsMessage,
} from "../publish-readiness";

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

  it("explains why a draft cannot be published", () => {
    expect(
      getJobPublishBlockReason({
        status: "draft",
        workplaceType: "remote",
        employmentType: null,
        experienceLevel: "senior",
        expiresAt: null,
      }),
    ).toBe("Complete the employment type before publishing.");

    expect(
      getJobPublishBlockReason(
        {
          status: "draft",
          workplaceType: "remote",
          employmentType: "full_time",
          experienceLevel: "senior",
          expiresAt: new Date("2026-01-01"),
        },
        new Date("2026-02-01"),
      ),
    ).toBe("Update the expired deadline before publishing.");
  });
});
