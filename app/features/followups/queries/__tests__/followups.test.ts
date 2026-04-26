import { describe, expect, it } from "vitest";
import {
  createApplication,
  updateApplicationStatus,
} from "@/features/applications/queries/queries_sql";
import {
  createPreEvaluation,
  getPreEvaluationByApplicationId,
} from "@/features/pre-evaluations/queries/queries_sql";
import { getTestDb, makeTestResumeKey, seedCompany, seedUser } from "@/shared/__tests__/test-utils";
import {
  getApplicationFollowupByApplicationId,
  submitApplicationFollowupAnswers,
  upsertApplicationFollowup,
} from "../queries_sql";

const sql = getTestDb();

const makeOpenJob = async (companyId: string) => {
  const [job] = await sql`
    INSERT INTO jobs (
      company_id,
      title,
      description,
      requirements,
      interview_questions,
      status,
      final_report_target
    )
    VALUES (
      ${companyId},
      ${"Product Manager"},
      ${"Own roadmap and delivery"},
      ${[]},
      ${[]},
      ${"open"},
      ${5}
    )
    RETURNING id
  `;

  return job.id as string;
};

describe("followup queries", () => {
  it("upserts follow-up questionnaire and updates existing row", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const jobId = await makeOpenJob(company.id);

    const application = await createApplication(sql, {
      jobId,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "pre_screening",
    });
    expect(application).not.toBeNull();
    if (!application) {
      return;
    }

    const first = await upsertApplicationFollowup(sql, {
      applicationId: application.id,
      questions: [{ id: "q1", prompt: "Question 1", type: "long_text", required: true }],
      answers: [],
      status: "pending",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      submittedAt: null,
    });
    expect(first).not.toBeNull();

    const second = await upsertApplicationFollowup(sql, {
      applicationId: application.id,
      questions: [{ id: "q2", prompt: "Question 2", type: "short_text", required: true }],
      answers: [],
      status: "pending",
      dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      submittedAt: null,
    });
    expect(second).not.toBeNull();
    expect(second!.id).toBe(first!.id);
    expect(second!.questions).toEqual([
      { id: "q2", prompt: "Question 2", type: "short_text", required: true },
    ]);
  });

  it("submits answers and marks questionnaire submitted", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const jobId = await makeOpenJob(company.id);

    const application = await createApplication(sql, {
      jobId,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "followups_requested",
    });
    expect(application).not.toBeNull();
    if (!application) {
      return;
    }

    await upsertApplicationFollowup(sql, {
      applicationId: application.id,
      questions: [
        { id: "q1", prompt: "Question 1", type: "long_text", required: true },
        {
          id: "q2",
          prompt: "Question 2",
          type: "single_choice",
          required: true,
          options: ["A", "B"],
        },
      ],
      answers: [],
      status: "pending",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      submittedAt: null,
    });

    const saved = await submitApplicationFollowupAnswers(sql, {
      applicationId: application.id,
      answers: [
        { questionId: "q1", value: "Delivered roadmap planning across three teams." },
        { questionId: "q2", value: "A" },
      ],
    });

    expect(saved).not.toBeNull();
    expect(saved!.status).toBe("submitted");
    expect(saved!.submittedAt).toBeInstanceOf(Date);
    expect(saved!.answers).toEqual([
      { questionId: "q1", value: "Delivered roadmap planning across three teams." },
      { questionId: "q2", value: "A" },
    ]);
  });

  it("supports multiple pre-evaluations for same application after follow-up cycle", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const jobId = await makeOpenJob(company.id);

    const application = await createApplication(sql, {
      jobId,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "pre_screening",
    });
    expect(application).not.toBeNull();
    if (!application) {
      return;
    }

    await createPreEvaluation(sql, {
      applicationId: application.id,
      score: 62,
      missingRequirements: ["Stakeholder management"],
      confidence: "medium",
      nextStep: "ask_followups",
      consistencyScore: 78,
      rawResponse: { source: "first-pass" },
    });

    await updateApplicationStatus(sql, {
      id: application.id,
      status: "followups_requested",
    });

    await createPreEvaluation(sql, {
      applicationId: application.id,
      score: 79,
      missingRequirements: [],
      confidence: "high",
      nextStep: "interview_invited",
      consistencyScore: 89,
      rawResponse: { source: "after-followups" },
    });

    const latest = await getPreEvaluationByApplicationId(sql, {
      applicationId: application.id,
    });

    expect(latest).not.toBeNull();
    expect(latest!.score).toBe(79);
    expect(latest!.nextStep).toBe("interview_invited");
  });

  it("loads follow-up row by application id", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const jobId = await makeOpenJob(company.id);

    const application = await createApplication(sql, {
      jobId,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "pre_screening",
    });
    expect(application).not.toBeNull();
    if (!application) {
      return;
    }

    await upsertApplicationFollowup(sql, {
      applicationId: application.id,
      questions: [{ id: "q1", prompt: "Question 1", type: "long_text", required: true }],
      answers: [],
      status: "pending",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      submittedAt: null,
    });

    const followup = await getApplicationFollowupByApplicationId(sql, {
      applicationId: application.id,
    });

    expect(followup).not.toBeNull();
    expect(followup!.applicationId).toBe(application.id);
    expect(followup!.status).toBe("pending");
  });
});
