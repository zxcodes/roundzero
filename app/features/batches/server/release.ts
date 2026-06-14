/** Pure DB logic for releasing a batch.
 *
 * Kept in a standalone module (no cloudflare:workers imports) so it can be
 * exercised directly from tests against the test Postgres instance.
 */
import type { Sql } from "postgres";
import {
  getBatchForUpdate,
  getCompanyOwnerForBatch,
  getHeldReportsForBatch,
  releaseBatchApplications,
  releaseBatchReports,
  updateBatchStatus,
} from "@/features/batches/queries/queries_sql";
import {
  type CompanyTeamNotificationDelivery,
  notifyCompanyTeam,
} from "@/features/companies/services/company-team-notifications";
import { notificationPayloadSchemas } from "@/shared/notifications-config";

export type BatchReleaseSummary =
  | { released: false; reason: "not_found" | "already_released" }
  | {
      released: true;
      jobId: string;
      jobTitle: string;
      reportCount: number;
      topScore: number | null;
      topCandidateName: string | null;
      notificationDeliveries: CompanyTeamNotificationDelivery[];
    };

/** Release a batch: move evaluated_held -> evaluated, set released_at, send notification.
 * Idempotent — safe to call multiple times. Returns a summary so the caller can dispatch
 * the digest email after the transaction commits.
 */
export async function releaseBatch(sql: Sql, batchId: string): Promise<BatchReleaseSummary> {
  return await sql.begin(async (tx) => {
    const transaction = tx as unknown as Sql;

    const lockedBatch = await getBatchForUpdate(transaction, { id: batchId });
    if (!lockedBatch) {
      console.warn(`Batch not found for release: ${batchId}`);
      return { released: false, reason: "not_found" } as const;
    }

    if (lockedBatch.status === "released") {
      return { released: false, reason: "already_released" } as const;
    }

    // Snapshot held reports BEFORE releasing — these are the rows that this call is releasing.
    const heldReports = await getHeldReportsForBatch(transaction, { batchId });

    await releaseBatchReports(transaction, { batchId });
    await releaseBatchApplications(transaction, { batchId });
    await updateBatchStatus(transaction, { id: batchId, status: "released" });

    const ownerInfo = await getCompanyOwnerForBatch(transaction, { id: batchId });

    if (!ownerInfo || heldReports.length === 0) {
      return {
        released: true,
        jobId: lockedBatch.jobId,
        jobTitle: ownerInfo?.jobTitle ?? "",
        reportCount: heldReports.length,
        topScore: null,
        topCandidateName: null,
        notificationDeliveries: [],
      };
    }

    const topReport = heldReports[0];
    const topCandidateName =
      typeof topReport?.candidateName === "string" ? topReport.candidateName : null;
    const topScoreRaw = topReport?.scores?.overall;
    const topScore = typeof topScoreRaw === "number" ? topScoreRaw : null;

    const payload = notificationPayloadSchemas.batch_ready.parse({
      batchId,
      jobId: ownerInfo.jobId,
      jobTitle: ownerInfo.jobTitle,
      reportCount: heldReports.length,
      topScore: topScore ?? undefined,
      topCandidateName: topCandidateName ?? undefined,
    });

    const notificationDeliveries = await notifyCompanyTeam(transaction, {
      companyId: ownerInfo.companyId,
      type: "batch_ready",
      payload,
    });

    return {
      released: true,
      jobId: ownerInfo.jobId,
      jobTitle: ownerInfo.jobTitle,
      reportCount: heldReports.length,
      topScore,
      topCandidateName,
      notificationDeliveries,
    };
  });
}

/** Check if all interviews in a batch are resolved.
 * Called by post-evaluation workflow after generating a report.
 */
export async function isBatchFullyResolved(sql: Sql, batchId: string): Promise<boolean> {
  const result = await sql
    .unsafe(
      `SELECT
      COUNT(*) FILTER (WHERE status IN ('completed', 'expired', 'cancelled'))::int AS resolved,
      COUNT(*)::int AS total
    FROM interviews
    WHERE batch_id = $1`,
      [batchId],
    )
    .values();

  if (result.length !== 1) {
    return false;
  }

  const resolved = result[0]?.[0];
  const total = result[0]?.[1];

  return (
    typeof resolved === "number" && typeof total === "number" && resolved === total && total > 0
  );
}
