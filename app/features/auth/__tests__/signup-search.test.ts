import { describe, expect, it } from "vitest";

import { loginUrlForEmailAction, sanitizeRedirect } from "../signup-search";

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

describe("loginUrlForEmailAction", () => {
  it("links candidate email actions through login and preserves the destination", () => {
    expect(
      loginUrlForEmailAction("https://tryroundzero.com", "candidate", "/interview/interview-id"),
    ).toBe("https://tryroundzero.com/candidate/login?redirect=%2Finterview%2Finterview-id");
  });

  it("links company email actions through login and preserves destination search params", () => {
    expect(
      loginUrlForEmailAction("https://tryroundzero.com", "company", "/dashboard/jobs?tab=archived"),
    ).toBe("https://tryroundzero.com/company/login?redirect=%2Fdashboard%2Fjobs%3Ftab%3Darchived");
  });

  it("drops unsafe external destinations", () => {
    expect(
      loginUrlForEmailAction("https://tryroundzero.com", "candidate", "https://evil.example"),
    ).toBe("https://tryroundzero.com/candidate/login");
  });
});
