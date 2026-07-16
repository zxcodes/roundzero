import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BATCH_CONFIG } from "@/features/batches/config";
import { checkAndLaunchBatch, maybeLaunchNextBatch } from "@/features/batches/server/orchestration";
import { sendNotificationEmail } from "@/features/notifications/services/email";
import {
  createTestDbConnection,
  getTestDb,
  makeTestResumeKey,
  seedCompany,
  seedJob,
  seedUser,
  waitForBlockedQueryCount,
} from "@/shared/__tests__/test-utils";

vi.mock("agents", () => ({
  getAgentByName: vi.fn().mockReturnValue({
    initializeContext: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/features/notifications/services/email", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/features/notifications/services/email")>();
  return {
    ...mod,
    sendNotificationEmail: vi.fn().mockResolvedValue({
      providerMessageId: "mock-id",
    }),
  };
});

const sql = getTestDb();
const workflowBinding = env.BATCH_ORCHESTRATION as unknown as {
  create: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  workflowBinding.create = vi.fn().mockResolvedValue(undefined);
  workflowBinding.get = vi.fn().mockRejectedValue(new Error("Workflow not found"));
  vi.mocked(sendNotificationEmail).mockClear();
});

async function seedQueuedCandidate(jobId: string, createdAt?: Date) {
  const user = await seedUser({ role: "candidate" });
  const ts = createdAt ?? new Date();
  const [app] = await sql`
    INSERT INTO applications (
      job_id, candidate_id, resume_key, status, queued_at, created_at, updated_at
    )
    VALUES (
      ${jobId}, ${user.id}, ${makeTestResumeKey(user.id)},
      'queued_for_batch', ${ts}, ${ts}, ${ts}
    )
    RETURNING id
  `;
  return { userId: user.id, applicationId: app!.id as string };
}

async function seedInterviewCandidate(jobId: string, status: "pending" | "completed") {
  const user = await seedUser({ role: "candidate" });
  const [application] = await sql`
    INSERT INTO applications (job_id, candidate_id, resume_key, status)
    VALUES (
      ${jobId}, ${user.id}, ${makeTestResumeKey(user.id)},
      ${status === "completed" ? "evaluated" : "interview_invited"}
    )
    RETURNING id
  `;
  const [interview] = await sql`
    INSERT INTO interviews (application_id, type, status, completed_at)
    VALUES (
      ${application!.id}, 'full', ${status},
      ${status === "completed" ? new Date() : null}
    )
    RETURNING id
  `;
  return { applicationId: application!.id as string, interviewId: interview!.id as string };
}

async function setJobTarget(jobId: string, target: number) {
  await sql`UPDATE jobs SET final_report_target = ${target} WHERE id = ${jobId}`;
}

// ─── Pool formation tests ──────────────────────────────────────

describe("checkAndLaunchBatch", () => {
  it("does not launch when pool is empty", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 5);

    const result = await checkAndLaunchBatch(job.id);

    expect(result.launched).toBe(false);
    if (!result.launched) {
      expect(result.reason).toContain("empty");
    }
  });

  it("does not launch when pool < MIN_BATCH_SIZE and not timed out", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 5);

    await seedQueuedCandidate(job.id);
    await seedQueuedCandidate(job.id);

    const result = await checkAndLaunchBatch(job.id);

    expect(result.launched).toBe(false);
    if (!result.launched) {
      expect(result.reason).toContain("need");
    }
  });

  it("launches when pool >= DEFAULT_TARGET_SIZE", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 5);

    for (let i = 0; i < BATCH_CONFIG.DEFAULT_TARGET_SIZE; i++) {
      await seedQueuedCandidate(job.id);
    }

    const result = await checkAndLaunchBatch(job.id);

    expect(result.launched).toBe(true);
    if (result.launched) {
      expect(result.candidateCount).toBe(BATCH_CONFIG.DEFAULT_TARGET_SIZE);
    }

    const [batch] = await sql`SELECT status FROM job_batches WHERE job_id = ${job.id}`;
    expect(batch?.status).toBe("active");
  });

  it("caps a launch at the job report target and leaves overflow waitlisted", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 3);
    for (let index = 0; index < 5; index++) {
      await seedQueuedCandidate(job.id);
    }

    const result = await checkAndLaunchBatch(job.id);

    expect(result).toMatchObject({ launched: true, candidateCount: 3 });
    const [counts] = await sql`
      SELECT
        count(*) FILTER (WHERE status = 'interview_invited')::int AS invited,
        count(*) FILTER (WHERE status = 'queued_for_batch')::int AS waitlisted
      FROM applications
      WHERE job_id = ${job.id}
    `;
    expect(counts).toMatchObject({ invited: 3, waitlisted: 2 });
  });

  it("uses only remaining capacity after delivered and reserved reports", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 3);
    const delivered = await seedInterviewCandidate(job.id, "completed");
    await sql`
      INSERT INTO reports (interview_id, application_id, summary, scores, recommendation, released_at)
      VALUES (
        ${delivered.interviewId}, ${delivered.applicationId}, 'Delivered',
        '{}'::jsonb, 'yes', now()
      )
    `;
    await seedInterviewCandidate(job.id, "pending");
    await seedQueuedCandidate(job.id);
    await seedQueuedCandidate(job.id);

    const result = await checkAndLaunchBatch(job.id);

    expect(result).toMatchObject({ launched: true, candidateCount: 1 });
    const [waiting] = await sql`
      SELECT count(*)::int AS count FROM applications
      WHERE job_id = ${job.id} AND status = 'queued_for_batch'
    `;
    expect(waiting?.count).toBe(1);
  });

  it("does not consume the waitlist when delivered and reserved reports fill the target", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 2);
    await seedInterviewCandidate(job.id, "pending");
    await seedInterviewCandidate(job.id, "pending");
    const queued = await seedQueuedCandidate(job.id);

    const result = await checkAndLaunchBatch(job.id);

    expect(result).toEqual({ launched: false, reason: "No remaining report capacity" });
    const [application] = await sql`
      SELECT status FROM applications WHERE id = ${queued.applicationId}
    `;
    expect(application?.status).toBe("queued_for_batch");
  });

  it.each(["closed", "archived", "expired"])("does not launch for a %s job", async (condition) => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 1);
    await seedQueuedCandidate(job.id);
    if (condition === "closed") {
      await sql`UPDATE jobs SET status = 'closed' WHERE id = ${job.id}`;
    } else if (condition === "archived") {
      await sql`UPDATE jobs SET archived_at = now() WHERE id = ${job.id}`;
    } else {
      await sql`UPDATE jobs SET expires_at = now() - interval '1 minute' WHERE id = ${job.id}`;
    }

    const result = await checkAndLaunchBatch(job.id);

    expect(result).toEqual({ launched: false, reason: "Job is not accepting new interviews" });
    const [counts] = await sql`
      SELECT
        count(*) FILTER (WHERE status = 'queued_for_batch')::int AS waitlisted,
        (SELECT count(*)::int FROM job_batches WHERE job_id = ${job.id}) AS batches
      FROM applications
      WHERE job_id = ${job.id}
    `;
    expect(counts).toMatchObject({ waitlisted: 1, batches: 0 });
  });

  it("launches a waitlisted candidate after the target increases", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 0);
    await seedQueuedCandidate(job.id);

    expect(await checkAndLaunchBatch(job.id)).toEqual({
      launched: false,
      reason: "No remaining report capacity",
    });
    await setJobTarget(job.id, 1);

    expect(await checkAndLaunchBatch(job.id)).toMatchObject({
      launched: true,
      candidateCount: 1,
    });
  });

  it("does not launch when a batch is already forming for the job", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 5);

    for (let i = 0; i < BATCH_CONFIG.DEFAULT_TARGET_SIZE; i++) {
      await seedQueuedCandidate(job.id);
    }

    const first = await checkAndLaunchBatch(job.id);
    expect(first.launched).toBe(true);

    // Add more candidates to the pool after first batch launched
    for (let i = 0; i < BATCH_CONFIG.DEFAULT_TARGET_SIZE; i++) {
      await seedQueuedCandidate(job.id);
    }

    const second = await checkAndLaunchBatch(job.id);
    expect(second.launched).toBe(false);
    if (!second.launched) {
      expect(second.reason).toContain("already forming");
    }
  });

  it("restarts a completed workflow when its database batch is still active", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    const [batch] = await sql`
      INSERT INTO job_batches (job_id, status, target_size)
      VALUES (${job.id}, 'active', 1)
      RETURNING id
    `;
    const restart = vi.fn().mockResolvedValue(undefined);
    workflowBinding.get = vi.fn().mockResolvedValue({
      status: vi.fn().mockResolvedValue({ status: "complete" }),
      restart,
    });

    const result = await checkAndLaunchBatch(job.id);

    expect(result).toEqual({
      launched: false,
      reason: `Batch already forming:${batch!.id}`,
    });
    expect(restart).toHaveBeenCalledOnce();
  });

  it("recreates a missing workflow for an active batch even when the pool is empty", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    const [batch] = await sql`
      INSERT INTO job_batches (job_id, status, target_size)
      VALUES (${job.id}, 'active', 1)
      RETURNING id
    `;

    const result = await checkAndLaunchBatch(job.id);

    expect(result.launched).toBe(false);
    expect(workflowBinding.create).toHaveBeenCalledWith({
      id: batch!.id,
      params: { batchId: batch!.id, jobId: job.id },
    });
  });

  it("attempts durable invite delivery before surfacing workflow startup failure", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, BATCH_CONFIG.DEFAULT_TARGET_SIZE);
    for (let index = 0; index < BATCH_CONFIG.DEFAULT_TARGET_SIZE; index++) {
      await seedQueuedCandidate(job.id);
    }
    workflowBinding.create = vi.fn().mockRejectedValue(new Error("Workflow unavailable"));

    await expect(checkAndLaunchBatch(job.id)).rejects.toThrow("Workflow unavailable");

    expect(sendNotificationEmail).toHaveBeenCalledTimes(BATCH_CONFIG.DEFAULT_TARGET_SIZE);
  });

  it("serializes concurrent launch calls into one invite set", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, BATCH_CONFIG.DEFAULT_TARGET_SIZE);
    for (let i = 0; i < BATCH_CONFIG.DEFAULT_TARGET_SIZE; i++) {
      await seedQueuedCandidate(job.id);
    }

    const blocker = createTestDbConnection();
    let releaseJobLock = () => {};
    let markJobLockHeld = () => {};
    const holdJobLock = new Promise<void>((resolve) => {
      releaseJobLock = resolve;
    });
    const jobLockHeld = new Promise<void>((resolve) => {
      markJobLockHeld = resolve;
    });
    const blockerTask = blocker.begin(async (tx) => {
      await tx`SELECT id FROM jobs WHERE id = ${job.id} FOR UPDATE`;
      markJobLockHeld();
      await holdJobLock;
    });

    await jobLockHeld;
    const launches = [
      checkAndLaunchBatch(job.id),
      checkAndLaunchBatch(job.id),
      checkAndLaunchBatch(job.id),
    ];
    try {
      await waitForBlockedQueryCount(sql, {
        minimum: 3,
        queryPattern: "%FROM jobs%FOR UPDATE%",
      });
    } finally {
      releaseJobLock();
      await blockerTask;
      await blocker.end();
    }
    const results = await Promise.all(launches);

    expect(results.filter((result) => result.launched)).toHaveLength(1);
    const [counts] = await sql`
      SELECT
        count(DISTINCT b.id)::int AS batches,
        count(DISTINCT i.id)::int AS interviews
      FROM job_batches b
      LEFT JOIN interviews i ON i.batch_id = b.id
      WHERE b.job_id = ${job.id}
    `;
    expect(counts?.batches).toBe(1);
    expect(counts?.interviews).toBe(BATCH_CONFIG.DEFAULT_TARGET_SIZE);
    const [notificationCount] = await sql`
      SELECT count(*)::int AS count
      FROM notifications
      WHERE type = 'interview_invited'
    `;
    expect(notificationCount?.count).toBe(BATCH_CONFIG.DEFAULT_TARGET_SIZE);
  });

  it("launches when pool >= MIN_BATCH_SIZE and oldest queued > POOL_FORMATION_TIMEOUT", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 5);

    const past = new Date(Date.now() - BATCH_CONFIG.POOL_FORMATION_TIMEOUT_MS - 60_000);

    for (let i = 0; i < BATCH_CONFIG.MIN_BATCH_SIZE; i++) {
      await seedQueuedCandidate(job.id, past);
    }

    const result = await checkAndLaunchBatch(job.id);

    expect(result.launched).toBe(true);
    if (result.launched) {
      expect(result.candidateCount).toBe(BATCH_CONFIG.MIN_BATCH_SIZE);
    }
  });
});

// ─── Backfill tests ────────────────────────────────────────────

describe("maybeLaunchNextBatch", () => {
  it("waits for the standard partial-batch timeout when multiple slots remain", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 5);

    for (let i = 0; i < BATCH_CONFIG.BACKFILL_THRESHOLD - 1; i++) {
      await seedQueuedCandidate(job.id);
    }

    const result = await maybeLaunchNextBatch(job.id);

    expect(result.launched).toBe(false);
    if (!result.launched) {
      expect(result.reason).toContain(String(BATCH_CONFIG.BACKFILL_THRESHOLD));
    }
  });

  it("backfills when pool >= BACKFILL_THRESHOLD after a release", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 5);

    // Launch first batch
    for (let i = 0; i < BATCH_CONFIG.DEFAULT_TARGET_SIZE; i++) {
      await seedQueuedCandidate(job.id);
    }
    const first = await checkAndLaunchBatch(job.id);
    expect(first.launched).toBe(true);

    // Simulate batch release
    if (first.launched) {
      await sql`UPDATE job_batches SET status = 'released', released_at = now() WHERE id = ${first.batchId}`;
      await sql`
        UPDATE interviews
        SET status = 'cancelled', cancelled_at = now()
        WHERE batch_id = ${first.batchId}
      `;
    }

    // Add enough candidates for backfill
    for (let i = 0; i < BATCH_CONFIG.BACKFILL_THRESHOLD; i++) {
      await seedQueuedCandidate(job.id);
    }

    const result = await maybeLaunchNextBatch(job.id);

    expect(result.launched).toBe(true);
    if (result.launched) {
      expect(result.candidateCount).toBe(BATCH_CONFIG.BACKFILL_THRESHOLD);
    }
  });

  it("immediately backfills one newly available slot", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await setJobTarget(job.id, 2);
    await seedInterviewCandidate(job.id, "pending");
    await seedQueuedCandidate(job.id);

    const result = await maybeLaunchNextBatch(job.id);

    expect(result).toMatchObject({ launched: true, candidateCount: 1 });
  });
});
