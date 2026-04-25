import { describe, expect, it } from "vitest";
import { archiveJob, createJob } from "@/features/jobs/queries/queries_sql";
import { getTestDb, makeTestResumeKey, seedCompany, seedUser } from "@/shared/__tests__/test-utils";
import { isValidTransition } from "@/shared/enums";
import {
  createApplication,
  getApplicationById,
  getApplicationByJobAndCandidate,
  getApplicationReviewById,
  updateApplicationStatus,
} from "../queries/queries_sql";

const sql = getTestDb();

/** Helper to create an open job. */
const makeOpenJob = async (companyId: string, title = "Open Job") => {
  const job = await createJob(sql, {
    companyId,
    title,
    description: "Test",
    requirements: [],
    interviewQuestions: [],
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

  it("pre_screening → interview_invited (valid)", async () => {
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

    const updated = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "interview_invited",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("interview_invited");
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

  it("full lifecycle: applied → pre_screening → interview_invited → interview_in_progress → evaluated → rejected", async () => {
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

    const step2 = await updateApplicationStatus(sql, { id: app!.id, status: "interview_invited" });
    expect(step2!.status).toBe("interview_invited");

    const step3 = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "interview_in_progress",
    });
    expect(step3!.status).toBe("interview_in_progress");

    const step4 = await updateApplicationStatus(sql, { id: app!.id, status: "evaluated" });
    expect(step4!.status).toBe("evaluated");

    const step5 = await updateApplicationStatus(sql, { id: app!.id, status: "rejected" });
    expect(step5!.status).toBe("rejected");
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
