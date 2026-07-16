import { describe, expect, it } from "vitest";

import { getJobCapacityCounts } from "@/features/batches/queries/queries_sql";
import {
  createInterview,
  getInterviewByApplicationId,
} from "@/features/interviews/queries/queries_sql";
import { getNotificationsByUser } from "@/features/notifications/queries/queries_sql";
import {
  getTestDb,
  makeTestResumeKey,
  seedCandidateProfile,
  seedCompany,
  seedJob,
  seedUser,
} from "@/shared/__tests__/test-utils";

import { createApplication, getApplicationById } from "../queries/queries_sql";
import {
  applyToJobWorkflow,
  updateApplicationStatusWorkflow,
  withdrawApplicationWorkflow,
} from "../services/workflows";

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
          throw new Error("Email delivery failed");
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
          throw new Error("Email delivery failed");
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
          throw new Error("Email delivery failed");
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
          throw new Error("Email delivery failed");
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
          throw new Error("Email delivery failed");
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
          throw new Error("Email delivery failed");
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
          throw new Error("Email delivery failed");
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
    expect(notifications[0].emailDeliveryError).toContain("Email delivery failed");

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
          throw new Error("Email delivery failed");
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

  it("recovers an evaluation_failed application by manually inviting to interview", async () => {
    const { company, owner } = await seedCompany({ name: "Helios" });
    const candidate = await seedUser({ role: "candidate" });
    const { job } = await seedJob({
      companyId: company.id,
      title: "Backend Engineer",
      status: "open",
    });
    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id, "recovery-resume.pdf"),
      metadata: {},
      status: "evaluation_failed",
    });
    expect(application).not.toBeNull();
    if (!application) return;

    await updateApplicationStatusWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        status: "interview_invited",
      },
      {
        sendNotificationEmail: async () => {
          throw new Error("Email delivery failed");
        },
      },
    );

    const interview = await getInterviewByApplicationId(sql, { applicationId: application.id });
    expect(interview).not.toBeNull();
    expect(interview!.status).toBe("pending");

    const notifications = await getNotificationsByUser(sql, {
      userId: candidate.id,
      limit: "10",
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("interview_invited");

    const capacity = await getJobCapacityCounts(sql, { jobId: job.id });
    expect(capacity?.reservedCount).toBe(1);
  });

  it("rejects a manual invite at zero remaining capacity without partial state", async () => {
    const { company, owner } = await seedCompany({ name: "Full House" });
    const candidate = await seedUser({ role: "candidate" });
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await sql`UPDATE jobs SET final_report_target = 0 WHERE id = ${job.id}`;
    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id, "full.pdf"),
      metadata: {},
      status: "pre_screening",
    });
    expect(application).not.toBeNull();
    if (!application) return;

    await expect(
      updateApplicationStatusWorkflow(sql, {
        userId: owner.id,
        applicationId: application.id,
        status: "interview_invited",
      }),
    ).rejects.toThrow("No interview capacity remains");

    expect((await getApplicationById(sql, { id: application.id }))?.status).toBe("pre_screening");
    expect(await getInterviewByApplicationId(sql, { applicationId: application.id })).toBeNull();
  });

  it("resets the existing interview when re-inviting after expiry", async () => {
    const { company, owner } = await seedCompany({ name: "Revive" });
    const candidate = await seedUser({ role: "candidate" });
    const { job } = await seedJob({
      companyId: company.id,
      title: "Staff Engineer",
      status: "open",
    });
    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id, "staff.pdf"),
      metadata: {},
      status: "evaluation_failed",
    });
    expect(application).not.toBeNull();
    if (!application) return;

    const expiredInterview = await createInterview(sql, {
      applicationId: application.id,
      agentId: null,
      type: "full",
      metadata: { expiresAt: new Date(Date.now() - 60_000).toISOString() },
      status: "expired",
      invitedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      startedAt: null,
      completedAt: null,
    });
    expect(expiredInterview).not.toBeNull();
    if (!expiredInterview) return;

    await updateApplicationStatusWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        status: "interview_invited",
      },
      {
        sendNotificationEmail: async () => {
          throw new Error("Email delivery failed");
        },
      },
    );

    const latestInterview = await getInterviewByApplicationId(sql, {
      applicationId: application.id,
    });
    expect(latestInterview).not.toBeNull();
    expect(latestInterview!.id).toBe(expiredInterview.id);
    expect(latestInterview!.status).toBe("pending");
    const notifications = await getNotificationsByUser(sql, {
      userId: candidate.id,
      limit: "10",
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("interview_invited");
  });

  it("does not reinvite a completed interview", async () => {
    const { company, owner } = await seedCompany({ name: "Complete" });
    const candidate = await seedUser({ role: "candidate" });
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id, "complete.pdf"),
      metadata: {},
      status: "evaluation_failed",
    });
    expect(application).not.toBeNull();
    if (!application) return;
    const interview = await createInterview(sql, {
      applicationId: application.id,
      agentId: null,
      type: "full",
      metadata: {},
      status: "completed",
      invitedAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(),
    });

    await expect(
      updateApplicationStatusWorkflow(sql, {
        userId: owner.id,
        applicationId: application.id,
        status: "interview_invited",
      }),
    ).rejects.toThrow("post-evaluation");
    expect((await getApplicationById(sql, { id: application.id }))?.status).toBe(
      "evaluation_failed",
    );
    expect((await getInterviewByApplicationId(sql, { applicationId: application.id }))?.id).toBe(
      interview?.id,
    );
  });

  it("cancels unfinished work and backfills after a company rejection commits", async () => {
    const { company, owner } = await seedCompany({ name: "Decisive" });
    const candidate = await seedUser({ role: "candidate" });
    const backup = await seedUser({ role: "candidate" });
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await sql`UPDATE jobs SET final_report_target = 1 WHERE id = ${job.id}`;
    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "interview_invited",
    });
    const waitlisted = await createApplication(sql, {
      jobId: job.id,
      candidateId: backup.id,
      resumeKey: makeTestResumeKey(backup.id),
      metadata: {},
      status: "queued_for_batch",
    });
    const interview = await createInterview(sql, {
      applicationId: application!.id,
      agentId: null,
      type: "full",
      metadata: { expiresAt: new Date(Date.now() + 60_000).toISOString() },
      status: "pending",
      invitedAt: new Date(),
      startedAt: null,
      completedAt: null,
    });

    await updateApplicationStatusWorkflow(sql, {
      userId: owner.id,
      applicationId: application!.id,
      status: "rejected",
    });

    expect((await getApplicationById(sql, { id: application!.id }))?.status).toBe("rejected");
    expect(
      (await getInterviewByApplicationId(sql, { applicationId: application!.id }))?.status,
    ).toBe("cancelled");
    expect((await getApplicationById(sql, { id: waitlisted!.id }))?.status).toBe(
      "interview_invited",
    );
    expect(interview).not.toBeNull();
    expect(await getJobCapacityCounts(sql, { jobId: job.id })).toMatchObject({
      deliveredCount: 0,
      reservedCount: 1,
    });
  });

  it("withdraws and backfills an unfinished candidate atomically", async () => {
    const { company, owner } = await seedCompany({ name: "Backfill" });
    const candidate = await seedUser({ role: "candidate" });
    const backup = await seedUser({ role: "candidate" });
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await sql`UPDATE jobs SET final_report_target = 1 WHERE id = ${job.id}`;
    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "interview_invited",
    });
    const waitlisted = await createApplication(sql, {
      jobId: job.id,
      candidateId: backup.id,
      resumeKey: makeTestResumeKey(backup.id),
      metadata: {},
      status: "queued_for_batch",
    });
    await createInterview(sql, {
      applicationId: application!.id,
      agentId: null,
      type: "full",
      metadata: { expiresAt: new Date(Date.now() + 60_000).toISOString() },
      status: "pending",
      invitedAt: new Date(),
      startedAt: null,
      completedAt: null,
    });

    await withdrawApplicationWorkflow(sql, {
      userId: candidate.id,
      applicationId: application!.id,
    });

    expect((await getApplicationById(sql, { id: application!.id }))?.status).toBe("withdrawn");
    expect(
      (await getInterviewByApplicationId(sql, { applicationId: application!.id }))?.status,
    ).toBe("cancelled");
    expect((await getApplicationById(sql, { id: waitlisted!.id }))?.status).toBe(
      "interview_invited",
    );
    expect(await getJobCapacityCounts(sql, { jobId: job.id })).toMatchObject({
      deliveredCount: 0,
      reservedCount: 1,
    });
    const ownerNotifications = await getNotificationsByUser(sql, {
      userId: owner.id,
      limit: "10",
    });
    expect(ownerNotifications.map((notification) => notification.type)).toContain(
      "application_withdrawn",
    );
  });

  it("rejects withdrawal after the interview has completed", async () => {
    const { company } = await seedCompany({ name: "Committed" });
    const candidate = await seedUser({ role: "candidate" });
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "interview_in_progress",
    });
    await createInterview(sql, {
      applicationId: application!.id,
      agentId: null,
      type: "full",
      metadata: {},
      status: "completed",
      invitedAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(),
    });

    await expect(
      withdrawApplicationWorkflow(sql, {
        userId: candidate.id,
        applicationId: application!.id,
      }),
    ).rejects.toThrow("evaluation can no longer be withdrawn");
    expect((await getApplicationById(sql, { id: application!.id }))?.status).toBe(
      "interview_in_progress",
    );
    expect(await getJobCapacityCounts(sql, { jobId: job.id })).toMatchObject({
      deliveredCount: 0,
      reservedCount: 1,
    });
  });
});
