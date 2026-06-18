import { describe, expect, it } from "vitest";
import { hasActiveSubscription, PLAN_CONFIGS, SUBSCRIPTION_PLANS } from "../config";

describe("hasActiveSubscription", () => {
  it("free plan is never active", () => {
    expect(hasActiveSubscription({ subscriptionPlan: "free", subscriptionStatus: "active" })).toBe(
      false,
    );
    expect(
      hasActiveSubscription({ subscriptionPlan: "free", subscriptionStatus: "trialing" }),
    ).toBe(false);
    expect(
      hasActiveSubscription({ subscriptionPlan: "free", subscriptionStatus: "inactive" }),
    ).toBe(false);
  });

  it("paid plans are active only with active or trialing status", () => {
    for (const plan of ["starter", "growth", "scale"] as const) {
      expect(hasActiveSubscription({ subscriptionPlan: plan, subscriptionStatus: "active" })).toBe(
        true,
      );
      expect(
        hasActiveSubscription({ subscriptionPlan: plan, subscriptionStatus: "trialing" }),
      ).toBe(true);
    }
  });

  it("paid plans are inactive with non-active statuses", () => {
    for (const plan of ["starter", "growth", "scale"] as const) {
      expect(
        hasActiveSubscription({ subscriptionPlan: plan, subscriptionStatus: "inactive" }),
      ).toBe(false);
      expect(
        hasActiveSubscription({ subscriptionPlan: plan, subscriptionStatus: "canceled" }),
      ).toBe(false);
      expect(
        hasActiveSubscription({ subscriptionPlan: plan, subscriptionStatus: "past_due" }),
      ).toBe(false);
      expect(hasActiveSubscription({ subscriptionPlan: plan, subscriptionStatus: "unpaid" })).toBe(
        false,
      );
      expect(hasActiveSubscription({ subscriptionPlan: plan, subscriptionStatus: "paused" })).toBe(
        false,
      );
      expect(
        hasActiveSubscription({ subscriptionPlan: plan, subscriptionStatus: "incomplete" }),
      ).toBe(false);
      expect(
        hasActiveSubscription({ subscriptionPlan: plan, subscriptionStatus: "incomplete_expired" }),
      ).toBe(false);
    }
  });

  it("handles null/undefined plan as free", () => {
    expect(hasActiveSubscription({ subscriptionPlan: null, subscriptionStatus: "active" })).toBe(
      false,
    );
    expect(
      hasActiveSubscription({ subscriptionPlan: undefined, subscriptionStatus: "active" }),
    ).toBe(false);
  });
});

describe("PLAN_CONFIGS", () => {
  it("has config for every plan", () => {
    for (const plan of SUBSCRIPTION_PLANS) {
      expect(PLAN_CONFIGS[plan]).toBeDefined();
      expect(PLAN_CONFIGS[plan].id).toBe(plan);
    }
  });

  it("starter plan is priced at $39/mo with 5 jobs and 3 reports", () => {
    expect(PLAN_CONFIGS.starter.priceLabel).toBe("$39");
    expect(PLAN_CONFIGS.starter.periodLabel).toBe("per month");
    expect(PLAN_CONFIGS.starter.includedJobs).toBe(5);
    expect(PLAN_CONFIGS.starter.includedReportsPerJob).toBe(3);
  });

  it("growth plan is priced at $99/mo with 15 jobs and 5 reports", () => {
    expect(PLAN_CONFIGS.growth.priceLabel).toBe("$99");
    expect(PLAN_CONFIGS.growth.periodLabel).toBe("per month");
    expect(PLAN_CONFIGS.growth.includedJobs).toBe(15);
    expect(PLAN_CONFIGS.growth.includedReportsPerJob).toBe(5);
  });

  it("scale plan is priced at $249/mo with 35 jobs and 10 reports", () => {
    expect(PLAN_CONFIGS.scale.priceLabel).toBe("$249");
    expect(PLAN_CONFIGS.scale.periodLabel).toBe("per month");
    expect(PLAN_CONFIGS.scale.includedJobs).toBe(35);
    expect(PLAN_CONFIGS.scale.includedReportsPerJob).toBe(10);
  });

  it("free plan is $0 with 1 job and 1 report", () => {
    expect(PLAN_CONFIGS.free.priceLabel).toBe("$0");
    expect(PLAN_CONFIGS.free.includedJobs).toBe(1);
    expect(PLAN_CONFIGS.free.includedReportsPerJob).toBe(1);
  });
});
