import { env } from "cloudflare:workers";
import type { Sql } from "postgres";
import { getUserById } from "@/features/auth/queries/queries_sql";
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
import { getDb } from "@/shared/db";
import { notificationPayloadSchemas } from "@/shared/notifications-config";
import { sendBatchDigestEmail } from "./email";
import { type BatchReleaseSummary, releaseBatch } from "./release";

export type PoolCheckResult =
  | { launched: true; batchId: string; candidateCount: number }
  | { launched: false; reason: string };

/** Check if a job has enough pooled candidates to launch a batch.
 * Called after every pre-evaluation completion and on a periodic schedule.
 */
export async function checkAndLaunchBatch(jobId: string): Promise<PoolCheckResult> {
  const db = getDb();

  return await db.begin(async (tx) => {
    const transaction = tx as unknown as Sql;

    const job = await getJobById(transaction, { id: jobId });
    if (!job) {
      return { launched: false, reason: "Job not found" };
    }

    // Check if there's already an active batch for this job
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

    // Launch conditions:
    // 1. Pool >= target size
    // 2. Pool >= MIN_BATCH_SIZE AND oldest queued > POOL_FORMATION_TIMEOUT
    // 3. Any candidate queued > 2 * POOL_FORMATION_TIMEOUT (don't wait forever)
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

    // Determine how many to invite (up to target)
    const inviteCount = Math.min(pool.length, targetSize);
    const candidatesToInvite = pool.slice(0, inviteCount);

    // Create the batch
    const batch = await createBatch(transaction, {
      jobId,
      targetSize: inviteCount,
    });
    if (!batch) {
      return { launched: false, reason: "Failed to create batch" };
    }

    // Create interviews and assign to batch for each candidate
    const expiresAt = new Date(Date.now() + BATCH_CONFIG.INTERVIEW_EXPIRY_MS).toISOString();

    for (const candidate of candidatesToInvite) {
      const existingInterview = await getInterviewByApplicationId(transaction, {
        applicationId: candidate.id,
      });

      const interview =
        existingInterview ??
        (await createInterview(transaction, {
          applicationId: candidate.id,
          agentId: null,
          type: "full", // Will be determined by pre-eval score
          metadata: { preEvaluationScore: candidate.preEvaluationScore ?? null, expiresAt },
          status: "pending",
          invitedAt: new Date(),
          startedAt: null,
          completedAt: null,
        }));

      if (!interview) {
        continue;
      }

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

    // Launch the batch
    await updateBatchStatus(transaction, {
      id: batch.id,
      status: "active",
    });

    // Invite all candidates simultaneously
    for (const candidate of candidatesToInvite) {
      await transaction.unsafe(
        `UPDATE applications SET status = 'interview_invited', updated_at = now() WHERE id = $1`,
        [candidate.id],
      );

      const user = await getUserById(transaction, { id: candidate.candidateId });
      if (!user) {
        continue;
      }

      const interview = await getInterviewByApplicationId(transaction, {
        applicationId: candidate.id,
      });
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
      await createNotification(transaction, {
        userId: user.id,
        type: "interview_invited",
        payload,
      });
    }

    // Trigger the batch orchestration workflow (instance ID = batch ID for easy signaling)
    try {
      await env.BATCH_ORCHESTRATION.create({
        id: batch.id,
        params: { batchId: batch.id, jobId: job.id },
      });
    } catch (error) {
      console.error(`Failed to trigger batch orchestration for batch ${batch.id}`, error);
    }

    return { launched: true, batchId: batch.id, candidateCount: inviteCount };
  });
}

/** Release a batch and dispatch the digest email if delivery is configured.
 * Used by BatchOrchestrationWorkflow as a single durable step.
 */
export async function releaseBatchAndNotify(batchId: string): Promise<BatchReleaseSummary> {
  const summary = await releaseBatch(getDb(), batchId);
  if (!summary.released || !summary.notificationId || !summary.ownerEmail) {
    return summary;
  }

  await sendBatchDigestEmail({
    notificationId: summary.notificationId,
    to: summary.ownerEmail,
    batchId,
    jobTitle: summary.jobTitle,
    reportCount: summary.reportCount,
    topScore: summary.topScore,
    topCandidateName: summary.topCandidateName,
  });

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
