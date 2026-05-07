import { z } from "zod";

/**
 * Subscription plans available to companies.
 *
 * - `free`: default for every new company. No paid features.
 * - `pro`: $149/mo recurring. Unlocks unlimited active jobs, custom criteria, etc.
 * - `enterprise`: contact-sales, provisioned manually.
 */
export const SUBSCRIPTION_PLANS = ["free", "pro", "enterprise"] as const;
export const subscriptionPlanSchema = z.enum(SUBSCRIPTION_PLANS);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

const SUBSCRIPTION_STATUSES = [
  "inactive",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
] as const;
const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

/** Plan-shape consumed by client UI. */
export type PlanConfig = {
  id: SubscriptionPlan;
  name: string;
  description: string;
  priceLabel: string;
  periodLabel: string;
  features: string[];
};

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    id: "free",
    name: "Starter",
    description: "Try RoundZero on your next hire. No commitment.",
    priceLabel: "$0",
    periodLabel: "forever",
    features: [
      "Up to 3 active jobs",
      "AI pre-evaluation on all applicants",
      "5 deep-evaluated reports per job",
      "Email support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For teams hiring across multiple roles.",
    priceLabel: "$149",
    periodLabel: "per month",
    features: [
      "Unlimited active jobs",
      "Reports for top fits across the funnel",
      "Custom evaluation criteria",
      "5 team seats",
      "Priority support",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "High-volume hiring with dedicated support.",
    priceLabel: "Custom",
    periodLabel: "tailored",
    features: [
      "Unlimited everything",
      "Custom evaluation criteria",
      "API & integrations",
      "Dedicated account manager",
    ],
  },
};

/** Statuses that grant access to paid features. */
const ACTIVE_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

/**
 * Returns true when the company currently has a paid plan in good standing.
 * Used everywhere we gate paid features (interviews, custom criteria, etc.).
 */
export function hasActiveSubscription(input: {
  subscriptionPlan: string | null | undefined;
  subscriptionStatus: string | null | undefined;
}): boolean {
  const plan = input.subscriptionPlan ?? "free";
  if (plan === "free") return false;
  if (plan === "enterprise") return true;
  return ACTIVE_STATUSES.includes(input.subscriptionStatus as SubscriptionStatus);
}
