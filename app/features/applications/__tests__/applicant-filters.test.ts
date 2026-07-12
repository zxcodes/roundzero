import { describe, expect, it } from "vitest";

import {
  isAwaitingCompanyDecision,
  matchesJobApplicantsFilter,
} from "@/features/applications/applicant-filters";

const releasedAt = new Date("2026-07-01T12:00:00Z");

describe("isAwaitingCompanyDecision", () => {
  it("includes evaluated applicants with a released report", () => {
    expect(isAwaitingCompanyDecision({ status: "evaluated", reportReleasedAt: releasedAt })).toBe(
      true,
    );
  });

  it("includes evaluated_held applicants when a report was already released", () => {
    expect(
      isAwaitingCompanyDecision({ status: "evaluated_held", reportReleasedAt: releasedAt }),
    ).toBe(true);
  });

  it("excludes released reports that already have a terminal decision", () => {
    expect(isAwaitingCompanyDecision({ status: "shortlisted", reportReleasedAt: releasedAt })).toBe(
      false,
    );
    expect(isAwaitingCompanyDecision({ status: "rejected", reportReleasedAt: releasedAt })).toBe(
      false,
    );
  });

  it("excludes evaluated applicants before report release", () => {
    expect(isAwaitingCompanyDecision({ status: "evaluated", reportReleasedAt: null })).toBe(false);
  });
});

describe("matchesJobApplicantsFilter", () => {
  it("matches awaiting_decision from released reports needing review", () => {
    expect(
      matchesJobApplicantsFilter(
        { status: "evaluated", reportReleasedAt: releasedAt },
        "awaiting_decision",
      ),
    ).toBe(true);
    expect(
      matchesJobApplicantsFilter(
        { status: "shortlisted", reportReleasedAt: releasedAt },
        "awaiting_decision",
      ),
    ).toBe(false);
  });
});
