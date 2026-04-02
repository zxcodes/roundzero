import { describe, expect, it } from "vitest";
import { archiveJob, createJob } from "@/features/jobs/queries/queries_sql";
import { getTestDb, seedCompany, seedUser } from "@/shared/__tests__/test-utils";
import { isValidTransition } from "@/shared/enums";
import {
  createApplication,
  getApplicationById,
  getApplicationByJobAndCandidate,
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
      resumeKey: "https://example.com/resume.pdf",
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
      resumeKey: "https://example.com/resume.pdf",
      metadata: {},
      status: "applied",
    });

    await expect(
      createApplication(sql, {
        jobId: job.id,
        candidateId: candidate.id,
        resumeKey: "https://example.com/resume.pdf",
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
        resumeKey: "https://example.com/resume.pdf",
        metadata: {},
        status: "applied",
      }),
    ).rejects.toThrow();
  });
});

// ─── Status transition logic ────────────────────────────────────

describe("application status transitions", () => {
  it("applied → interviewing (valid)", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: "https://example.com/resume.pdf",
      metadata: {},
      status: "applied",
    });

    expect(isValidTransition("applied", "interviewing")).toBe(true);

    const updated = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "interviewing",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("interviewing");
  });

  it("applied → evaluated (invalid — skips step)", async () => {
    expect(isValidTransition("applied", "evaluated")).toBe(false);
  });

  it("interviewing → evaluated (valid)", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: "https://example.com/resume.pdf",
      metadata: {},
      status: "applied",
    });
    await updateApplicationStatus(sql, { id: app!.id, status: "interviewing" });

    expect(isValidTransition("interviewing", "evaluated")).toBe(true);

    const updated = await updateApplicationStatus(sql, {
      id: app!.id,
      status: "evaluated",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("evaluated");
  });

  it("rejected is terminal — DB still allows update but business logic blocks it", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: "https://example.com/resume.pdf",
      metadata: {},
      status: "applied",
    });
    await updateApplicationStatus(sql, { id: app!.id, status: "rejected" });

    // Business logic prevents any transition from rejected
    expect(isValidTransition("rejected", "applied")).toBe(false);
    expect(isValidTransition("rejected", "interviewing")).toBe(false);
    expect(isValidTransition("rejected", "evaluated")).toBe(false);
    expect(isValidTransition("rejected", "rejected")).toBe(false);
  });

  it("full lifecycle: applied → interviewing → evaluated → rejected", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: "https://example.com/resume.pdf",
      metadata: {},
      status: "applied",
    });

    const step1 = await updateApplicationStatus(sql, { id: app!.id, status: "interviewing" });
    expect(step1!.status).toBe("interviewing");

    const step2 = await updateApplicationStatus(sql, { id: app!.id, status: "evaluated" });
    expect(step2!.status).toBe("evaluated");

    const step3 = await updateApplicationStatus(sql, { id: app!.id, status: "rejected" });
    expect(step3!.status).toBe("rejected");
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
      resumeKey: "https://example.com/resume.pdf",
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
      resumeKey: "https://example.com/resume.pdf",
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
      resumeKey: "https://example.com/resume.pdf",
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
      resumeKey: "https://example.com/resume.pdf",
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
