import { describe, expect, it, vi } from "vitest";
import { BATCH_CONFIG } from "@/features/batches/config";
import { checkAndLaunchBatch, maybeLaunchNextBatch } from "@/features/batches/server/functions";
import {
  getTestDb,
  makeTestResumeKey,
  seedCompany,
  seedJob,
  seedUser,
} from "@/shared/__tests__/test-utils";

vi.mock("cloudflare:workers", () => ({
  env: {
    HYPERDRIVE: {
      connectionString: "postgres://postgres:password@localhost:6312/postgres?sslmode=disable",
    },
    BATCH_ORCHESTRATION: { create: vi.fn().mockResolvedValue(undefined) },
  },
}));

vi.mock("agents", () => ({
  getAgentByName: vi.fn().mockReturnValue({
    initializeContext: vi.fn().mockResolvedValue(undefined),
  }),
}));

const sql = getTestDb();

async function seedQueuedCandidate(jobId: string, createdAt?: Date) {
  const user = await seedUser({ role: "candidate" });
  const ts = createdAt ?? new Date();
  const [app] = await sql`
    INSERT INTO applications (
      job_id, candidate_id, resume_key, status, created_at, updated_at
    )
    VALUES (
      ${jobId}, ${user.id}, ${makeTestResumeKey(user.id)},
      'queued_for_batch', ${ts}, ${ts}
    )
    RETURNING id
  `;
  return { userId: user.id, applicationId: app!.id as string };
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
  it("does not backfill when pool < BACKFILL_THRESHOLD", async () => {
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
});
