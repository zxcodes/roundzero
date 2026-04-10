import { describe, expect, it } from "vitest";
import { getNotificationsByUser } from "@/features/notifications/queries/queries_sql";
import type { NotificationEmailSender } from "@/features/notifications/services/email";
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
  it("creates a new applicant notification and records delivered email state", async () => {
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

    const onSendNotificationEmail: NotificationEmailSender = async (message) => {
      expect(message.to).toBe(owner.email);
      expect(message.subject).toBe("New applicant for Platform Engineer");
      expect(message.react).toBeTruthy();

      return {
        providerMessageId: "re_new_applicant_123",
      };
    };

    const { application } = await applyToJobWorkflow(
      sql,
      {
        userId: candidate.id,
        jobId: job.id,
      },
      {
        sendNotificationEmail: onSendNotificationEmail,
      },
    );

    const notifications = await getNotificationsByUser(sql, {
      userId: owner.id,
      limit: "10",
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("new_applicant");
    expect(notifications[0].readAt).toBeNull();
    expect(notifications[0].payload).toEqual({
      applicationId: application.id,
      jobId: job.id,
      jobTitle: "Platform Engineer",
      candidateName: "Ava Malik",
    });
    expect(notifications[0].emailDeliveryStatus).toBe("sent");
    expect(notifications[0].emailDeliverySentAt).toBeInstanceOf(Date);
    expect(notifications[0].emailProviderMessageId).toBe("re_new_applicant_123");
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
        status: "interviewing",
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
      status: "interviewing",
    });
    expect(notifications[0].emailDeliveryStatus).toBe("failed");
    expect(notifications[0].emailDeliveryAttemptedAt).toBeInstanceOf(Date);
    expect(notifications[0].emailDeliverySentAt).toBeNull();
    expect(notifications[0].emailDeliveryError).toContain("Resend rejected request");
  });
});
