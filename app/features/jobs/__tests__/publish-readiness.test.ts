import { describe, expect, it } from "vitest";

import { getJobPublishBlockReason, getMissingRecommendedFields } from "../publish-readiness";

describe("publish readiness", () => {
  it("identifies missing recommended classifications", () => {
    const missing = getMissingRecommendedFields({
      workplaceType: null,
      employmentType: "full_time",
      experienceLevel: null,
    });
    expect(missing).toEqual(["workplaceType", "experienceLevel"]);
  });

  it("accepts complete classifications", () => {
    expect(
      getMissingRecommendedFields({
        workplaceType: "hybrid",
        employmentType: "contract",
        experienceLevel: "mid",
      }),
    ).toEqual([]);
  });

  it("allows missing classifications and blocks expired drafts", () => {
    expect(
      getJobPublishBlockReason({
        status: "draft",
        expiresAt: null,
        workplaceType: "hybrid",
        location: "New York, NY",
      }),
    ).toBeNull();

    expect(
      getJobPublishBlockReason(
        {
          status: "draft",
          expiresAt: new Date("2026-01-01"),
          workplaceType: "hybrid",
          location: "New York, NY",
        },
        new Date("2026-02-01"),
      ),
    ).toBe("Update the expired deadline before publishing.");
  });

  it("requires a recognized applicant country for remote drafts", () => {
    expect(
      getJobPublishBlockReason({
        status: "draft",
        expiresAt: null,
        workplaceType: "remote",
        location: "Remote",
      }),
    ).toBe('Remote jobs must include an applicant country, for example "Remote (India)".');

    expect(
      getJobPublishBlockReason({
        status: "draft",
        expiresAt: null,
        workplaceType: "remote",
        location: "Remote (India)",
      }),
    ).toBeNull();
  });
});
