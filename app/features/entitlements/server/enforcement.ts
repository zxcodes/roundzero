import type { Sql } from "postgres";
import { countTeamSlotsByCompany } from "@/features/companies/queries/membership-queries_sql";
import { getCompanyById } from "@/features/companies/queries/queries_sql";
import { countJobsByCompanyAndStatus } from "@/features/jobs/queries/queries_sql";
import { deriveEntitlements, type Entitlements, resolveReportTarget } from "../entitlements";

/** Entitlements that can be enforced at a server-function boundary. */
export type CompanyEntitlement = "jobs.open" | "team.invite" | "team.accept" | "aiJobCreation";

/** Serialize active-job slot allocation for a company inside a transaction. */
export async function lockCompanyEntitlementScope(db: Sql, companyId: string): Promise<void> {
  await db.unsafe(`SELECT id FROM companies WHERE id = $1 FOR UPDATE`, [companyId]);
}

/**
 * Read fresh entitlements for a company from the database. This is the
 * authoritative usage snapshot — always derived from the current DB state,
 * never from cached router/loader data.
 */
export async function readCompanyEntitlements(db: Sql, companyId: string): Promise<Entitlements> {
  const company = await getCompanyById(db, { id: companyId });
  if (!company) {
    throw new Error("Company not found");
  }

  const [jobCounts, teamCounts] = await Promise.all([
    countJobsByCompanyAndStatus(db, { companyId }),
    countTeamSlotsByCompany(db, { companyId }),
  ]);
  return deriveEntitlements({
    subscriptionPlan: company.subscriptionPlan,
    subscriptionStatus: company.subscriptionStatus,
    jobCounts,
    teamCounts,
  });
}

/**
 * Enforce an entitlement at the server boundary. Throws a user-facing error
 * when the company is not entitled, otherwise returns the fresh entitlements
 * so callers can reuse them (e.g. to clamp report targets).
 */
export async function enforceCompanyEntitlement(
  db: Sql,
  companyId: string,
  entitlement: CompanyEntitlement,
): Promise<Entitlements> {
  const entitlements = await readCompanyEntitlements(db, companyId);

  if (entitlement === "jobs.open" && !entitlements.jobs.canOpenAnother) {
    const limit = entitlements.jobs.active.limit;
    throw new Error(
      `Your plan includes ${limit} active job${limit === 1 ? "" : "s"}. Upgrade to post more.`,
    );
  }

  if (entitlement === "team.invite" && !entitlements.team.canInviteAnother) {
    const limit = entitlements.team.members.limit;
    throw new Error(
      `Your plan includes ${limit} team member${limit === 1 ? "" : "s"}. Upgrade to invite more.`,
    );
  }

  if (entitlement === "team.accept" && entitlements.team.members.atLimit) {
    throw new Error("This team has reached its member limit. Ask the owner to upgrade the plan.");
  }

  if (entitlement === "aiJobCreation" && !entitlements.aiJobCreation.enabled) {
    throw new Error(
      entitlements.aiJobCreation.disabledReason ??
        "AI job creation is not available on your current plan.",
    );
  }

  return entitlements;
}

type ReportTargetMode = "strict" | "clamp";

/**
 * Enforce report-target entitlement at the server boundary.
 *
 * - `strict` — rejects explicit values outside the plan range (user-submitted targets).
 * - `clamp` — silently fits existing values to the plan (e.g. publish after a downgrade).
 */
export function enforceReportTarget(
  entitlements: Entitlements,
  requestedTarget: number | null | undefined,
  mode: ReportTargetMode = "strict",
): number {
  const resolved = resolveReportTarget(entitlements, requestedTarget);
  if (mode === "clamp") return resolved;

  if (requestedTarget != null && resolved !== requestedTarget) {
    const { minTarget, perJobLimit } = entitlements.reports;
    throw new Error(
      `Your plan allows ${minTarget}-${perJobLimit} evaluation report${perJobLimit === 1 ? "" : "s"} per job.`,
    );
  }

  return resolved;
}
