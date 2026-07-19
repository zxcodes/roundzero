import { describe, expect, it } from "vitest";

import { deriveEntitlements, resolveReportTarget } from "../entitlements";
import { enforceReportTarget } from "../server/enforcement";

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
    expect(entitlements.jobs.active.limit).toBe(5);
    expect(entitlements.jobs.active.atLimit).toBe(false);
    expect(entitlements.jobs.canOpenAnother).toBe(true);
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
    expect(entitlements.reports.defaultTarget).toBe(1);
    expect(entitlements.team.members.limit).toBe(1);
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

  it.each(["inactive", "past_due", "canceled", "incomplete", "incomplete_expired", "unpaid"])(
    "uses Free limits for a paid plan with %s status",
    (subscriptionStatus) => {
      const entitlements = deriveEntitlements({
        subscriptionPlan: "scale",
        subscriptionStatus,
        jobCounts: null,
      });

      expect(entitlements.subscription.plan).toBe("free");
      expect(entitlements.subscription.isActive).toBe(false);
      expect(entitlements.jobs.active.limit).toBe(1);
      expect(entitlements.reports.perJobLimit).toBe(1);
      expect(entitlements.team.members.limit).toBe(1);
    },
  );

  it("keeps paid limits while a subscription is active and scheduled to cancel", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "growth",
      subscriptionStatus: "active",
      jobCounts: null,
    });

    expect(entitlements.subscription.plan).toBe("growth");
    expect(entitlements.jobs.active.limit).toBe(15);
  });
});

describe("resolveReportTarget", () => {
  it("caps the requested target at the plan limit", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
      jobCounts: null,
    });

    expect(resolveReportTarget(entitlements, 10)).toBe(3);
    expect(resolveReportTarget(entitlements, 2)).toBe(2);
  });

  it("defaults to the plan default and enforces a minimum of 1", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "growth",
      subscriptionStatus: "active",
      jobCounts: null,
    });

    expect(resolveReportTarget(entitlements, undefined)).toBe(5);
    expect(resolveReportTarget(entitlements, 0)).toBe(1);
  });
});

describe("team entitlements", () => {
  it("counts active members and pending invites against the team limit", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
      jobCounts: null,
      teamCounts: { invitedMemberCount: 1, pendingInviteCount: 1 },
    });

    expect(entitlements.team.members.used).toBe(1);
    expect(entitlements.team.members.limit).toBe(2);
    expect(entitlements.team.pendingInvites.used).toBe(1);
    expect(entitlements.team.slotsUsed).toBe(2);
    expect(entitlements.team.members.remaining).toBe(0);
    expect(entitlements.team.canInviteAnother).toBe(false);
  });

  it("blocks invites on free when the one addable seat is already used", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "free",
      subscriptionStatus: "inactive",
      jobCounts: null,
      teamCounts: { invitedMemberCount: 1, pendingInviteCount: 0 },
    });

    expect(entitlements.team.canInviteAnother).toBe(false);
    expect(entitlements.team.members.atLimit).toBe(true);
  });

  it("allows one invite on free when only the owner is present", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "free",
      subscriptionStatus: "inactive",
      jobCounts: null,
      teamCounts: { invitedMemberCount: 0, pendingInviteCount: 0 },
    });

    expect(entitlements.team.canInviteAnother).toBe(true);
    expect(entitlements.team.members.used).toBe(0);
  });
});

describe("enforceReportTarget", () => {
  it("rejects explicit targets outside the plan range in strict mode", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
      jobCounts: null,
    });

    expect(() => enforceReportTarget(entitlements, 10)).toThrow(
      "Your plan allows 1-3 evaluation reports per job.",
    );
  });

  it("clamps existing targets in clamp mode", () => {
    const entitlements = deriveEntitlements({
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
      jobCounts: null,
    });

    expect(enforceReportTarget(entitlements, 10, "clamp")).toBe(3);
  });
});
