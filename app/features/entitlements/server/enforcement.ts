import type { Sql } from "postgres";
import { countJobsByCompanyAndStatus } from "@/features/jobs/queries/queries_sql";
import { deriveEntitlements, type Entitlements } from "../entitlements";

type CompanyForEntitlements = {
  id: string;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
};

/** Entitlements that can be enforced at a server-function boundary. */
export type CompanyEntitlement = "jobs.open" | "aiJobCreation";

/** Serialize active-job slot allocation for a company inside a transaction. */
export async function lockCompanyEntitlementScope(db: Sql, companyId: string): Promise<void> {
  await db.unsafe(`SELECT id FROM companies WHERE id = $1 FOR UPDATE`, [companyId]);
}

/**
 * Read fresh entitlements for a company from the database. This is the
 * authoritative usage snapshot — always derived from the current DB state,
 * never from cached router/loader data.
 */
export async function readCompanyEntitlements(
  db: Sql,
  company: CompanyForEntitlements,
): Promise<Entitlements> {
  const jobCounts = await countJobsByCompanyAndStatus(db, { companyId: company.id });
  return deriveEntitlements({
    subscriptionPlan: company.subscriptionPlan,
    subscriptionStatus: company.subscriptionStatus,
    jobCounts,
  });
}

/**
 * Enforce an entitlement at the server boundary. Throws a user-facing error
 * when the company is not entitled, otherwise returns the fresh entitlements
 * so callers can reuse them (e.g. to clamp report targets).
 */
export async function enforceCompanyEntitlement(
  db: Sql,
  company: CompanyForEntitlements,
  entitlement: CompanyEntitlement,
): Promise<Entitlements> {
  const entitlements = await readCompanyEntitlements(db, company);

  if (entitlement === "jobs.open" && !entitlements.jobs.canOpenAnother) {
    const limit = entitlements.jobs.active.limit;
    throw new Error(
      `Your plan includes ${limit} active job${limit === 1 ? "" : "s"}. Upgrade to post more.`,
    );
  }

  if (entitlement === "aiJobCreation" && !entitlements.aiJobCreation.enabled) {
    throw new Error(
      entitlements.aiJobCreation.disabledReason ??
        "AI job creation is not available on your current plan.",
    );
  }

  return entitlements;
}
