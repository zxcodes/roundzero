import {
  hasActiveSubscription,
  PLAN_CONFIGS,
  type SubscriptionPlan,
  subscriptionPlanSchema,
} from "@/features/billing/config";
import type { countJobsByCompanyAndStatusRow } from "@/features/jobs/queries/queries_sql";

const ZERO_JOB_COUNTS: countJobsByCompanyAndStatusRow = {
  openCount: 0,
  draftCount: 0,
  totalCount: 0,
};

function normalizePlan(plan: string | null | undefined): SubscriptionPlan {
  const parsed = subscriptionPlanSchema.safeParse(plan ?? "free");
  return parsed.success ? parsed.data : "free";
}

/**
 * The single source of truth for what a company can do based on its plan,
 * subscription status, and current usage.
 *
 * "Active jobs" are `open` jobs only — drafts never consume a slot, so a
 * company at its limit can still draft jobs but cannot publish/open more.
 */
export type Entitlements = {
  subscription: { plan: SubscriptionPlan; status: string; isActive: boolean };
  jobs: {
    active: { used: number; limit: number; remaining: number; atLimit: boolean };
    drafts: { used: number };
    totalUnarchived: number;
    /** Can the company publish/open another job right now? */
    canOpenAnother: boolean;
    /** Drafting is always allowed, even at the active-job limit. */
    canCreateDraft: boolean;
  };
  reports: {
    perJobLimit: number;
    defaultTarget: number;
    minTarget: 1;
  };
  aiJobCreation: { enabled: boolean; disabledReason: string | null };
};

export const FREE_REPORT_DEFAULTS: Entitlements["reports"] = {
  perJobLimit: PLAN_CONFIGS.free.includedReportsPerJob,
  defaultTarget: PLAN_CONFIGS.free.includedReportsPerJob,
  minTarget: 1,
};

export function reportTargetRangeLabel(reports: Entitlements["reports"]): string {
  return `${reports.minTarget}-${reports.perJobLimit}`;
}

/** Resolve a report target to a plan-valid value, clamping when out of range. */
export function resolveReportTarget(
  entitlements: Entitlements,
  requestedTarget: number | null | undefined,
): number {
  const { perJobLimit, minTarget, defaultTarget } = entitlements.reports;
  const target = typeof requestedTarget === "number" ? requestedTarget : defaultTarget;
  return Math.max(minTarget, Math.min(target, perJobLimit));
}

export function deriveEntitlements(input: {
  subscriptionPlan: string | null | undefined;
  subscriptionStatus: string | null | undefined;
  jobCounts: countJobsByCompanyAndStatusRow | null;
}): Entitlements {
  const plan = normalizePlan(input.subscriptionPlan);
  const status = input.subscriptionStatus ?? "inactive";
  const planConfig = PLAN_CONFIGS[plan];
  const jobCounts = input.jobCounts ?? ZERO_JOB_COUNTS;
  const isActive = hasActiveSubscription({ subscriptionPlan: plan, subscriptionStatus: status });

  const limit = planConfig.includedJobs;
  const used = jobCounts.openCount;
  const atLimit = used >= limit;

  return {
    subscription: { plan, status, isActive },
    jobs: {
      active: { used, limit, remaining: Math.max(0, limit - used), atLimit },
      drafts: { used: jobCounts.draftCount },
      totalUnarchived: jobCounts.totalCount,
      canOpenAnother: !atLimit,
      canCreateDraft: true,
    },
    reports: {
      perJobLimit: planConfig.includedReportsPerJob,
      defaultTarget: planConfig.includedReportsPerJob,
      minTarget: 1,
    },
    aiJobCreation: {
      enabled: isActive,
      disabledReason: isActive
        ? null
        : "AI job creation is available on paid plans. Upgrade to unlock this feature.",
    },
  };
}
