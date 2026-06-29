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
  startPostEvaluation,
} from "@/features/interviews/server/voice-assessment";
import {
  getTestDb,
  makeTestResumeKey,
  seedCompany,
  seedJob,
  seedUser,
} from "@/shared/__tests__/test-utils";

const postEvalCreate = vi.hoisted(() => vi.fn(async () => ({ id: "post-eval-instance" })));

vi.mock("cloudflare:workers", () => ({
  env: {
    POST_EVALUATION: {
      create: postEvalCreate,
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

describe("voice assessment post-eval triggers", () => {
  beforeEach(() => {
    postEvalCreate.mockClear();
  });

  it("finalizes voice, completes the interview, and starts post-evaluation", async () => {
    const { interviewId, applicationId } = await seedAwaitingVoiceInterview();

    const ok = await finalizeVoiceAssessmentFromTranscript({
      db: sql,
      interviewId,
      messages: [
        { role: "assistant", content: "Tell me about your work." },
        { role: "candidate", content: "I led API migrations." },
      ],
    });

    expect(ok).toBe(true);
    expect(postEvalCreate).toHaveBeenCalledWith({
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
    expect(firstPass).toBe(true);
    postEvalCreate.mockClear();
    postEvalCreate.mockRejectedValueOnce(new Error("workflow runtime down"));

    const secondPass = await finalizeVoiceAssessmentFromTranscript({
      db: sql,
      interviewId,
      messages: [{ role: "candidate", content: "Retry should not need new transcript." }],
    });

    expect(secondPass).toBe(true);
    expect(postEvalCreate).toHaveBeenCalledWith({
      id: interviewId,
      params: { interviewId },
    });

    const interview = await interviewQueries.getInterviewContextById(sql, { id: interviewId });
    expect(interview?.status).toBe("completed");
    expect(interview?.applicationId).toBe(applicationId);
  });

  it("does not finalize voice when the interview is not awaiting_voice", async () => {
    const { interviewId } = await seedAwaitingVoiceInterview();
    await updateInterviewStatus(sql, { id: interviewId, status: "in_progress" });

    const ok = await finalizeVoiceAssessmentFromTranscript({
      db: sql,
      interviewId,
      messages: [{ role: "candidate", content: "Too early." }],
    });

    expect(ok).toBe(false);
    expect(postEvalCreate).not.toHaveBeenCalled();
  });

  it("marks evaluation_failed when interview completion fails after voice is saved", async () => {
    const { interviewId, applicationId } = await seedAwaitingVoiceInterview();
    const spy = vi
      .spyOn(interviewQueries, "completeInterviewAfterVoice")
      .mockResolvedValueOnce(null);

    const ok = await finalizeVoiceAssessmentFromTranscript({
      db: sql,
      interviewId,
      messages: [{ role: "candidate", content: "Saved but interview stuck." }],
    });

    expect(ok).toBe(false);
    expect(postEvalCreate).not.toHaveBeenCalled();

    const application = await getApplicationById(sql, { id: applicationId });
    expect(application?.status).toBe("evaluation_failed");

    spy.mockRestore();
  });

  it("startPostEvaluation no-ops without a completed interview and voice assessment", async () => {
    const { interviewId, applicationId } = await seedAwaitingVoiceInterview();

    await startPostEvaluation(sql, { interviewId, applicationId });
    expect(postEvalCreate).not.toHaveBeenCalled();
  });
});
