import { describe, expect, it } from "vitest";
import { createApplication, getApplicationById } from "@/features/applications/queries/queries_sql";
import {
  createInterview,
  getInterviewContextById,
} from "@/features/interviews/queries/queries_sql";
import {
  getTestDb,
  makeTestResumeKey,
  seedCompany,
  seedJob,
  seedUser,
} from "@/shared/__tests__/test-utils";
import { expireInterviewIfDue } from "../expire";

const sql = getTestDb();

const seedInterview = async (opts: {
  status: "pending" | "in_progress" | "completed" | "cancelled";
  expiresAt: Date | null;
}) => {
  const { company } = await seedCompany();
  const candidate = await seedUser({ role: "candidate" });
  const { job } = await seedJob({ companyId: company.id, status: "open" });
  const application = await createApplication(sql, {
    jobId: job.id,
    candidateId: candidate.id,
    resumeKey: makeTestResumeKey(candidate.id),
    metadata: {},
    status: "interview_invited",
  });
  if (!application) throw new Error("seed failed");

  const interview = await createInterview(sql, {
    applicationId: application.id,
    agentId: null,
    type: "full",
    metadata: opts.expiresAt ? { expiresAt: opts.expiresAt.toISOString() } : {},
    status: opts.status,
    invitedAt: new Date(),
    startedAt: opts.status === "in_progress" ? new Date() : null,
    completedAt: null,
  });
  if (!interview) throw new Error("seed failed");
  return { interview, applicationId: application.id };
};

describe("expireInterviewIfDue", () => {
  it("does nothing when the interview has no expiry", async () => {
    const { interview, applicationId } = await seedInterview({
      status: "in_progress",
      expiresAt: null,
    });

    const result = await expireInterviewIfDue({
      db: sql,
      interview: {
        id: interview.id,
        applicationId,
        status: interview.status,
        expiresAt: interview.metadata?.expiresAt ?? null,
      },
    });

    expect(result.expiredNow).toBe(false);

    const reloaded = await getInterviewContextById(sql, { id: interview.id });
    expect(reloaded?.status).toBe("in_progress");
  });

  it("does nothing when the deadline is still in the future", async () => {
    const { interview, applicationId } = await seedInterview({
      status: "in_progress",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await expireInterviewIfDue({
      db: sql,
      interview: {
        id: interview.id,
        applicationId,
        status: interview.status,
        expiresAt: interview.metadata?.expiresAt ?? null,
      },
    });

    expect(result.expiredNow).toBe(false);
  });

  it("expires a pending interview without starting post-evaluation", async () => {
    const { interview, applicationId } = await seedInterview({
      status: "pending",
      expiresAt: new Date(Date.now() - 60 * 1000),
    });

    const result = await expireInterviewIfDue({
      db: sql,
      interview: {
        id: interview.id,
        applicationId,
        status: interview.status,
        expiresAt: interview.metadata?.expiresAt ?? null,
      },
    });

    expect(result.expiredNow).toBe(true);

    const reloaded = await getInterviewContextById(sql, { id: interview.id });
    expect(reloaded?.status).toBe("expired");
    const application = await getApplicationById(sql, { id: applicationId });
    expect(application?.status).toBe("pre_screening");
  });

  it("expires an in_progress interview without starting post-evaluation", async () => {
    const { interview, applicationId } = await seedInterview({
      status: "in_progress",
      expiresAt: new Date(Date.now() - 60 * 1000),
    });

    const result = await expireInterviewIfDue({
      db: sql,
      interview: {
        id: interview.id,
        applicationId,
        status: interview.status,
        expiresAt: interview.metadata?.expiresAt ?? null,
      },
    });

    expect(result.expiredNow).toBe(true);

    const reloaded = await getInterviewContextById(sql, { id: interview.id });
    expect(reloaded?.status).toBe("expired");
    const application = await getApplicationById(sql, { id: applicationId });
    expect(application?.status).toBe("pre_screening");
  });
});
