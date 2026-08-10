import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApplication, getApplicationById } from "@/features/applications/queries/queries_sql";
import * as interviewQueries from "@/features/interviews/queries/queries_sql";
import {
  createCommunicationAssessment,
  createInterview,
  submitInterviewForVoice,
  updateInterviewStatus,
} from "@/features/interviews/queries/queries_sql";
import {
  finalizeVoiceAssessmentFromTranscript,
  startVoiceAssessmentCall,
  startPostEvaluation,
} from "@/features/interviews/server/voice-assessment";
import {
  getTestDb,
  makeTestResumeKey,
  seedCompany,
  seedJob,
  seedUser,
} from "@/shared/__tests__/test-utils";

const workflowMocks = vi.hoisted(() => ({
  create: vi.fn(async () => ({ id: "post-eval-instance" })),
  get: vi.fn<() => Promise<unknown>>(async () => {
    throw new Error("instance not found");
  }),
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    POST_EVALUATION: {
      create: workflowMocks.create,
      get: workflowMocks.get,
    },
  },
}));

const sql = getTestDb();

const seedAwaitingVoiceInterview = async () => {
  const { company } = await seedCompany();
  const candidate = await seedUser({ role: "candidate" });
  const { job } = await seedJob({ companyId: company.id, status: "open" });
  const application = await createApplication(sql, {
    jobId: job.id,
    candidateId: candidate.id,
    resumeKey: makeTestResumeKey(candidate.id),
    metadata: {},
    status: "interview_in_progress",
  });
  if (!application) {
    throw new Error("seed failed");
  }

  const interview = await createInterview(sql, {
    applicationId: application.id,
    agentId: null,
    type: "full",
    metadata: {},
    status: "pending",
    invitedAt: new Date(),
    startedAt: null,
    completedAt: null,
  });
  if (!interview) {
    throw new Error("seed failed");
  }

  await updateInterviewStatus(sql, { id: interview.id, status: "in_progress" });
  const awaitingVoice = await submitInterviewForVoice(sql, { id: interview.id });
  if (!awaitingVoice) {
    throw new Error("seed failed");
  }

  await createCommunicationAssessment(sql, {
    interviewId: interview.id,
    applicationId: application.id,
    status: "pending",
  });

  return {
    interviewId: interview.id,
    applicationId: application.id,
  };
};

describe("voice assessment call start", () => {
  it("starts an eligible assessment and returns authoritative interview context", async () => {
    const { interviewId } = await seedAwaitingVoiceInterview();

    const interview = await startVoiceAssessmentCall(sql, interviewId);

    expect(interview?.id).toBe(interviewId);
    expect(interview?.status).toBe("awaiting_voice");
    const assessment = await interviewQueries.getCommunicationAssessmentByInterviewId(sql, {
      interviewId,
    });
    expect(assessment?.status).toBe("in_progress");
    expect(assessment?.startedAt).toBeInstanceOf(Date);
  });

  it.each([
    { applicationStatus: "interview_in_progress", interviewStatus: "cancelled" },
    { applicationStatus: "withdrawn", interviewStatus: "cancelled" },
    { applicationStatus: "rejected", interviewStatus: "cancelled" },
  ])(
    "rejects a $applicationStatus/$interviewStatus lifecycle winner",
    async ({ applicationStatus, interviewStatus }) => {
      const { interviewId, applicationId } = await seedAwaitingVoiceInterview();
      await sql.begin(async (tx) => {
        await tx`SELECT id FROM applications WHERE id = ${applicationId} FOR UPDATE`;
        await tx`
          UPDATE applications
          SET status = ${applicationStatus}, updated_at = now()
          WHERE id = ${applicationId}
        `;
        await tx`
          UPDATE interviews
          SET status = ${interviewStatus}, cancelled_at = now(), updated_at = now()
          WHERE id = ${interviewId}
        `;
      });

      const interview = await startVoiceAssessmentCall(sql, interviewId);

      expect(interview).toBeNull();
      const assessment = await interviewQueries.getCommunicationAssessmentByInterviewId(sql, {
        interviewId,
      });
      expect(assessment?.status).toBe("pending");
      expect(assessment?.startedAt).toBeNull();
    },
  );
});

describe("voice assessment post-eval triggers", () => {
  beforeEach(() => {
    workflowMocks.create.mockClear();
    workflowMocks.get.mockClear();
    workflowMocks.get.mockRejectedValue(new Error("instance not found"));
  });

  it("finalizes voice, completes the interview, and starts post-evaluation", async () => {
    const { interviewId, applicationId } = await seedAwaitingVoiceInterview();

    const result = await finalizeVoiceAssessmentFromTranscript({
      db: sql,
      interviewId,
      messages: [
        { role: "assistant", content: "Tell me about your work." },
        { role: "candidate", content: "I led API migrations." },
      ],
    });

    expect(result).toEqual({ ok: true, reason: "completed" });
    expect(workflowMocks.create).toHaveBeenCalledWith({
      id: interviewId,
      params: { interviewId },
    });

    const interview = await interviewQueries.getInterviewContextById(sql, { id: interviewId });
    expect(interview?.status).toBe("completed");

    const assessment = await interviewQueries.getCommunicationAssessmentByInterviewId(sql, {
      interviewId,
    });
    expect(assessment?.status).toBe("completed");
    expect(assessment?.applicationId).toBe(applicationId);
  });

  it("retries post-evaluation when voice assessment is already completed", async () => {
    const { interviewId, applicationId } = await seedAwaitingVoiceInterview();

    const firstPass = await finalizeVoiceAssessmentFromTranscript({
      db: sql,
      interviewId,
      messages: [{ role: "candidate", content: "First answer." }],
    });
    expect(firstPass).toEqual({ ok: true, reason: "completed" });
    workflowMocks.create.mockClear();
    workflowMocks.get.mockResolvedValueOnce({
      id: interviewId,
      status: vi.fn(async () => ({ status: "running" })),
      restart: vi.fn(),
    });

    const secondPass = await finalizeVoiceAssessmentFromTranscript({
      db: sql,
      interviewId,
      messages: [{ role: "candidate", content: "Retry should not need new transcript." }],
    });

    expect(secondPass).toEqual({ ok: true, reason: "already_completed" });
    expect(workflowMocks.create).not.toHaveBeenCalled();

    const interview = await interviewQueries.getInterviewContextById(sql, { id: interviewId });
    expect(interview?.status).toBe("completed");
    expect(interview?.applicationId).toBe(applicationId);
  });

  it("restarts an errored post-evaluation instance without duplicating it", async () => {
    const { interviewId, applicationId } = await seedAwaitingVoiceInterview();
    await finalizeVoiceAssessmentFromTranscript({
      db: sql,
      interviewId,
      messages: [{ role: "candidate", content: "First answer." }],
    });
    workflowMocks.create.mockClear();
    const restart = vi.fn(async () => undefined);
    workflowMocks.get.mockResolvedValueOnce({
      id: interviewId,
      status: vi.fn(async () => ({ status: "errored" })),
      restart,
    });

    await startPostEvaluation(sql, { interviewId, applicationId });

    expect(restart).toHaveBeenCalledOnce();
    expect(workflowMocks.create).not.toHaveBeenCalled();
  });

  it("does not finalize voice when the interview is not awaiting_voice", async () => {
    const { interviewId } = await seedAwaitingVoiceInterview();
    await updateInterviewStatus(sql, { id: interviewId, status: "in_progress" });

    const result = await finalizeVoiceAssessmentFromTranscript({
      db: sql,
      interviewId,
      messages: [{ role: "candidate", content: "Too early." }],
    });

    expect(result).toEqual({ ok: false, reason: "assessment_unavailable" });
    expect(workflowMocks.create).not.toHaveBeenCalled();
  });

  it("does not complete an assistant-only transcript", async () => {
    const { interviewId } = await seedAwaitingVoiceInterview();

    const result = await finalizeVoiceAssessmentFromTranscript({
      db: sql,
      interviewId,
      messages: [
        { role: "assistant", content: "Tell me about your work." },
        { role: "candidate", content: "[noise]" },
      ],
    });

    expect(result).toEqual({ ok: false, reason: "no_candidate_speech" });
    expect(workflowMocks.create).not.toHaveBeenCalled();

    const interview = await interviewQueries.getInterviewContextById(sql, { id: interviewId });
    expect(interview?.status).toBe("awaiting_voice");
    const assessment = await interviewQueries.getCommunicationAssessmentByInterviewId(sql, {
      interviewId,
    });
    expect(assessment?.status).toBe("pending");
  });

  it.each([
    { applicationStatus: "withdrawn", interviewStatus: "cancelled" },
    { applicationStatus: "rejected", interviewStatus: "cancelled" },
  ])(
    "preserves a $applicationStatus/$interviewStatus winner and does not start post-evaluation",
    async ({ applicationStatus, interviewStatus }) => {
      const { interviewId, applicationId } = await seedAwaitingVoiceInterview();
      await sql.begin(async (tx) => {
        await tx`SELECT id FROM applications WHERE id = ${applicationId} FOR UPDATE`;
        await tx`UPDATE applications SET status = ${applicationStatus} WHERE id = ${applicationId}`;
        await tx`UPDATE interviews SET status = ${interviewStatus} WHERE id = ${interviewId}`;
      });

      const result = await finalizeVoiceAssessmentFromTranscript({
        db: sql,
        interviewId,
        messages: [{ role: "candidate", content: "Late transcript." }],
      });

      expect(result).toEqual({ ok: false, reason: "terminal_state" });
      expect(workflowMocks.create).not.toHaveBeenCalled();

      const application = await getApplicationById(sql, { id: applicationId });
      expect(application?.status).toBe(applicationStatus);
      const interview = await interviewQueries.getInterviewContextById(sql, { id: interviewId });
      expect(interview?.status).toBe(interviewStatus);
    },
  );

  it("marks recoverable state evaluation_failed when workflow creation fails", async () => {
    const { interviewId, applicationId } = await seedAwaitingVoiceInterview();
    workflowMocks.create.mockRejectedValueOnce(new Error("workflow runtime down"));

    await expect(
      finalizeVoiceAssessmentFromTranscript({
        db: sql,
        interviewId,
        messages: [{ role: "candidate", content: "Completed answer." }],
      }),
    ).rejects.toThrow("workflow runtime down");

    const application = await getApplicationById(sql, { id: applicationId });
    expect(application?.status).toBe("evaluation_failed");
  });

  it("startPostEvaluation no-ops without a completed interview and voice assessment", async () => {
    const { interviewId, applicationId } = await seedAwaitingVoiceInterview();

    await startPostEvaluation(sql, { interviewId, applicationId });
    expect(workflowMocks.create).not.toHaveBeenCalled();
  });
});
