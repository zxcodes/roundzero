import { describe, expect, it } from "vitest";
import { archiveJob, createJob } from "@/features/jobs/queries/queries_sql";
import { getNotificationsByUser } from "@/features/notifications/queries/queries_sql";
import { getTestDb, makeTestResumeKey, seedCompany, seedUser } from "@/shared/__tests__/test-utils";
import { isValidTransition } from "@/shared/enums";
import {
  createApplication,
  getApplicationById,
  getApplicationByJobAndCandidate,
  getApplicationReviewById,
  updateApplicationStatus,
} from "../queries/queries_sql";
import { shortlistApplicantWorkflow } from "../services/workflows";

const sql = getTestDb();
const noopNotificationEmail = async () => ({ providerMessageId: null });

/** Helper to create an open job. */
const makeOpenJob = async (companyId: string, title = "Open Job") => {
  const job = await createJob(sql, {
    companyId,
    title,
    description: "Test",
    requirements: [],
    screeningQuestions: [],
    status: "open",
    location: null,
    workplaceType: null,
    employmentType: null,
    experienceLevel: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: "USD",
    teamSize: null,
    headcount: null,
    expiresAt: null,
    finalReportTarget: 5,
  });
  return job!;
};

// ─── Application guard logic ────────────────────────────────────
// These test the business rules that the server functions enforce.

describe("apply to job — guard logic", () => {
  it("candidate can apply to an open job", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);

    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    expect(app).not.toBeNull();
    expect(app!.status).toBe("applied");
  });

  it("duplicate application is rejected by DB constraint", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);

    await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    await expect(
      createApplication(sql, {
        jobId: job.id,
        candidateId: candidate.id,
        resumeKey: makeTestResumeKey(candidate.id),
        metadata: {},
        status: "applied",
      }),
    ).rejects.toThrow();
  });

  it("application to non-existent job fails (FK constraint)", async () => {
    const candidate = await seedUser({ role: "candidate" });

    await expect(
      createApplication(sql, {
        jobId: "00000000-0000-0000-0000-000000000000",
        candidateId: candidate.id,
        resumeKey: makeTestResumeKey(candidate.id),
        metadata: {},
        status: "applied",
      }),
    ).rejects.toThrow();
  });
});

// ─── Status transition logic ────────────────────────────────────

describe("application status transitions", () => {
  it("applied → pre_screening (valid)", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    expect(isValidTransition("applied", "pre_screening")).toBe(true);

    const updated = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "pre_screening",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("pre_screening");
  });

  it("applied → evaluated (invalid — skips step)", async () => {
    expect(isValidTransition("applied", "evaluated")).toBe(false);
  });

  it("pre_screening → queued_for_batch (valid)", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await updateApplicationStatus(sql, { id: app!.id, status: "pre_screening" });

    expect(isValidTransition("pre_screening", "queued_for_batch")).toBe(true);

    const updated = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "queued_for_batch",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("queued_for_batch");
  });

  it("queued_for_batch → interview_invited (valid)", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await updateApplicationStatus(sql, { id: app!.id, status: "pre_screening" });
    await updateApplicationStatus(sql, { id: app!.id, status: "queued_for_batch" });

    expect(isValidTransition("queued_for_batch", "interview_invited")).toBe(true);

    const updated = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "interview_invited",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("interview_invited");
  });

  it("pre_screening → interview_invited is valid for manual company invites", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await updateApplicationStatus(sql, { id: app!.id, status: "pre_screening" });

    expect(isValidTransition("pre_screening", "interview_invited")).toBe(true);
  });

  it("rejected is terminal — DB still allows update but business logic blocks it", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await updateApplicationStatus(sql, { id: app!.id, status: "rejected" });

    // Business logic prevents any transition from rejected
    expect(isValidTransition("rejected", "applied")).toBe(false);
    expect(isValidTransition("rejected", "interview_invited")).toBe(false);
    expect(isValidTransition("rejected", "evaluated")).toBe(false);
    expect(isValidTransition("rejected", "rejected")).toBe(false);
  });

  it("interview_in_progress → evaluated_held (valid)", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await updateApplicationStatus(sql, { id: app!.id, status: "interview_invited" });
    await updateApplicationStatus(sql, { id: app!.id, status: "interview_in_progress" });

    expect(isValidTransition("interview_in_progress", "evaluated_held")).toBe(true);

    const updated = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "evaluated_held",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("evaluated_held");
  });

  it("evaluated_held → evaluated (valid — batch release)", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await updateApplicationStatus(sql, { id: app!.id, status: "interview_in_progress" });
    await updateApplicationStatus(sql, { id: app!.id, status: "evaluated_held" });

    expect(isValidTransition("evaluated_held", "evaluated")).toBe(true);

    const updated = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "evaluated",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("evaluated");
  });

  it("evaluated_held → rejected (valid)", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await updateApplicationStatus(sql, { id: app!.id, status: "interview_in_progress" });
    await updateApplicationStatus(sql, { id: app!.id, status: "evaluated_held" });

    expect(isValidTransition("evaluated_held", "rejected")).toBe(true);

    const updated = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "rejected",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("rejected");
  });

  it("full lifecycle: applied → pre_screening → queued_for_batch → interview_invited → interview_in_progress → evaluated_held → evaluated → rejected", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    const step1 = await updateApplicationStatus(sql, { id: app!.id, status: "pre_screening" });
    expect(step1!.status).toBe("pre_screening");

    const step2 = await updateApplicationStatus(sql, { id: app!.id, status: "queued_for_batch" });
    expect(step2!.status).toBe("queued_for_batch");

    const step3 = await updateApplicationStatus(sql, { id: app!.id, status: "interview_invited" });
    expect(step3!.status).toBe("interview_invited");

    const step4 = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "interview_in_progress",
    });
    expect(step4!.status).toBe("interview_in_progress");

    const step5 = await updateApplicationStatus(sql, { id: app!.id, status: "evaluated_held" });
    expect(step5!.status).toBe("evaluated_held");

    const step6 = await updateApplicationStatus(sql, { id: app!.id, status: "evaluated" });
    expect(step6!.status).toBe("evaluated");

    const step7 = await updateApplicationStatus(sql, { id: app!.id, status: "rejected" });
    expect(step7!.status).toBe("rejected");
  });
});

describe("shortlist workflow", () => {
  it("shortlists once, edits silently by default, and re-notifies when requested", async () => {
    const { company, owner } = await seedCompany({ name: "Orbit Labs" });
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id, "Platform Engineer");
    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "evaluated",
    });

    expect(application).not.toBeNull();
    if (!application) {
      return;
    }

    await shortlistApplicantWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        note: "Loved the systems answers.",
        notify: false,
      },
      { sendNotificationEmail: noopNotificationEmail },
    );

    const afterFirstShortlist = await getApplicationById(sql, { id: application.id });
    const firstNotifications = await getNotificationsByUser(sql, {
      userId: candidate.id,
      limit: "10",
    });

    expect(afterFirstShortlist?.status).toBe("shortlisted");
    expect(afterFirstShortlist?.metadata).toMatchObject({
      shortlist: {
        note: "Loved the systems answers.",
      },
    });
    expect(firstNotifications).toHaveLength(1);
    expect(firstNotifications[0].payload).toEqual({
      applicationId: application.id,
      jobId: job.id,
      jobTitle: "Platform Engineer",
      companyName: "Orbit Labs",
      status: "shortlisted",
      note: "Loved the systems answers.",
      isShortlistUpdate: false,
    });

    await shortlistApplicantWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        note: "Please book the team panel.",
        notify: false,
      },
      { sendNotificationEmail: noopNotificationEmail },
    );

    const afterSilentEdit = await getApplicationById(sql, { id: application.id });
    const afterSilentEditNotifications = await getNotificationsByUser(sql, {
      userId: candidate.id,
      limit: "10",
    });

    expect(afterSilentEdit?.metadata).toMatchObject({
      shortlist: {
        note: "Please book the team panel.",
      },
    });
    expect(afterSilentEditNotifications).toHaveLength(1);

    await shortlistApplicantWorkflow(
      sql,
      {
        userId: owner.id,
        applicationId: application.id,
        note: "Panel updated for Thursday.",
        notify: true,
      },
      { sendNotificationEmail: noopNotificationEmail },
    );

    const afterNotifyEditNotifications = await getNotificationsByUser(sql, {
      userId: candidate.id,
      limit: "10",
    });

    expect(afterNotifyEditNotifications).toHaveLength(2);
    expect(afterNotifyEditNotifications[0].payload).toEqual({
      applicationId: application.id,
      jobId: job.id,
      jobTitle: "Platform Engineer",
      companyName: "Orbit Labs",
      status: "shortlisted",
      note: "Panel updated for Thursday.",
      isShortlistUpdate: true,
    });
  });

  it("blocks non-owner companies from shortlisting", async () => {
    const { company } = await seedCompany({ name: "Owner Co" });
    const { owner: otherOwner } = await seedCompany({ name: "Other Co" });
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id, "Backend Engineer");
    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "evaluated",
    });

    expect(application).not.toBeNull();
    if (!application) {
      return;
    }

    await expect(
      shortlistApplicantWorkflow(
        sql,
        {
          userId: otherOwner.id,
          applicationId: application.id,
          note: "Not your role",
          notify: true,
        },
        { sendNotificationEmail: noopNotificationEmail },
      ),
    ).rejects.toThrow("Not authorized");
  });

  it("blocks invalid transitions into shortlisted", async () => {
    const { company, owner } = await seedCompany({ name: "Blocked Co" });
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id, "Product Engineer");
    const application = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    expect(application).not.toBeNull();
    if (!application) {
      return;
    }

    await expect(
      shortlistApplicantWorkflow(
        sql,
        {
          userId: owner.id,
          applicationId: application.id,
          note: "Too early",
          notify: true,
        },
        { sendNotificationEmail: noopNotificationEmail },
      ),
    ).rejects.toThrow('Cannot shortlist an application with status "applied"');
  });
});

// ─── Access control patterns ────────────────────────────────────

describe("application access control", () => {
  it("candidate can see their own application via getApplicationByJobAndCandidate", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    const found = await getApplicationByJobAndCandidate(sql, {
      jobId: job.id,
      candidateId: candidate.id,
    });
    expect(found).not.toBeNull();
    expect(found!.candidateId).toBe(candidate.id);
  });

  it("other candidate cannot see someone else's application", async () => {
    const { company } = await seedCompany();
    const candidate1 = await seedUser({ role: "candidate" });
    const candidate2 = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate1.id,
      resumeKey: makeTestResumeKey(candidate1.id),
      metadata: {},
      status: "applied",
    });

    const found = await getApplicationByJobAndCandidate(sql, {
      jobId: job.id,
      candidateId: candidate2.id,
    });
    expect(found).toBeNull();
  });

  it("getApplicationById includes job and company context for authorization", async () => {
    const { company } = await seedCompany({ name: "Auth Co" });
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id, "Auth Job");
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    const detail = await getApplicationById(sql, { id: app!.id });
    expect(detail).not.toBeNull();
    // These fields let server code verify ownership
    expect(detail!.candidateId).toBe(candidate.id);
    expect(detail!.jobId).toBe(job.id);
    expect(detail!.companyName).toBe("Auth Co");
    expect(detail!.jobTitle).toBe("Auth Job");
  });

  it("getApplicationReviewById exposes company ownership for applicant-review authorization", async () => {
    const { company } = await seedCompany({ name: "Auth Co", slug: "auth-co" });
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id, "Applicant Review Job");
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: { headline: "Backend Engineer" },
      status: "applied",
    });

    const detail = await getApplicationReviewById(sql, { id: app!.id });
    expect(detail).not.toBeNull();
    expect(detail!.companyId).toBe(company.id);
    expect(detail!.candidateId).toBe(candidate.id);
    expect(detail!.jobId).toBe(job.id);
  });
});

// ─── Withdrawal logic ───────────────────────────────────────────

describe("application withdrawal", () => {
  it("applied → withdrawn (valid)", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    expect(isValidTransition("applied", "withdrawn")).toBe(true);

    const updated = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "withdrawn",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("withdrawn");
  });

  it("interview_invited → withdrawn (valid)", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await updateApplicationStatus(sql, { id: app!.id, status: "interview_invited" });

    expect(isValidTransition("interview_invited", "withdrawn")).toBe(true);

    const updated = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "withdrawn",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("withdrawn");
  });

  it("evaluated → withdrawn (invalid)", () => {
    expect(isValidTransition("evaluated", "withdrawn")).toBe(false);
  });

  it("withdrawn is terminal", () => {
    expect(isValidTransition("withdrawn", "applied")).toBe(false);
    expect(isValidTransition("withdrawn", "interview_invited")).toBe(false);
  });
});

// ─── Archived job interactions ──────────────────────────────────

describe("applications on archived jobs", () => {
  it("application still exists after job is archived", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    await archiveJob(sql, { id: job.id, companyId: company.id });

    // Application detail still accessible
    const detail = await getApplicationById(sql, { id: app!.id });
    expect(detail).not.toBeNull();
    expect(detail!.jobStatus).toBe("closed");
  });
});
