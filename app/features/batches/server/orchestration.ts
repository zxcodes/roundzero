import { env } from "cloudflare:workers";
import type { Sql } from "postgres";
import { BATCH_CONFIG } from "@/features/batches/config";
import {
  assignInterviewToBatch,
  createBatch,
  getFormingBatchForJob,
  getPoolCandidatesForJob,
  updateBatchStatus,
} from "@/features/batches/queries/queries_sql";
import {
  createInterview,
  getInterviewByApplicationId,
  getInterviewContextById,
} from "@/features/interviews/queries/queries_sql";
import { ensureInterviewRuntimeMetadata } from "@/features/interviews/shared/runtime";
import { getJobById } from "@/features/jobs/queries/queries_sql";
import { createNotification } from "@/features/notifications/queries/queries_sql";
import {
  deliverNotificationEmail,
  sendNotificationEmailViaResend,
} from "@/features/notifications/services/email";
import { getDb } from "@/shared/db";
import { notificationPayloadSchemas } from "@/shared/notifications-config";
import { disposeRpcResource } from "@/shared/workflow-rpc";
import { sendBatchDigestEmail } from "./email";
import { type BatchReleaseSummary, releaseBatch } from "./release";

export type PoolCheckResult =
  | { launched: true; batchId: string; candidateCount: number }
  | { launched: false; reason: string };

type PendingInviteEmail = {
  notification: { id: string; type: string; payload: unknown };
  recipient: { email: string } | null;
};

/** Check if a job has enough pooled candidates to launch a batch.
 * Called after every pre-evaluation completion and on a periodic schedule.
 */
export async function checkAndLaunchBatch(jobId: string): Promise<PoolCheckResult> {
  const db = getDb();
  const pendingEmails: PendingInviteEmail[] = [];

  const result: PoolCheckResult = await db.begin(async (tx) => {
    const transaction = tx as unknown as Sql;

    const job = await getJobById(transaction, { id: jobId });
    if (!job) {
      return { launched: false, reason: "Job not found" };
    }

    const activeBatch = await getFormingBatchForJob(transaction, { jobId });
    if (activeBatch) {
      return { launched: false, reason: "Batch already forming" };
    }

    const pool = await getPoolCandidatesForJob(transaction, { jobId });
    if (pool.length === 0) {
      return { launched: false, reason: "Pool is empty" };
    }

    const targetSize =
      typeof job.finalReportTarget === "number"
        ? Math.min(job.finalReportTarget, BATCH_CONFIG.DEFAULT_TARGET_SIZE)
        : BATCH_CONFIG.DEFAULT_TARGET_SIZE;

    const oldestQueuedMs = pool.length > 0 ? Date.now() - new Date(pool[0].createdAt).getTime() : 0;
    const poolFormationTimeout = BATCH_CONFIG.POOL_FORMATION_TIMEOUT_MS;

    const shouldLaunch =
      pool.length >= targetSize ||
      (pool.length >= BATCH_CONFIG.MIN_BATCH_SIZE && oldestQueuedMs > poolFormationTimeout) ||
      (pool.length >= 1 && oldestQueuedMs > 2 * poolFormationTimeout);

    if (!shouldLaunch) {
      return {
        launched: false,
        reason: `Pool has ${pool.length} candidates, need ${targetSize} or ${BATCH_CONFIG.MIN_BATCH_SIZE} + timeout`,
      };
    }

    const inviteCount = Math.min(pool.length, targetSize);
    const candidatesToInvite = pool.slice(0, inviteCount);

    const batch = await createBatch(transaction, {
      jobId,
      targetSize: inviteCount,
    });
    if (!batch) {
      return { launched: false, reason: "Failed to create batch" };
    }

    const expiresAt = new Date(Date.now() + BATCH_CONFIG.INTERVIEW_EXPIRY_MS).toISOString();

    const interviews: Map<string, { id: string; type: string }> = new Map();

    for (const candidate of candidatesToInvite) {
      const existingInterview = await getInterviewByApplicationId(transaction, {
        applicationId: candidate.id,
      });

      const interview =
        existingInterview ??
        (await createInterview(transaction, {
          applicationId: candidate.id,
          agentId: null,
          type: "full",
          metadata: { preEvaluationScore: candidate.preEvaluationScore ?? null, expiresAt },
          status: "pending",
          invitedAt: new Date(),
          startedAt: null,
          completedAt: null,
        }));

      if (!interview) {
        continue;
      }

      interviews.set(candidate.id, { id: interview.id, type: interview.type });

      const interviewContext = await getInterviewContextById(transaction, {
        id: interview.id,
      });
      if (interviewContext) {
        await ensureInterviewRuntimeMetadata(transaction, interviewContext);
      }

      await assignInterviewToBatch(transaction, {
        id: interview.id,
        batchId: batch.id,
      });
    }

    await updateBatchStatus(transaction, {
      id: batch.id,
      status: "active",
    });

    const candidateIds = candidatesToInvite.map((c) => c.candidateId);
    const users =
      candidateIds.length > 0
        ? await transaction.unsafe<Array<{ id: string; email: string | null }>>(
            `SELECT id, email FROM users WHERE id = ANY($1::uuid[])`,
            [candidateIds],
          )
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    for (const candidate of candidatesToInvite) {
      await transaction.unsafe(
        `UPDATE applications SET status = 'interview_invited', updated_at = now() WHERE id = $1`,
        [candidate.id],
      );

      const user = userMap.get(candidate.candidateId) ?? null;
      if (!user) {
        continue;
      }

      const interview = interviews.get(candidate.id);
      if (!interview) {
        continue;
      }

      const payload = notificationPayloadSchemas.interview_invited.parse({
        applicationId: candidate.id,
        interviewId: interview.id,
        jobId: job.id,
        jobTitle: job.title,
        interviewType: interview.type,
        expiresAt,
      });
      const notification = await createNotification(transaction, {
        userId: user.id,
        type: "interview_invited",
        payload,
      });

      if (notification) {
        pendingEmails.push({
          notification,
          recipient: user.email ? { email: user.email } : null,
        });
      }
    }

    try {
      const instance = await env.BATCH_ORCHESTRATION.create({
        id: batch.id,
        params: { batchId: batch.id, jobId: job.id },
      });
      disposeRpcResource(instance);
    } catch (error) {
      console.error(`Failed to trigger batch orchestration for batch ${batch.id}`, error);
    }

    return { launched: true, batchId: batch.id, candidateCount: inviteCount };
  });

  if (result.launched) {
    for (const pending of pendingEmails) {
      await deliverNotificationEmail(db, {
        notification: pending.notification,
        recipient: pending.recipient,
        sendEmail: sendNotificationEmailViaResend,
      });
    }
  }

  return result;
}

/** Release a batch and dispatch the digest email if delivery is configured.
 * Used by BatchOrchestrationWorkflow as a single durable step.
 */
export async function releaseBatchAndNotify(batchId: string): Promise<BatchReleaseSummary> {
  const summary = await releaseBatch(getDb(), batchId);
  if (!summary.released || summary.notificationDeliveries.length === 0) {
    return summary;
  }

  for (const delivery of summary.notificationDeliveries) {
    await sendBatchDigestEmail({
      notificationId: delivery.notification.id,
      to: delivery.email,
      batchId,
      jobTitle: summary.jobTitle,
      reportCount: summary.reportCount,
      topScore: summary.topScore,
      topCandidateName: summary.topCandidateName,
    });
  }

  return summary;
}

/** After a batch releases, check if there's enough in the pool to launch the next batch.
 * Called by BatchOrchestrationWorkflow after release.
 */
export async function maybeLaunchNextBatch(jobId: string): Promise<PoolCheckResult> {
  const db = getDb();

  const pool = await getPoolCandidatesForJob(db, { jobId });
  if (pool.length >= BATCH_CONFIG.BACKFILL_THRESHOLD) {
    return checkAndLaunchBatch(jobId);
  }

  return {
    launched: false,
    reason: `Pool has ${pool.length}, need ${BATCH_CONFIG.BACKFILL_THRESHOLD}`,
  };
}
