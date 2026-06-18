import {
  hasActiveSubscription,
  PLAN_CONFIGS,
  type SubscriptionPlan,
  subscriptionPlanSchema,
} from "@/features/billing/config";
import type { countTeamSlotsByCompanyRow } from "@/features/companies/queries/membership-queries_sql";
import type { countJobsByCompanyAndStatusRow } from "@/features/jobs/queries/queries_sql";

const ZERO_JOB_COUNTS: countJobsByCompanyAndStatusRow = {
  openCount: 0,
  draftCount: 0,
  totalCount: 0,
};

const ZERO_TEAM_COUNTS: countTeamSlotsByCompanyRow = {
  invitedMemberCount: 0,
  pendingInviteCount: 0,
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
  /** Invite slots beyond the owner — plan limits apply to added members only. */
  team: {
    /** Non-owner members currently on the team. */
    members: { used: number; limit: number; remaining: number; atLimit: boolean };
    pendingInvites: { used: number };
    slotsUsed: number;
    canInviteAnother: boolean;
  };
  aiJobCreation: { enabled: boolean; disabledReason: string | null };
};

const freeTeamLimit = PLAN_CONFIGS.free.includedTeamMembers;

export const FREE_TEAM_DEFAULTS: Entitlements["team"] = {
  members: { used: 0, limit: freeTeamLimit, remaining: freeTeamLimit, atLimit: false },
  pendingInvites: { used: 0 },
  slotsUsed: 0,
  canInviteAnother: true,
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
  teamCounts?: countTeamSlotsByCompanyRow | null;
}): Entitlements {
  const plan = normalizePlan(input.subscriptionPlan);
  const status = input.subscriptionStatus ?? "inactive";
  const planConfig = PLAN_CONFIGS[plan];
  const jobCounts = input.jobCounts ?? ZERO_JOB_COUNTS;
  const teamCounts = input.teamCounts ?? ZERO_TEAM_COUNTS;
  const isActive = hasActiveSubscription({ subscriptionPlan: plan, subscriptionStatus: status });

  const jobLimit = planConfig.includedJobs;
  const openJobs = jobCounts.openCount;
  const jobsAtLimit = openJobs >= jobLimit;

  const teamLimit = planConfig.includedTeamMembers;
  const invitedMembers = teamCounts.invitedMemberCount;
  const pendingInvites = teamCounts.pendingInviteCount;
  const teamSlotsUsed = invitedMembers + pendingInvites;
  const teamAtLimit = invitedMembers >= teamLimit;

  return {
    subscription: { plan, status, isActive },
    jobs: {
      active: {
        used: openJobs,
        limit: jobLimit,
        remaining: Math.max(0, jobLimit - openJobs),
        atLimit: jobsAtLimit,
      },
      drafts: { used: jobCounts.draftCount },
      totalUnarchived: jobCounts.totalCount,
      canOpenAnother: !jobsAtLimit,
      canCreateDraft: true,
    },
    reports: {
      perJobLimit: planConfig.includedReportsPerJob,
      defaultTarget: planConfig.includedReportsPerJob,
      minTarget: 1,
    },
    team: {
      members: {
        used: invitedMembers,
        limit: teamLimit,
        remaining: Math.max(0, teamLimit - teamSlotsUsed),
        atLimit: teamAtLimit,
      },
      pendingInvites: { used: pendingInvites },
      slotsUsed: teamSlotsUsed,
      canInviteAnother: teamSlotsUsed < teamLimit,
    },
    aiJobCreation: {
      enabled: isActive,
      disabledReason: isActive
        ? null
        : "AI job creation is available on paid plans. Upgrade to unlock this feature.",
    },
  };
}
