import { describe, expect, it } from "vitest";
import { getNotificationsByUser } from "@/features/notifications/queries/queries_sql";
import {
  getTestDb,
  makeTestResumeKey,
  seedCandidateProfile,
  seedCompany,
  seedJob,
  seedUser,
} from "@/shared/__tests__/test-utils";
import { createApplication } from "../queries/queries_sql";
import { applyToJobWorkflow, updateApplicationStatusWorkflow } from "../services/workflows";

const sql = getTestDb();

describe("application notification workflows", () => {
  it("does not create new_applicant notification — pre-evaluation runs async instead", async () => {
    const { company, owner } = await seedCompany({
      name: "Northstar",
    });
    const candidate = await seedUser({
      name: "Ava Malik",
      role: "candidate",
    });
    const { job } = await seedJob({
      companyId: company.id,
      title: "Platform Engineer",
      status: "open",
    });
    await seedCandidateProfile({
      userId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id, "ava-malik.pdf"),
    });

    const { application } = await applyToJobWorkflow(sql, {
      userId: candidate.id,
      jobId: job.id,
    });

    const notifications = await getNotificationsByUser(sql, {
      userId: owner.id,
      limit: "10",
    });

    expect(notifications).toHaveLength(0);
    expect(application.status).toBe("applied");
  });

  it("keeps the status workflow successful even if email delivery fails", async () => {
    const { company, owner } = await seedCompany({
      name: "Orbit",
    });
    const candidate = await seedUser({
      role: "candidate",
    });
    const { job } = await seedJob({
      companyId: company.id,
      title: "Frontend Engineer",
      status: "open",
    });
    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id, "frontend-resume.pdf"),
      metadata: {},
      status: "applied",
    });
    expect(application).not.toBeNull();
    if (!application) {
      return;
    }

    await updateApplicationStatusWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        status: "pre_screening",
      },
      {
        sendNotificationEmail: async () => {
          throw new Error("Resend rejected request");
        },
      },
    );

    const notifications = await getNotificationsByUser(sql, {
      userId: candidate.id,
      limit: "10",
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("application_status_changed");
    expect(notifications[0].readAt).toBeNull();
    expect(notifications[0].payload).toEqual({
      applicationId: application.id,
      jobId: job.id,
      jobTitle: "Frontend Engineer",
      companyName: "Orbit",
      status: "pre_screening",
    });
    expect(notifications[0].emailDeliveryStatus).toBe("failed");
    expect(notifications[0].emailDeliveryAttemptedAt).toBeInstanceOf(Date);
    expect(notifications[0].emailDeliverySentAt).toBeNull();
    expect(notifications[0].emailDeliveryError).toContain("Resend rejected request");
  });

  it("sends followups_requested notification with questionnaire metadata", async () => {
    const { company, owner } = await seedCompany({
      name: "Flow Co",
    });
    const candidate = await seedUser({
      role: "candidate",
      name: "Sam Carter",
    });
    const { job } = await seedJob({
      companyId: company.id,
      title: "Operations Manager",
      status: "open",
    });

    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id, "ops-resume.pdf"),
      metadata: {},
      status: "pre_screening",
    });
    expect(application).not.toBeNull();
    if (!application) {
      return;
    }

    await updateApplicationStatusWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        status: "followups_requested",
      },
      {
        sendNotificationEmail: async () => {
          throw new Error("Resend rejected request");
        },
      },
    );

    const notifications = await getNotificationsByUser(sql, {
      userId: candidate.id,
      limit: "10",
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("followups_requested");
    expect(notifications[0].readAt).toBeNull();
    expect(notifications[0].payload).toEqual({
      applicationId: application.id,
      jobId: job.id,
      jobTitle: "Operations Manager",
      dueAt: expect.any(String),
      questionCount: 3,
    });
    const payload = notifications[0].payload as { dueAt: string };
    expect(Number.isNaN(new Date(payload.dueAt).getTime())).toBe(false);
    expect(notifications[0].emailDeliveryStatus).toBe("failed");
  });
});
