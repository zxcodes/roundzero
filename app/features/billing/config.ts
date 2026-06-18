import { z } from "zod";

/**
 * Subscription plans available to companies.
 *
 * - `free`: 1 active job, no paid features.
 * - `starter`: $39/mo, 5 active jobs.
 * - `growth`: $99/mo, 15 active jobs.
 * - `scale`: $249/mo, 35 active jobs.
 */
export const SUBSCRIPTION_PLANS = ["free", "starter", "growth", "scale"] as const;
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
  includedJobs: number;
  includedReportsPerJob: number;
  /** Teammates the company can invite beyond the owner. */
  includedTeamMembers: number;
  features: string[];
};

/** Marketing copy: invited teammates in addition to the account owner. */
export function teamMemberFeatureLabel(count: number): string {
  return count === 1 ? "1 teammate (+ you)" : `${count} teammates (+ you)`;
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "Try RoundZero on your next hire. No commitment.",
    priceLabel: "$0",
    periodLabel: "forever",
    includedJobs: 1,
    includedReportsPerJob: 1,
    includedTeamMembers: 1,
    features: [
      "1 active job",
      "1 evaluation report per job",
      teamMemberFeatureLabel(1),
      "AI pre-evaluation on all applicants",
      "Email support",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For small teams hiring occasionally.",
    priceLabel: "$39",
    periodLabel: "per month",
    includedJobs: 5,
    includedReportsPerJob: 3,
    includedTeamMembers: 2,
    features: [
      "5 active jobs",
      "3 evaluation reports per job",
      teamMemberFeatureLabel(2),
      "AI job creation",
      "AI pre-evaluation on all applicants",
      "Email support",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    description: "For teams hiring across multiple roles.",
    priceLabel: "$99",
    periodLabel: "per month",
    includedJobs: 15,
    includedReportsPerJob: 5,
    includedTeamMembers: 4,
    features: [
      "15 active jobs",
      "5 evaluation reports per job",
      teamMemberFeatureLabel(4),
      "AI job creation",
      "AI pre-evaluation on all applicants",
      "Email support",
    ],
  },
  scale: {
    id: "scale",
    name: "Scale",
    description: "High-volume hiring with predictable pricing.",
    priceLabel: "$249",
    periodLabel: "per month",
    includedJobs: 35,
    includedReportsPerJob: 10,
    includedTeamMembers: 10,
    features: [
      "35 active jobs",
      "10 evaluation reports per job",
      teamMemberFeatureLabel(10),
      "AI job creation",
      "AI pre-evaluation on all applicants",
      "Email support",
    ],
  },
};

/** Statuses that grant access to paid features. */
const ACTIVE_STATUSES: SubscriptionStatus[] = ["active", "trialing"];
const ACTIVE_STATUS_SET = new Set<string>(ACTIVE_STATUSES);

/** Returns true when the company has a paid plan in good standing (active or trialing). */
export function hasActiveSubscription(input: {
  subscriptionPlan: string | null | undefined;
  subscriptionStatus: string | null | undefined;
}): boolean {
  const plan = input.subscriptionPlan ?? "free";
  if (plan === "free") return false;
  const status = input.subscriptionStatus;
  if (!status) return false;
  return ACTIVE_STATUS_SET.has(status);
}
