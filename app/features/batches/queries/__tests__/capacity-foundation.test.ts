import { describe, expect, it } from "vitest";

import { createApplication } from "@/features/applications/queries/queries_sql";
import {
  getJobCapacityCounts,
  getJobReportProgress,
  getJobsWithQueuedCandidates,
  getOldestQueuedAtForJob,
  getPoolCandidatesForJob,
} from "@/features/batches/queries/queries_sql";
import { createInterview } from "@/features/interviews/queries/queries_sql";
import {
  getTestDb,
  makeTestResumeKey,
  seedCompany,
  seedJob,
  seedUser,
} from "@/shared/__tests__/test-utils";

const sql = getTestDb();

const seedApplication = async (jobId: string, status = "applied") => {
  const candidate = await seedUser({ role: "candidate" });
  return createApplication(sql, {
    jobId,
    candidateId: candidate.id,
    resumeKey: makeTestResumeKey(candidate.id),
    metadata: {},
    status,
  });
};

const seedInterview = async (applicationId: string, status: string) =>
  createInterview(sql, {
    applicationId,
    agentId: null,
    type: "full",
    metadata: {},
    status,
    invitedAt: new Date(),
    startedAt: null,
    completedAt: status === "completed" ? new Date() : null,
  });

describe("batch quota foundation queries", () => {
  it("includes an active batch even after its launch emptied the pool", async () => {
    const { job } = await seedJob({ status: "open" });
    await sql`INSERT INTO job_batches (job_id, status) VALUES (${job.id}, 'active')`;

    const jobs = await getJobsWithQueuedCandidates(sql);

    expect(jobs.map((row) => row.id)).toContain(job.id);
  });

  it("keeps score-first pool priority while reporting the oldest queue time separately", async () => {
    const { job } = await seedJob({ status: "open" });
    const older = await seedApplication(job.id);
    const newer = await seedApplication(job.id);
    const oldTime = new Date(Date.now() - 60_000);
    const newTime = new Date();
    await sql`UPDATE applications SET status = 'queued_for_batch', queued_at = ${oldTime} WHERE id = ${older!.id}`;
    await sql`UPDATE applications SET status = 'queued_for_batch', queued_at = ${newTime} WHERE id = ${newer!.id}`;
    await sql`INSERT INTO pre_evaluations (application_id, score, confidence, next_step) VALUES (${older!.id}, 5, 'high', 'proceed'), (${newer!.id}, 9, 'high', 'proceed')`;

    const pool = await getPoolCandidatesForJob(sql, { jobId: job.id });
    const oldest = await getOldestQueuedAtForJob(sql, { jobId: job.id });

    expect(pool.map((row) => row.id)).toEqual([newer!.id, older!.id]);
    expect(oldest!.oldestQueuedAt).toEqual(oldTime);
  });

  it("counts capacity statuses distinctly and does not double count a released report", async () => {
    const { job } = await seedJob({ status: "open" });
    const delivered = await seedApplication(job.id);
    const processing = await seedApplication(job.id);
    const underway = await seedApplication(job.id);
    const expired = await seedApplication(job.id);
    const waitlisted = await seedApplication(job.id);
    const deliveredInterview = await seedInterview(delivered!.id, "completed");
    await seedInterview(processing!.id, "completed");
    await seedInterview(underway!.id, "awaiting_voice");
    await seedInterview(expired!.id, "expired");
    await sql`UPDATE applications SET status = 'queued_for_batch', queued_at = now() WHERE id = ${waitlisted!.id}`;
    await sql`
      INSERT INTO reports (interview_id, application_id, summary, scores, recommendation, released_at)
      VALUES (${deliveredInterview!.id}, ${delivered!.id}, 'summary', '{}'::jsonb, 'yes', now())
    `;

    const capacity = await getJobCapacityCounts(sql, { jobId: job.id });
    const progress = await getJobReportProgress(sql, { jobId: job.id });

    expect(capacity).toMatchObject({ deliveredCount: 1, reservedCount: 2 });
    expect(progress).toMatchObject({
      deliveredCount: 1,
      processingCount: 1,
      underwayCount: 1,
      waitlistedCount: 1,
    });
  });

  it("enforces one interview per application and one forming or active batch per job", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    const application = await seedApplication(job.id);
    await seedInterview(application!.id, "expired");
    await expect(seedInterview(application!.id, "pending")).rejects.toMatchObject({
      code: "23505",
    });

    await sql`INSERT INTO job_batches (job_id, status) VALUES (${job.id}, 'forming')`;
    await expect(
      sql`INSERT INTO job_batches (job_id, status) VALUES (${job.id}, 'active')`,
    ).rejects.toMatchObject({ code: "23505" });
  });
});
