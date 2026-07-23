import { describe, expect, it } from "vitest";

import { sanitizeRedirect } from "../signup-search";

describe("sanitizeRedirect", () => {
  it("accepts internal application paths", () => {
    expect(sanitizeRedirect("/dashboard/jobs/123")).toBe("/dashboard/jobs/123");
  });

  it.each([
    "https://example.com",
    "//example.com",
    "/onboarding",
    "/onboarding/company",
    "/onboarding/candidate",
  ])("rejects unsafe redirect %s", (redirect) => {
    expect(sanitizeRedirect(redirect)).toBeUndefined();
  });
});
