import { describe, expect, it } from "vitest";
import { releaseBatch } from "@/features/batches/server/release";
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
        '{"overall": 85}'::jsonb,
        'yes'
      )
    `;

    // First release: should release everything
    const first = await releaseBatch(sql, batch.id);
    expect(first.released).toBe(true);
    if (first.released) {
      expect(first.reportCount).toBe(1);
      expect(first.topScore).toBe(85);
    }

    // Verify state
    const [reportRow] = await sql`SELECT released_at FROM reports WHERE application_id = ${app.id}`;
    expect(reportRow?.released_at).not.toBeNull();

    const [appRow] = await sql`SELECT status FROM applications WHERE id = ${app.id}`;
    expect(appRow?.status).toBe("evaluated");

    const [batchRow] =
      await sql`SELECT status, released_at FROM job_batches WHERE id = ${batch.id}`;
    expect(batchRow?.status).toBe("released");

    // Second release: should be a no-op
    const second = await releaseBatch(sql, batch.id);
    expect(second.released).toBe(false);
    if (!second.released) {
      expect(second.reason).toBe("already_released");
    }
  });

  it("returns not_found for unknown batch ID", async () => {
    const result = await releaseBatch(sql, "00000000-0000-0000-0000-000000000000");
    expect(result.released).toBe(false);
    if (!result.released) {
      expect(result.reason).toBe("not_found");
    }
  });
});
