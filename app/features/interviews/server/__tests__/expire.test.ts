import { describe, expect, it, vi } from "vitest";
import { createApplication } from "@/features/applications/queries/queries_sql";
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

const makePostEvalBinding = () => {
  const create = vi.fn(async () => ({ id: "post-eval-instance" }));
  const binding = { create } as unknown as Workflow<{ interviewId: string }>;
  return { binding, create };
};

describe("expireInterviewIfDue", () => {
  it("does nothing when the interview has no expiry", async () => {
    const { interview } = await seedInterview({ status: "in_progress", expiresAt: null });
    const { binding, create } = makePostEvalBinding();

    const result = await expireInterviewIfDue({
      db: sql,
      interview: {
        id: interview.id,
        status: interview.status,
        expiresAt: interview.metadata?.expiresAt ?? null,
      },
      postEvaluation: binding,
    });

    expect(result.expiredNow).toBe(false);
    expect(result.postEvalTriggered).toBe(false);
    expect(create).not.toHaveBeenCalled();

    const reloaded = await getInterviewContextById(sql, { id: interview.id });
    expect(reloaded?.status).toBe("in_progress");
  });

  it("does nothing when the deadline is still in the future", async () => {
    const { interview } = await seedInterview({
      status: "in_progress",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const { binding, create } = makePostEvalBinding();

    const result = await expireInterviewIfDue({
      db: sql,
      interview: {
        id: interview.id,
        status: interview.status,
        expiresAt: interview.metadata?.expiresAt ?? null,
      },
      postEvaluation: binding,
    });

    expect(result.expiredNow).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("expires a pending interview without triggering post-eval (no transcript to evaluate)", async () => {
    const { interview } = await seedInterview({
      status: "pending",
      expiresAt: new Date(Date.now() - 60 * 1000),
    });
    const { binding, create } = makePostEvalBinding();

    const result = await expireInterviewIfDue({
      db: sql,
      interview: {
        id: interview.id,
        status: interview.status,
        expiresAt: interview.metadata?.expiresAt ?? null,
      },
      postEvaluation: binding,
    });

    expect(result.expiredNow).toBe(true);
    expect(result.postEvalTriggered).toBe(false);
    expect(create).not.toHaveBeenCalled();

    const reloaded = await getInterviewContextById(sql, { id: interview.id });
    expect(reloaded?.status).toBe("expired");
  });

  it("expires an in_progress interview AND triggers post-eval so partial transcript becomes a report", async () => {
    const { interview } = await seedInterview({
      status: "in_progress",
      expiresAt: new Date(Date.now() - 60 * 1000),
    });
    const { binding, create } = makePostEvalBinding();

    const result = await expireInterviewIfDue({
      db: sql,
      interview: {
        id: interview.id,
        status: interview.status,
        expiresAt: interview.metadata?.expiresAt ?? null,
      },
      postEvaluation: binding,
    });

    expect(result.expiredNow).toBe(true);
    expect(result.postEvalTriggered).toBe(true);
    expect(create).toHaveBeenCalledWith({
      id: interview.id,
      params: { interviewId: interview.id },
    });

    const reloaded = await getInterviewContextById(sql, { id: interview.id });
    expect(reloaded?.status).toBe("expired");
  });

  it("still marks expired even if post-eval trigger throws (best-effort side effect)", async () => {
    const { interview } = await seedInterview({
      status: "in_progress",
      expiresAt: new Date(Date.now() - 60 * 1000),
    });
    const create = vi.fn(async () => {
      throw new Error("workflow runtime down");
    });
    const binding = { create } as unknown as Workflow<{ interviewId: string }>;

    const result = await expireInterviewIfDue({
      db: sql,
      interview: {
        id: interview.id,
        status: interview.status,
        expiresAt: interview.metadata?.expiresAt ?? null,
      },
      postEvaluation: binding,
    });

    expect(result.expiredNow).toBe(true);
    expect(result.postEvalTriggered).toBe(false);

    const reloaded = await getInterviewContextById(sql, { id: interview.id });
    expect(reloaded?.status).toBe("expired");
  });

  it("skips the post-eval side effect entirely when the binding is null", async () => {
    const { interview } = await seedInterview({
      status: "in_progress",
      expiresAt: new Date(Date.now() - 60 * 1000),
    });

    const result = await expireInterviewIfDue({
      db: sql,
      interview: {
        id: interview.id,
        status: interview.status,
        expiresAt: interview.metadata?.expiresAt ?? null,
      },
      postEvaluation: null,
    });

    expect(result.expiredNow).toBe(true);
    expect(result.postEvalTriggered).toBe(false);

    const reloaded = await getInterviewContextById(sql, { id: interview.id });
    expect(reloaded?.status).toBe("expired");
  });
});
