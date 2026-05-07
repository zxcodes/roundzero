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

  it("enterprise plan is always active regardless of status", () => {
    expect(
      hasActiveSubscription({ subscriptionPlan: "enterprise", subscriptionStatus: "active" }),
    ).toBe(true);
    expect(
      hasActiveSubscription({ subscriptionPlan: "enterprise", subscriptionStatus: "canceled" }),
    ).toBe(true);
    expect(
      hasActiveSubscription({ subscriptionPlan: "enterprise", subscriptionStatus: "past_due" }),
    ).toBe(true);
  });

  it("pro plan is active only with active or trialing status", () => {
    expect(hasActiveSubscription({ subscriptionPlan: "pro", subscriptionStatus: "active" })).toBe(
      true,
    );
    expect(hasActiveSubscription({ subscriptionPlan: "pro", subscriptionStatus: "trialing" })).toBe(
      true,
    );
  });

  it("pro plan is inactive with non-active statuses", () => {
    expect(hasActiveSubscription({ subscriptionPlan: "pro", subscriptionStatus: "inactive" })).toBe(
      false,
    );
    expect(hasActiveSubscription({ subscriptionPlan: "pro", subscriptionStatus: "canceled" })).toBe(
      false,
    );
    expect(hasActiveSubscription({ subscriptionPlan: "pro", subscriptionStatus: "past_due" })).toBe(
      false,
    );
    expect(hasActiveSubscription({ subscriptionPlan: "pro", subscriptionStatus: "unpaid" })).toBe(
      false,
    );
    expect(hasActiveSubscription({ subscriptionPlan: "pro", subscriptionStatus: "paused" })).toBe(
      false,
    );
    expect(
      hasActiveSubscription({ subscriptionPlan: "pro", subscriptionStatus: "incomplete" }),
    ).toBe(false);
    expect(
      hasActiveSubscription({ subscriptionPlan: "pro", subscriptionStatus: "incomplete_expired" }),
    ).toBe(false);
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

  it("pro plan is priced at $149/mo", () => {
    expect(PLAN_CONFIGS.pro.priceLabel).toBe("$149");
    expect(PLAN_CONFIGS.pro.periodLabel).toBe("per month");
  });

  it("free plan is $0", () => {
    expect(PLAN_CONFIGS.free.priceLabel).toBe("$0");
  });

  it("enterprise plan shows custom pricing", () => {
    expect(PLAN_CONFIGS.enterprise.priceLabel).toBe("Custom");
  });
});
