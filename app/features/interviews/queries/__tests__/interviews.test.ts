import { describe, expect, it } from "vitest";

import { createApplication } from "@/features/applications/queries/queries_sql";
import {
  createNotification,
  getNotificationsByUser,
} from "@/features/notifications/queries/queries_sql";
import { getTestDb, makeTestResumeKey, seedCompany, seedUser } from "@/shared/__tests__/test-utils";

import {
  claimInterviewGreeting,
  claimInterviewTurn,
  completeInterviewGreeting,
  completeInterviewTurnWithAssistant,
  completeInterviewTurnWithAssistantAndSubmitForVoice,
  completeInterviewAfterVoice,
  createInterview,
  createInterviewMessage,
  failInterviewTurn,
  getInterviewContextById,
  getInterviewForCandidateById,
  getInterviewMessagesByInterviewId,
  submitInterviewForVoice,
  updateInterviewStatus,
} from "../queries_sql";

const sql = getTestDb();

const makeApplication = async () => {
  const { company } = await seedCompany({ name: "Context Co" });
  const candidate = await seedUser({ role: "candidate", name: "Amina Shah" });
  const [job] = await sql`
    INSERT INTO jobs (
      company_id,
      title,
      description,
      requirements,
      screening_questions,
      status,
      final_report_target
    )
    VALUES (
      ${company.id},
      ${"Platform Engineer"},
      ${"Build APIs and data workflows"},
      ${["TypeScript", "Postgres"]},
      ${["Tell us about ownership"]},
      ${"open"},
      ${5}
    )
    RETURNING id
  `;

  const application = await createApplication(sql, {
    jobId: job.id,
    candidateId: candidate.id,
    resumeKey: makeTestResumeKey(candidate.id),
    metadata: { resumeText: "Built distributed systems and led migrations." },
    status: "applied",
  });

  return {
    applicationId: application!.id,
    candidateId: candidate.id,
    companyOwnerId: company.ownerId,
  };
};

describe("interview queries", () => {
  it("returns interview context including companyOwnerId", async () => {
    const setup = await makeApplication();

    const interview = await createInterview(sql, {
      applicationId: setup.applicationId,
      agentId: null,
      type: "full",
      metadata: { expiresAt: new Date().toISOString() },
      status: "pending",
      invitedAt: new Date(),
      startedAt: null,
      completedAt: null,
    });

    const context = await getInterviewContextById(sql, { id: interview!.id });

    expect(context).not.toBeNull();
    expect(context!.companyOwnerId).toBe(setup.companyOwnerId);
    expect(context!.candidateId).toBe(setup.candidateId);
    expect(context!.jobTitle).toBe("Platform Engineer");
  });

  it("supports candidate-facing lifecycle transitions", async () => {
    const setup = await makeApplication();

    const interview = await createInterview(sql, {
      applicationId: setup.applicationId,
      agentId: null,
      type: "full",
      metadata: {},
      status: "pending",
      invitedAt: new Date(),
      startedAt: null,
      completedAt: null,
    });

    const inProgress = await updateInterviewStatus(sql, {
      id: interview!.id,
      status: "in_progress",
    });
    expect(inProgress).not.toBeNull();
    expect(inProgress!.status).toBe("in_progress");

    // Text interview submitted → voice still required, so the interview is
    // `awaiting_voice`, NOT yet `completed`.
    const awaitingVoice = await submitInterviewForVoice(sql, { id: interview!.id });
    expect(awaitingVoice).not.toBeNull();
    expect(awaitingVoice!.status).toBe("awaiting_voice");
    expect(awaitingVoice!.completedAt).toBeNull();

    // Voice finished → interview is fully completed.
    const completed = await completeInterviewAfterVoice(sql, { id: interview!.id });
    expect(completed).not.toBeNull();
    expect(completed!.status).toBe("completed");
    expect(completed!.completedAt).toBeInstanceOf(Date);

    const candidateView = await getInterviewForCandidateById(sql, {
      id: interview!.id,
      candidateId: setup.candidateId,
    });
    expect(candidateView).not.toBeNull();
    expect(candidateView!.status).toBe("completed");
  });

  it("allows only one active generation and permits a failed turn to retry", async () => {
    const setup = await makeApplication();
    const interview = await createInterview(sql, {
      applicationId: setup.applicationId,
      agentId: null,
      type: "full",
      metadata: {},
      status: "in_progress",
      invitedAt: new Date(),
      startedAt: new Date(),
      completedAt: null,
    });
    const firstTurnId = crypto.randomUUID();
    const secondTurnId = crypto.randomUUID();

    const firstClaim = await claimInterviewTurn(sql, {
      interviewId: interview!.id,
      turnId: firstTurnId,
      content: "My first answer",
    });
    const duplicateClaim = await claimInterviewTurn(sql, {
      interviewId: interview!.id,
      turnId: firstTurnId,
      content: "My first answer",
    });
    const overlappingClaim = await claimInterviewTurn(sql, {
      interviewId: interview!.id,
      turnId: secondTurnId,
      content: "A competing answer",
    });

    expect(firstClaim).not.toBeNull();
    expect(duplicateClaim).toBeNull();
    expect(overlappingClaim).toBeNull();

    await failInterviewTurn(sql, { interviewId: interview!.id, turnId: firstTurnId });
    const messagesAfterFailure = await getInterviewMessagesByInterviewId(sql, {
      interviewId: interview!.id,
    });
    expect(messagesAfterFailure).toEqual([]);

    const retryClaim = await claimInterviewTurn(sql, {
      interviewId: interview!.id,
      turnId: firstTurnId,
      content: "My first answer",
    });
    expect(retryClaim?.id).toBe(firstClaim?.id);

    const assistantMessage = await completeInterviewTurnWithAssistant(sql, {
      interviewId: interview!.id,
      turnId: firstTurnId,
      content: "Thanks. Tell me about another project.",
    });
    const duplicateAssistant = await completeInterviewTurnWithAssistant(sql, {
      interviewId: interview!.id,
      turnId: firstTurnId,
      content: "This duplicate must not be persisted.",
    });
    expect(assistantMessage).not.toBeNull();
    expect(duplicateAssistant).toBeNull();

    const nextClaim = await claimInterviewTurn(sql, {
      interviewId: interview!.id,
      turnId: secondTurnId,
      content: "My next answer",
    });
    expect(nextClaim).not.toBeNull();
  });

  it("atomically persists a closing response and submits the interview for voice", async () => {
    const setup = await makeApplication();
    const interview = await createInterview(sql, {
      applicationId: setup.applicationId,
      agentId: null,
      type: "full",
      metadata: {},
      status: "in_progress",
      invitedAt: new Date(),
      startedAt: new Date(),
      completedAt: null,
    });
    const turnId = crypto.randomUUID();

    await claimInterviewTurn(sql, {
      interviewId: interview!.id,
      turnId,
      content: "That covers everything from my side.",
    });
    const closingMessage = await completeInterviewTurnWithAssistantAndSubmitForVoice(sql, {
      interviewId: interview!.id,
      turnId,
      content: "Thanks for your thoughtful answers, Amina. Take care.",
    });
    const duplicateClosing = await completeInterviewTurnWithAssistantAndSubmitForVoice(sql, {
      interviewId: interview!.id,
      turnId,
      content: "This duplicate must not be persisted.",
    });
    const candidateView = await getInterviewForCandidateById(sql, {
      id: interview!.id,
      candidateId: setup.candidateId,
    });
    const messages = await getInterviewMessagesByInterviewId(sql, {
      interviewId: interview!.id,
    });

    expect(closingMessage?.content).toBe("Thanks for your thoughtful answers, Amina. Take care.");
    expect(duplicateClosing).toBeNull();
    expect(candidateView?.status).toBe("awaiting_voice");
    expect(messages.map((message) => message.content)).toEqual([
      "That covers everything from my side.",
      "Thanks for your thoughtful answers, Amina. Take care.",
    ]);
  });

  it("atomically claims one greeting and hides it until generation completes", async () => {
    const setup = await makeApplication();
    const interview = await createInterview(sql, {
      applicationId: setup.applicationId,
      agentId: null,
      type: "full",
      metadata: {},
      status: "in_progress",
      invitedAt: new Date(),
      startedAt: new Date(),
      completedAt: null,
    });

    const firstClaim = await claimInterviewGreeting(sql, { interviewId: interview!.id });
    const duplicateClaim = await claimInterviewGreeting(sql, { interviewId: interview!.id });
    const messagesWhileGenerating = await getInterviewMessagesByInterviewId(sql, {
      interviewId: interview!.id,
    });

    expect(firstClaim).not.toBeNull();
    expect(duplicateClaim).toBeNull();
    expect(messagesWhileGenerating).toEqual([]);

    const greeting = await completeInterviewGreeting(sql, {
      interviewId: interview!.id,
      content: "Welcome, Amina. Tell me about a project you owned.",
    });
    const visibleMessages = await getInterviewMessagesByInterviewId(sql, {
      interviewId: interview!.id,
    });

    expect(greeting?.content).toBe("Welcome, Amina. Tell me about a project you owned.");
    expect(visibleMessages).toHaveLength(1);
    expect(visibleMessages[0]?.content).toBe(greeting?.content);

    const duplicateGreeting = await createInterviewMessage(sql, {
      interviewId: interview!.id,
      turnId: "greeting",
      role: "assistant",
      content: "This duplicate must not be persisted.",
    });
    expect(duplicateGreeting).toBeNull();
  });
});

describe("report-ready notification payload", () => {
  it("stores company owner report_ready notifications", async () => {
    const setup = await makeApplication();

    const created = await createNotification(sql, {
      userId: setup.companyOwnerId,
      type: "report_ready",
      payload: {
        applicationId: setup.applicationId,
        jobId: crypto.randomUUID(),
        jobTitle: "Platform Engineer",
        candidateName: "Amina Shah",
        score: 8.4,
      },
    });

    expect(created).not.toBeNull();

    const items = await getNotificationsByUser(sql, {
      userId: setup.companyOwnerId,
      limit: "10",
    });

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("report_ready");
    const payload = items[0].payload as { score?: number; candidateName?: string };
    expect(payload.score).toBe(8.4);
    expect(payload.candidateName).toBe("Amina Shah");
  });
});
