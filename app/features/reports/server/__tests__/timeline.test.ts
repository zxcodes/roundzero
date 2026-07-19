import { describe, expect, it } from "vitest";

import {
  createApplication,
  getApplicationReviewById,
} from "@/features/applications/queries/queries_sql";
import {
  getTestDb,
  makeTestResumeKey,
  seedCompany,
  seedJob,
  seedUser,
} from "@/shared/__tests__/test-utils";

import { loadApplicantReportTimeline } from "../timeline";

describe("applicant report timeline", () => {
  it("loads pre-evaluation data for the consolidated applicant review response", async () => {
    const db = getTestDb();
    const { company } = await seedCompany();
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    const candidate = await seedUser({ role: "candidate" });
    const application = await createApplication(db, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "pre_screening",
    });
    if (!application) throw new Error("Failed to seed application");

    await db`
      INSERT INTO pre_evaluations (application_id, score, confidence, next_step)
      VALUES (${application.id}, 8.5, 'high', 'invite')
    `;
    const review = await getApplicationReviewById(db, { id: application.id });
    if (!review) throw new Error("Failed to load application review");

    const result = await loadApplicantReportTimeline(db, review);

    expect(result.application.id).toBe(application.id);
    expect(result.preEvaluation?.score).toBe(8.5);
    expect(result.interview).toBeNull();
    expect(result.report).toBeNull();
  });
});
