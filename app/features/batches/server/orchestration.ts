import { env } from "cloudflare:workers";
import type { Sql } from "postgres";

import { BATCH_CONFIG } from "@/features/batches/config";
import {
  assignInterviewToBatch,
  claimQueuedApplication,
  createBatch,
  getBatchDigestNotificationDeliveries,
  getBatchInviteNotificationDeliveries,
  getFormingBatchForJob,
  getJobCapacityCounts,
  getJobCapacityForUpdate,
  getOldestQueuedAtForJob,
  getPoolCandidatesForJob,
  updateBatchStatus,
} from "@/features/batches/queries/queries_sql";
import {
  createInterview,
  getInterviewByApplicationId,
  getInterviewContextById,
} from "@/features/interviews/queries/queries_sql";
import { ensureInterviewRuntimeMetadata } from "@/features/interviews/shared/runtime";
import { createDedupedNotification } from "@/features/notifications/queries/queries_sql";
import {
  deliverNotificationEmail,
  sendNotificationEmail,
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

    const job = await getJobCapacityForUpdate(transaction, { id: jobId });
    if (!job) {
      return { launched: false, reason: "Job not found" };
    }

    const activeBatch = await getFormingBatchForJob(transaction, { jobId });
    if (activeBatch) {
      return { launched: false, reason: `Batch already forming:${activeBatch.id}` };
    }

    if (
      job.status !== "open" ||
      job.archivedAt !== null ||
      (job.expiresAt !== null && job.expiresAt <= new Date())
    ) {
      return { launched: false, reason: "Job is not accepting new interviews" };
    }

    const counts = await getJobCapacityCounts(transaction, { jobId });
    const remaining = Math.max(
      0,
      (job.finalReportTarget ?? 0) - (counts?.deliveredCount ?? 0) - (counts?.reservedCount ?? 0),
    );
    if (remaining === 0) {
      return { launched: false, reason: "No remaining report capacity" };
    }

    const pool = await getPoolCandidatesForJob(transaction, { jobId });
    if (pool.length === 0) {
      return { launched: false, reason: "Pool is empty" };
    }

    const targetSize = Math.min(remaining, BATCH_CONFIG.DEFAULT_TARGET_SIZE);

    const oldest = await getOldestQueuedAtForJob(transaction, { jobId });
    const oldestQueuedMs = oldest?.oldestQueuedAt
      ? Date.now() - new Date(oldest.oldestQueuedAt).getTime()
      : 0;
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

    const inviteCount = Math.min(pool.length, remaining, BATCH_CONFIG.DEFAULT_TARGET_SIZE);
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
      const claimed = await claimQueuedApplication(transaction, {
        id: candidate.id,
        jobId,
      });
      if (!claimed) {
        throw new Error(`Failed to claim queued application ${candidate.id}`);
      }

      const existingInterview = await getInterviewByApplicationId(transaction, {
        applicationId: candidate.id,
      });

      if (existingInterview) {
        throw new Error(`Queued application ${candidate.id} already has an interview`);
      }

      const interview = await createInterview(transaction, {
        applicationId: candidate.id,
        agentId: null,
        type: "full",
        metadata: { expiresAt },
        status: "pending",
        invitedAt: new Date(),
        startedAt: null,
        completedAt: null,
      });

      if (!interview) {
        throw new Error(`Failed to create interview for application ${candidate.id}`);
      }

      interviews.set(candidate.id, { id: interview.id, type: interview.type });

      const interviewContext = await getInterviewContextById(transaction, {
        id: interview.id,
      });
      if (interviewContext) {
        await ensureInterviewRuntimeMetadata(transaction, interviewContext);
      }

      const assigned = await assignInterviewToBatch(transaction, {
        id: interview.id,
        batchId: batch.id,
      });
      if (!assigned) {
        throw new Error(`Failed to assign interview ${interview.id} to batch`);
      }
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
      const notification = await createDedupedNotification(transaction, {
        userId: user.id,
        type: "interview_invited",
        payload,
        dedupeKey: `interview:${interview.id}`,
      });

      if (notification) {
        pendingEmails.push({
          notification,
          recipient: user.email ? { email: user.email } : null,
        });
      }
    }

    return { launched: true, batchId: batch.id, candidateCount: inviteCount };
  });

  let workflowStartupError: unknown = null;
  let batchId: string | null = null;
  if (result.launched) {
    batchId = result.batchId;
    try {
      const instance = await env.BATCH_ORCHESTRATION.create({
        id: result.batchId,
        params: { batchId: result.batchId, jobId },
      });
      disposeRpcResource(instance);
    } catch (error) {
      workflowStartupError = error;
    }
  } else if (result.reason.startsWith("Batch already forming:")) {
    batchId = result.reason.slice("Batch already forming:".length);
    try {
      const existing = await env.BATCH_ORCHESTRATION.get(batchId);
      try {
        const status = await existing.status();
        try {
          if (
            status.status === "errored" ||
            status.status === "terminated" ||
            status.status === "complete" ||
            status.status === "unknown"
          ) {
            await existing.restart();
          }
          // queued/running/waiting/paused/waitingForPause instances are healthy.
          // A terminal workflow paired with an active DB batch is inconsistent,
          // so restart its idempotent release flow.
        } finally {
          disposeRpcResource(status);
        }
      } finally {
        disposeRpcResource(existing);
      }
    } catch {
      const repaired = await env.BATCH_ORCHESTRATION.create({
        id: batchId,
        params: { batchId, jobId },
      });
      disposeRpcResource(repaired);
    }
  }

  if (batchId) {
    const deliveries = result.launched
      ? pendingEmails
      : (await getBatchInviteNotificationDeliveries(db, { batchId })).map((delivery) => ({
          notification: delivery,
          recipient: delivery.email ? { email: delivery.email } : null,
        }));
    for (const pending of deliveries) {
      await deliverNotificationEmail(db, {
        notification: pending.notification,
        recipient: pending.recipient,
        sendEmail: sendNotificationEmail,
      });
    }
  }

  if (workflowStartupError) {
    throw workflowStartupError;
  }

  return result;
}

/** Durably reconcile batch release state and notification rows. */
export async function reconcileBatchRelease(
  batchId: string,
  options: { expireDueInterviews?: boolean } = {},
): Promise<BatchReleaseSummary> {
  return releaseBatch(getDb(), batchId, options);
}

/** Dispatch/retry digest emails from durable notification and report state. */
export async function dispatchBatchDigest(batchId: string): Promise<void> {
  const deliveries = await getBatchDigestNotificationDeliveries(getDb(), { batchId });
  const failures: unknown[] = [];
  for (const delivery of deliveries) {
    try {
      await sendBatchDigestEmail({
        notificationId: delivery.notificationId,
        to: delivery.email,
        batchId,
        jobTitle: delivery.jobTitle,
        reportCount: delivery.reportCount,
        topScore: delivery.topScore,
        topCandidateName: delivery.topCandidateName,
      });
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, "One or more batch digest emails failed");
  }
}

/** After a batch releases, check if there's enough in the pool to launch the next batch.
 * Called by BatchOrchestrationWorkflow after release.
 */
export async function maybeLaunchNextBatch(jobId: string): Promise<PoolCheckResult> {
  return checkAndLaunchBatch(jobId);
}
