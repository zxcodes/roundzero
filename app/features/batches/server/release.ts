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
  getReportsByBatchId,
  releaseBatchApplications,
  releaseBatchReports,
  updateBatchStatus,
} from "@/features/batches/queries/queries_sql";
import {
  type CompanyTeamNotificationDelivery,
  notifyCompanyTeam,
} from "@/features/companies/services/company-team-notifications";
import { asSqlTransaction } from "@/shared/db-transaction";
import { notificationPayloadSchemas } from "@/shared/notifications-config";
import { clampCandidateScore } from "@/shared/score";

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
export async function releaseBatch(
  sql: Sql,
  batchId: string,
  options: { expireDueInterviews?: boolean } = {},
): Promise<BatchReleaseSummary> {
  return await sql.begin(async (tx) => {
    const transaction = asSqlTransaction(tx);

    const lockedBatch = await getBatchForUpdate(transaction, { id: batchId });
    if (!lockedBatch) {
      console.warn(`Batch not found for release: ${batchId}`);
      return { released: false, reason: "not_found" } as const;
    }

    const alreadyReleased = lockedBatch.status === "released";

    // Canonical batch order: batch -> application rows -> interview rows.
    // Stable ordering also prevents two batch-wide operations from taking the
    // same class of row locks in opposite order.
    await transaction`
      SELECT a.id
      FROM applications a
      JOIN interviews i ON i.application_id = a.id
      WHERE i.batch_id = ${batchId}
      ORDER BY a.id
      FOR UPDATE OF a
    `;
    await transaction`
      SELECT id
      FROM interviews
      WHERE batch_id = ${batchId}
      ORDER BY id
      FOR UPDATE
    `;

    if (options.expireDueInterviews && !alreadyReleased) {
      // Canonical expiry predicate, executed here without invoking orchestration
      // recursively while the batch lock is held. awaiting_voice is deliberately
      // excluded and continues reserving capacity.
      const expired = await transaction`
        UPDATE interviews
        SET status = 'expired', expired_at = now(), updated_at = now()
        WHERE batch_id = ${batchId}
          AND status IN ('pending', 'in_progress')
          AND (metadata->>'expiresAt')::timestamptz <= now()
        RETURNING application_id
      `;
      if (expired.length > 0) {
        await transaction`
          UPDATE applications
          SET status = 'pre_screening', queued_at = NULL, updated_at = now()
          WHERE id IN ${transaction(expired.map((row) => row.application_id))}
            AND status IN ('interview_invited', 'interview_in_progress')
        `;
      }
    }

    // On retry, reconstruct the same digest from released reports and the
    // stable dedupe rows rather than returning before email dispatch can retry.
    const heldReports = alreadyReleased
      ? await getReportsByBatchId(transaction, { batchId })
      : await getHeldReportsForBatch(transaction, { batchId });

    if (!alreadyReleased) {
      await releaseBatchReports(transaction, { batchId });
      await releaseBatchApplications(transaction, { batchId });
      await updateBatchStatus(transaction, { id: batchId, status: "released" });
    }

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
    const topScore = typeof topScoreRaw === "number" ? clampCandidateScore(topScoreRaw) : null;

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
      dedupeKey: `batch:${batchId}`,
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
      COUNT(*) FILTER (
        WHERE interviews.status IN ('expired', 'cancelled')
           OR (interviews.status = 'completed' AND reports.id IS NOT NULL)
      )::int AS resolved,
      COUNT(*)::int AS total
    FROM interviews
    LEFT JOIN reports ON reports.interview_id = interviews.id
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
