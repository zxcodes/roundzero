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

  it("creates candidate notifications only for important decision statuses", async () => {
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

    const noDecisionNotifications = await getNotificationsByUser(sql, {
      userId: candidate.id,
      limit: "10",
    });

    expect(noDecisionNotifications).toHaveLength(0);

    await updateApplicationStatusWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        status: "queued_for_batch",
      },
      {
        sendNotificationEmail: async () => {
          throw new Error("Resend rejected request");
        },
      },
    );

    await updateApplicationStatusWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        status: "interview_invited",
      },
      {
        sendNotificationEmail: async () => {
          throw new Error("Resend rejected request");
        },
      },
    );

    const interviewNotifications = await getNotificationsByUser(sql, {
      userId: candidate.id,
      limit: "10",
    });

    expect(interviewNotifications).toHaveLength(1);
    expect(interviewNotifications[0].type).toBe("interview_invited");

    await updateApplicationStatusWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        status: "interview_in_progress",
      },
      {
        sendNotificationEmail: async () => {
          throw new Error("Resend rejected request");
        },
      },
    );

    await updateApplicationStatusWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        status: "evaluated_held",
      },
      {
        sendNotificationEmail: async () => {
          throw new Error("Resend rejected request");
        },
      },
    );

    await updateApplicationStatusWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        status: "evaluated",
      },
      {
        sendNotificationEmail: async () => {
          throw new Error("Resend rejected request");
        },
      },
    );

    await updateApplicationStatusWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        status: "shortlisted",
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

    expect(notifications).toHaveLength(2);
    expect(notifications[0].type).toBe("application_status_changed");
    expect(notifications[0].readAt).toBeNull();
    expect(notifications[0].payload).toEqual({
      applicationId: application.id,
      jobId: job.id,
      jobTitle: "Frontend Engineer",
      companyName: "Orbit",
      status: "shortlisted",
    });
    expect(notifications[0].emailDeliveryStatus).toBe("failed");
    expect(notifications[0].emailDeliveryAttemptedAt).toBeInstanceOf(Date);
    expect(notifications[0].emailDeliverySentAt).toBeNull();
    expect(notifications[0].emailDeliveryError).toContain("Resend rejected request");

    expect(notifications[1].type).toBe("interview_invited");

    const rejectedCandidate = await seedUser({
      role: "candidate",
    });

    const rejectionApplication = await createApplication(sql, {
      jobId: job.id,
      candidateId: rejectedCandidate.id,
      resumeKey: makeTestResumeKey(rejectedCandidate.id, "frontend-resume-2.pdf"),
      metadata: {},
      status: "applied",
    });
    expect(rejectionApplication).not.toBeNull();
    if (!rejectionApplication) {
      return;
    }

    await updateApplicationStatusWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: rejectionApplication.id,
        status: "rejected",
      },
      {
        sendNotificationEmail: async () => {
          throw new Error("Resend rejected request");
        },
      },
    );

    const rejectionNotifications = await getNotificationsByUser(sql, {
      userId: rejectedCandidate.id,
      limit: "10",
    });

    expect(rejectionNotifications[0].type).toBe("application_status_changed");
    expect(rejectionNotifications[0].payload).toEqual({
      applicationId: rejectionApplication.id,
      jobId: job.id,
      jobTitle: "Frontend Engineer",
      companyName: "Orbit",
      status: "rejected",
    });
  });
});
