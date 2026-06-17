import { z } from "zod";

/**
 * Subscription plans available to companies.
 *
 * - `free`: 1 active job, no paid features.
 * - `starter`: $39/mo, 3 active jobs.
 * - `growth`: $99/mo, 10 active jobs.
 * - `scale`: $249/mo, 25 active jobs.
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
  overagePrice?: string;
  features: string[];
};

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "Try RoundZero on your next hire. No commitment.",
    priceLabel: "$0",
    periodLabel: "forever",
    includedJobs: 1,
    includedReportsPerJob: 1,
    features: [
      "1 active job",
      "1 evaluation report per job",
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
    includedJobs: 3,
    includedReportsPerJob: 3,
    overagePrice: "$12 per extra job",
    features: [
      "3 active jobs",
      "3 evaluation reports per job",
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
    includedJobs: 10,
    includedReportsPerJob: 5,
    overagePrice: "$9 per extra job",
    features: [
      "10 active jobs",
      "5 evaluation reports per job",
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
    includedJobs: 25,
    includedReportsPerJob: 10,
    overagePrice: "$7 per extra job",
    features: [
      "25 active jobs",
      "10 evaluation reports per job",
      "AI job creation",
      "AI pre-evaluation on all applicants",
      "Email support",
    ],
  },
};

/** Statuses that grant access to paid features. */
const ACTIVE_STATUSES: SubscriptionStatus[] = ["active", "trialing"];
const ACTIVE_STATUS_SET = new Set<string>(ACTIVE_STATUSES);

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
  const status = input.subscriptionStatus;
  if (!status) return false;
  return ACTIVE_STATUS_SET.has(status);
}

function normalizePlan(plan: string | null | undefined): SubscriptionPlan {
  const key = plan ?? "free";
  return SUBSCRIPTION_PLANS.find((p) => p === key) ?? "free";
}

/**
 * Returns the number of active jobs included in a plan.
 * Free plans get 1 job so a company can genuinely try the platform.
 */
export function getPlanJobLimit(plan: string | null | undefined): number {
  return PLAN_CONFIGS[normalizePlan(plan)].includedJobs;
}

/**
 * Returns the maximum number of evaluation reports that can be delivered per job.
 * This caps `finalReportTarget` on job creation/edit/AI generation.
 */
export function getPlanReportLimit(plan: string | null | undefined): number {
  return PLAN_CONFIGS[normalizePlan(plan)].includedReportsPerJob;
}
