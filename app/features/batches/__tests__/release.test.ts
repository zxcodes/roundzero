import { describe, expect, it } from "vitest";

import { isBatchFullyResolved, releaseBatch } from "@/features/batches/server/release";
import {
  getTestDb,
  seedCandidateProfile,
  seedCompany,
  seedJob,
} from "@/shared/__tests__/test-utils";

const sql = getTestDb();

describe("releaseBatch", () => {
  it("releases held reports and is idempotent on subsequent calls", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    const { user: candidate } = await seedCandidateProfile();

    // Create application in evaluated_held state
    const [app] = await sql`
      INSERT INTO applications (job_id, candidate_id, resume_key, status)
      VALUES (${job.id}, ${candidate.id}, 'resumes/test', 'evaluated_held')
      RETURNING id
    `;

    // Create batch
    const [batch] = await sql`
      INSERT INTO job_batches (job_id, status, target_size)
      VALUES (${job.id}, 'active', 1)
      RETURNING id
    `;

    // Create interview linked to batch
    const [interview] = await sql`
      INSERT INTO interviews (application_id, batch_id, type, status, completed_at)
      VALUES (${app.id}, ${batch.id}, 'full', 'completed', now())
      RETURNING id
    `;

    // Create held report
    await sql`
      INSERT INTO reports (interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation)
      VALUES (
        ${interview.id},
        ${app.id},
        'Test summary',
        '[]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        '{"overall": 8.5}'::jsonb,
        'yes'
      )
    `;

    // First release: should release everything
    const first = await releaseBatch(sql, batch.id);
    expect(first.released).toBe(true);
    if (first.released) {
      expect(first.reportCount).toBe(1);
      expect(first.topScore).toBe(8.5);
    }

    // Verify state
    const [reportRow] = await sql`SELECT released_at FROM reports WHERE application_id = ${app.id}`;
    expect(reportRow?.released_at).not.toBeNull();

    const [appRow] = await sql`SELECT status FROM applications WHERE id = ${app.id}`;
    expect(appRow?.status).toBe("evaluated");

    const [batchRow] =
      await sql`SELECT status, released_at FROM job_batches WHERE id = ${batch.id}`;
    expect(batchRow?.status).toBe("released");

    // Second release reconstructs durable deliveries for retry-safe dispatch.
    const second = await releaseBatch(sql, batch.id);
    expect(second.released).toBe(true);
    if (second.released) {
      expect(second.reportCount).toBe(1);
      expect(second.notificationDeliveries.map((delivery) => delivery.notification.id)).toEqual(
        first.released
          ? first.notificationDeliveries.map((delivery) => delivery.notification.id)
          : [],
      );
    }
  });

  it("returns not_found for unknown batch ID", async () => {
    const result = await releaseBatch(sql, "00000000-0000-0000-0000-000000000000");
    expect(result.released).toBe(false);
    if (!result.released) {
      expect(result.reason).toBe("not_found");
    }
  });

  it("does not resolve a completed interview until its report exists", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    const { user: candidate } = await seedCandidateProfile();
    const [application] = await sql`
      INSERT INTO applications (job_id, candidate_id, resume_key, status)
      VALUES (${job.id}, ${candidate.id}, 'resumes/resolution', 'evaluated_held') RETURNING id
    `;
    const [batch] = await sql`
      INSERT INTO job_batches (job_id, status, target_size)
      VALUES (${job.id}, 'active', 1) RETURNING id
    `;
    const [interview] = await sql`
      INSERT INTO interviews (application_id, batch_id, type, status, completed_at)
      VALUES (${application.id}, ${batch.id}, 'full', 'completed', now()) RETURNING id
    `;

    expect(await isBatchFullyResolved(sql, batch.id)).toBe(false);

    await sql`
      INSERT INTO reports (interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation)
      VALUES (${interview.id}, ${application.id}, 'Ready', '[]', '[]', '[]', '[]', '[]', '{"overall": 7}', 'yes')
    `;
    expect(await isBatchFullyResolved(sql, batch.id)).toBe(true);
  });

  it("expires due pending interviews at timeout but preserves awaiting_voice", async () => {
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    const candidates = await Promise.all([seedCandidateProfile(), seedCandidateProfile()]);
    const [batch] = await sql`
      INSERT INTO job_batches (job_id, status, target_size)
      VALUES (${job.id}, 'active', 2) RETURNING id
    `;

    for (const [index, candidate] of candidates.entries()) {
      const [application] = await sql`
        INSERT INTO applications (job_id, candidate_id, resume_key, status)
        VALUES (${job.id}, ${candidate.user.id}, ${`resumes/timeout-${index}`}, 'interview_invited')
        RETURNING id
      `;
      await sql`
        INSERT INTO interviews (application_id, batch_id, type, status, metadata)
        VALUES (
          ${application.id}, ${batch.id}, 'full',
          ${index === 0 ? "pending" : "awaiting_voice"},
          ${sql.json({ expiresAt: new Date(Date.now() - 60_000).toISOString() })}
        )
      `;
    }

    await releaseBatch(sql, batch.id, { expireDueInterviews: true });
    const interviews = await sql`
      SELECT status FROM interviews WHERE batch_id = ${batch.id} ORDER BY status
    `;
    expect(interviews.map((row) => row.status)).toEqual(["awaiting_voice", "expired"]);
  });
});
