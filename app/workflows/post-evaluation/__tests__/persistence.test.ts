import { describe, expect, it } from "vitest";

import { releaseBatch } from "@/features/batches/server/release";
import {
  createTestDbConnection,
  getTestDb,
  seedCandidateProfile,
  seedCompany,
  seedJob,
  waitForBlockedQueryCount,
} from "@/shared/__tests__/test-utils";
import { createWorkflowLogger } from "@/shared/logger";
import { persistReport } from "@/workflows/post-evaluation/steps";

const sql = getTestDb();

const reportDraft = {
  summary: "Strong candidate",
  strengths: ["Clear communicator"],
  weaknesses: [],
  insights: [],
  evidence: ["Explained a relevant project"],
  screeningAnswers: [],
  scores: {
    communication: 8,
    problemSolving: 8,
    ownership: 7,
    roleFit: 9,
    overall: 8,
  },
  recommendation: "yes" as const,
  answerAuthenticity: null,
};

async function seedCompletedBatchInterview(batchStatus: "active" | "released") {
  const { company } = await seedCompany();
  const { job } = await seedJob({ companyId: company.id, status: "open" });
  const { user: candidate } = await seedCandidateProfile();
  const [application] = await sql`
    INSERT INTO applications (job_id, candidate_id, resume_key, status)
    VALUES (${job.id}, ${candidate.id}, 'resumes/report-persistence', 'interview_in_progress')
    RETURNING id
  `;
  const [batch] = await sql`
    INSERT INTO job_batches (job_id, status, target_size, released_at)
    VALUES (
      ${job.id}, ${batchStatus}, 1,
      ${batchStatus === "released" ? new Date() : null}
    )
    RETURNING id
  `;
  const [interview] = await sql`
    INSERT INTO interviews (application_id, batch_id, type, status, completed_at)
    VALUES (${application!.id}, ${batch!.id}, 'full', 'completed', now())
    RETURNING id
  `;

  return {
    applicationId: application!.id as string,
    batchId: batch!.id as string,
    interviewId: interview!.id as string,
  };
}

async function runReleasePersistenceRace(first: "persistence" | "release") {
  const seeded = await seedCompletedBatchInterview("active");
  const blocker = createTestDbConnection();
  const persistenceDb = createTestDbConnection();
  const releaseDb = createTestDbConnection();
  let releaseBatchLock = () => {};
  let markBatchLockHeld = () => {};
  const holdBatchLock = new Promise<void>((resolve) => {
    releaseBatchLock = resolve;
  });
  const batchLockHeld = new Promise<void>((resolve) => {
    markBatchLockHeld = resolve;
  });
  const blockerTask = blocker.begin(async (tx) => {
    await tx`SELECT id FROM job_batches WHERE id = ${seeded.batchId} FOR UPDATE`;
    markBatchLockHeld();
    await holdBatchLock;
  });
  const persist = () =>
    persistReport(
      seeded.interviewId,
      { interview: { applicationId: seeded.applicationId } },
      reportDraft,
      "test-model",
      persistenceDb,
      createWorkflowLogger("test", seeded.interviewId),
    )();
  const release = () => releaseBatch(releaseDb, seeded.batchId);

  try {
    await batchLockHeld;
    let persistencePromise: ReturnType<typeof persist>;
    let releasePromise: ReturnType<typeof release>;
    if (first === "persistence") {
      persistencePromise = persist();
      await waitForBlockedQueryCount(sql, {
        minimum: 1,
        queryPattern: "%job_batches%FOR UPDATE%",
      });
      releasePromise = release();
    } else {
      releasePromise = release();
      await waitForBlockedQueryCount(sql, {
        minimum: 1,
        queryPattern: "%job_batches%FOR UPDATE%",
      });
      persistencePromise = persist();
    }
    await waitForBlockedQueryCount(sql, {
      minimum: 2,
      queryPattern: "%job_batches%FOR UPDATE%",
    });
    releaseBatchLock();
    await blockerTask;
    const [persistence, releaseResult] = await Promise.all([persistencePromise, releasePromise]);
    return { seeded, persistence, release: releaseResult };
  } finally {
    releaseBatchLock();
    await blockerTask.catch(() => {});
    await Promise.all([blocker.end(), persistenceDb.end(), releaseDb.end()]);
  }
}

describe("persistReport", () => {
  it("holds an active-batch report and reconciles it once the batch has released", async () => {
    const seeded = await seedCompletedBatchInterview("active");
    const persist = persistReport(
      seeded.interviewId,
      { interview: { applicationId: seeded.applicationId } },
      reportDraft,
      "test-model",
      sql,
      createWorkflowLogger("test", seeded.interviewId),
    );

    const held = await persist();
    expect(held).toMatchObject({ kind: "held", batchId: seeded.batchId });
    expect(held.notificationDeliveries).toHaveLength(0);
    const [heldState] = await sql`
      SELECT a.status, r.released_at
      FROM applications a
      JOIN reports r ON r.application_id = a.id
      WHERE a.id = ${seeded.applicationId}
    `;
    expect(heldState).toMatchObject({ status: "evaluated_held", released_at: null });

    const heldRetry = await persistReport(
      seeded.interviewId,
      { interview: { applicationId: seeded.applicationId } },
      null,
      null,
      sql,
      createWorkflowLogger("test", seeded.interviewId),
    )();
    expect(heldRetry).toMatchObject({ kind: "held", report: { id: held.report.id } });

    await sql`
      UPDATE job_batches
      SET status = 'released', released_at = now()
      WHERE id = ${seeded.batchId}
    `;
    const released = await persistReport(
      seeded.interviewId,
      { interview: { applicationId: seeded.applicationId } },
      null,
      null,
      sql,
      createWorkflowLogger("test", seeded.interviewId),
    )();
    expect(released).toMatchObject({ kind: "released_now", report: { id: held.report.id } });
    expect(released.notificationDeliveries).toHaveLength(1);

    const releasedRetry = await persistReport(
      seeded.interviewId,
      { interview: { applicationId: seeded.applicationId } },
      null,
      null,
      sql,
      createWorkflowLogger("test", seeded.interviewId),
    )();
    expect(releasedRetry).toMatchObject({
      kind: "already_reconciled",
      report: { id: held.report.id },
    });
    expect(releasedRetry.notificationDeliveries).toHaveLength(1);

    const [counts] = await sql`
      SELECT
        (SELECT count(*)::int FROM reports WHERE interview_id = ${seeded.interviewId}) AS reports,
        (SELECT count(*)::int FROM notifications WHERE dedupe_key = ${`report:${held.report.id}`}) AS notifications
    `;
    expect(counts).toMatchObject({ reports: 1, notifications: 1 });
  });

  it("immediately releases a late report created after its batch released", async () => {
    const seeded = await seedCompletedBatchInterview("released");

    const result = await persistReport(
      seeded.interviewId,
      { interview: { applicationId: seeded.applicationId } },
      reportDraft,
      "test-model",
      sql,
      createWorkflowLogger("test", seeded.interviewId),
    )();

    expect(result).toMatchObject({ kind: "released_now", batchId: seeded.batchId });
    expect(result.notificationDeliveries).toHaveLength(1);
    const [state] = await sql`
      SELECT a.status, r.released_at
      FROM applications a
      JOIN reports r ON r.application_id = a.id
      WHERE a.id = ${seeded.applicationId}
    `;
    expect(state?.status).toBe("evaluated");
    expect(state?.released_at).not.toBeNull();
  });

  it("preserves a company rejection while still consuming the completed report slot", async () => {
    const seeded = await seedCompletedBatchInterview("active");
    await sql`UPDATE applications SET status = 'rejected' WHERE id = ${seeded.applicationId}`;

    const persisted = await persistReport(
      seeded.interviewId,
      { interview: { applicationId: seeded.applicationId } },
      reportDraft,
      "test-model",
      sql,
      createWorkflowLogger("test", seeded.interviewId),
    )();
    expect(persisted).toMatchObject({ kind: "held" });
    await releaseBatch(sql, seeded.batchId);

    const [state] = await sql`
      SELECT a.status, r.released_at
      FROM applications a
      JOIN reports r ON r.application_id = a.id
      WHERE a.id = ${seeded.applicationId}
    `;
    expect(state?.status).toBe("rejected");
    expect(state?.released_at).not.toBeNull();
  });

  it("releases a held report when persistence wins the batch-lock race", async () => {
    const result = await runReleasePersistenceRace("persistence");

    expect(result.persistence).toMatchObject({ kind: "held" });
    expect(result.release).toMatchObject({ released: true, reportCount: 1 });
    const [state] = await sql`
      SELECT a.status, r.released_at
      FROM applications a
      JOIN reports r ON r.application_id = a.id
      WHERE a.id = ${result.seeded.applicationId}
    `;
    expect(state?.status).toBe("evaluated");
    expect(state?.released_at).not.toBeNull();
  });

  it("immediately releases a late report when batch release wins the lock race", async () => {
    const result = await runReleasePersistenceRace("release");

    expect(result.release).toMatchObject({ released: true, reportCount: 0 });
    expect(result.persistence).toMatchObject({ kind: "released_now" });
    const [state] = await sql`
      SELECT
        a.status,
        r.released_at,
        count(n.id)::int AS report_ready_notifications
      FROM applications a
      JOIN reports r ON r.application_id = a.id
      LEFT JOIN notifications n ON n.dedupe_key = ${`report:${result.persistence.report.id}`}
      WHERE a.id = ${result.seeded.applicationId}
      GROUP BY a.status, r.released_at
    `;
    expect(state?.status).toBe("evaluated");
    expect(state?.released_at).not.toBeNull();
    expect(state?.report_ready_notifications).toBe(1);
  });
});
