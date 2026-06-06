import { describe, expect, it } from "vitest";
import { createApplication } from "@/features/applications/queries/queries_sql";
import {
  createNotification,
  getNotificationsByUser,
} from "@/features/notifications/queries/queries_sql";
import { getTestDb, makeTestResumeKey, seedCompany, seedUser } from "@/shared/__tests__/test-utils";
import {
  completeInterview,
  createInterview,
  getInterviewContextById,
  getInterviewForCandidateById,
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

    const completed = await completeInterview(sql, { id: interview!.id });
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
        score: 84,
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
    expect(payload.score).toBe(84);
    expect(payload.candidateName).toBe("Amina Shah");
  });
});
