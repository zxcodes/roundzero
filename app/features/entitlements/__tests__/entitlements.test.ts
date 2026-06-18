import { describe, expect, it } from "vitest";
import { clampFinalReportTarget, deriveEntitlements } from "../entitlements";

describe("deriveEntitlements", () => {
  it("counts only open jobs against the active-job limit", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
      jobCounts: {
        openCount: 3,
        draftCount: 4,
        totalCount: 7,
      },
    });

    expect(entitlements.jobs.active.used).toBe(3);
    expect(entitlements.jobs.active.limit).toBe(3);
    expect(entitlements.jobs.active.atLimit).toBe(true);
    expect(entitlements.jobs.canOpenAnother).toBe(false);
    expect(entitlements.jobs.canCreateDraft).toBe(true);
    expect(entitlements.jobs.drafts.used).toBe(4);
    expect(entitlements.jobs.totalUnarchived).toBe(7);
  });

  it("falls back to the free plan for unknown plans", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "unknown",
      subscriptionStatus: null,
      jobCounts: null,
    });

    expect(entitlements.subscription.plan).toBe("free");
    expect(entitlements.jobs.active.limit).toBe(1);
    expect(entitlements.reports.perJobLimit).toBe(1);
    expect(entitlements.aiJobCreation.enabled).toBe(false);
  });

  it("enables AI job creation only for paid plans in good standing", () => {
    const active = deriveEntitlements({
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
      jobCounts: null,
    });
    const inactive = deriveEntitlements({
      subscriptionPlan: "starter",
      subscriptionStatus: "past_due",
      jobCounts: null,
    });

    expect(active.aiJobCreation.enabled).toBe(true);
    expect(active.aiJobCreation.disabledReason).toBeNull();
    expect(inactive.aiJobCreation.enabled).toBe(false);
    expect(inactive.aiJobCreation.disabledReason).toBe(
      "AI job creation is available on paid plans. Upgrade to unlock this feature.",
    );
  });
});

describe("clampFinalReportTarget", () => {
  it("caps the requested target at the plan limit", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
      jobCounts: null,
    });

    expect(clampFinalReportTarget(entitlements, 10)).toBe(3);
    expect(clampFinalReportTarget(entitlements, 2)).toBe(2);
  });

  it("defaults to the plan limit and enforces a minimum of 1", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "growth",
      subscriptionStatus: "active",
      jobCounts: null,
    });

    expect(clampFinalReportTarget(entitlements, undefined)).toBe(5);
    expect(clampFinalReportTarget(entitlements, 0)).toBe(1);
  });
});
