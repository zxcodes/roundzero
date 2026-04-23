import { describe, expect, it } from "vitest";
import { softDeleteUser } from "@/features/auth/queries/queries_sql";
import { archiveJob, createJob } from "@/features/jobs/queries/queries_sql";
import { getTestDb, makeTestResumeKey, seedCompany, seedUser } from "@/shared/__tests__/test-utils";
import {
  countApplicationsByCandidate,
  countApplicationsByCompany,
  createApplication,
  getApplicationById,
  getApplicationByJobAndCandidate,
  getApplicationCountByJob,
  getApplicationReviewById,
  getApplicationsByCandidate,
  getApplicationsByJob,
  updateApplicationStatus,
} from "../queries_sql";

const sql = getTestDb();

/** Helper to create an open job for application tests. */
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
    reportLimit: 5,
  });
  return job!;
};

describe("createApplication", () => {
  it("creates an application with status 'applied'", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);

    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: { headline: "Engineer", links: { github: "https://github.com/test" } },
      status: "applied",
    });

    expect(app).not.toBeNull();
    expect(app!.jobId).toBe(job.id);
    expect(app!.candidateId).toBe(candidate.id);
    expect(app!.resumeKey).toBe(makeTestResumeKey(candidate.id));
    expect(app!.metadata).toEqual({
      headline: "Engineer",
      links: { github: "https://github.com/test" },
    });
    expect(app!.status).toBe("applied");
    expect(app!.createdAt).toBeInstanceOf(Date);
  });

  it("creates an application with metadata snapshot", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);

    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: { skills: ["TypeScript"] },
      status: "applied",
    });

    expect(app).not.toBeNull();
    expect(app!.metadata).toEqual({ skills: ["TypeScript"] });
  });

  it("enforces unique(job_id, candidate_id) constraint", async () => {
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
});

describe("getApplicationByJobAndCandidate", () => {
  it("returns the application if it exists", async () => {
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
    expect(found!.jobId).toBe(job.id);
    expect(found!.candidateId).toBe(candidate.id);
  });

  it("returns null if no application exists", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);

    const found = await getApplicationByJobAndCandidate(sql, {
      jobId: job.id,
      candidateId: candidate.id,
    });
    expect(found).toBeNull();
  });
});

describe("getApplicationById", () => {
  it("returns application with job title and company name", async () => {
    const { company } = await seedCompany({ name: "Great Co" });
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id, "Frontend Dev");
    const created = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    const found = await getApplicationById(sql, { id: created!.id });
    expect(found).not.toBeNull();
    expect(found!.jobTitle).toBe("Frontend Dev");
    expect(found!.companyName).toBe("Great Co");
    expect(found!.jobStatus).toBe("open");
    expect(found!.companyOwnerDeleted).toBe(false);
  });

  it("returns null for non-existent id", async () => {
    const found = await getApplicationById(sql, {
      id: "00000000-0000-0000-0000-000000000000",
    });
    expect(found).toBeNull();
  });

  it("sets companyOwnerDeleted when the company owner was soft-deleted", async () => {
    const { company, owner } = await seedCompany({ name: "Deleted Co" });
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const created = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await softDeleteUser(sql, { id: owner.id });

    const found = await getApplicationById(sql, { id: created!.id });
    expect(found).not.toBeNull();
    expect(found!.companyOwnerDeleted).toBe(true);
  });
});

describe("getApplicationReviewById", () => {
  it("returns application review context with candidate and company ownership fields", async () => {
    const { company } = await seedCompany({ name: "Review Co", slug: "review-co" });
    const candidate = await seedUser({
      name: "Nadia Malik",
      email: "nadia@example.com",
      role: "candidate",
    });
    const job = await makeOpenJob(company.id, "Platform Engineer");
    const created = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: { headline: "Senior Engineer" },
      status: "applied",
    });

    const found = await getApplicationReviewById(sql, { id: created!.id });
    expect(found).not.toBeNull();
    expect(found!.candidateName).toBe("Nadia Malik");
    expect(found!.candidateEmail).toBe("nadia@example.com");
    expect(found!.companyId).toBe(company.id);
    expect(found!.companySlug).toBe("review-co");
    expect(found!.jobTitle).toBe("Platform Engineer");
  });

  it("returns null when the candidate was soft-deleted", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ name: "Ghost", role: "candidate" });
    const job = await makeOpenJob(company.id);
    const created = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await softDeleteUser(sql, { id: candidate.id });

    const found = await getApplicationReviewById(sql, { id: created!.id });
    expect(found).toBeNull();
  });
});

describe("getApplicationsByJob", () => {
  it("returns all applications for a job with candidate info", async () => {
    const { company } = await seedCompany();
    const c1 = await seedUser({ name: "Alice", role: "candidate" });
    const c2 = await seedUser({ name: "Bob", role: "candidate" });
    const job = await makeOpenJob(company.id);

    await createApplication(sql, {
      jobId: job.id,
      candidateId: c1.id,
      resumeKey: "https://example.com/alice-resume.pdf",
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: job.id,
      candidateId: c2.id,
      resumeKey: "https://example.com/bob-resume.pdf",
      metadata: {},
      status: "applied",
    });

    const apps = await getApplicationsByJob(sql, { jobId: job.id });
    expect(apps).toHaveLength(2);
    expect(apps.map((a) => a.candidateName).sort()).toEqual(["Alice", "Bob"]);
  });

  it("excludes applications from soft-deleted candidates", async () => {
    const { company } = await seedCompany();
    const active = await seedUser({ name: "Active", role: "candidate" });
    const deleted = await seedUser({ name: "Deleted", role: "candidate" });
    const job = await makeOpenJob(company.id);

    await createApplication(sql, {
      jobId: job.id,
      candidateId: active.id,
      resumeKey: makeTestResumeKey(active.id),
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: job.id,
      candidateId: deleted.id,
      resumeKey: makeTestResumeKey(deleted.id),
      metadata: {},
      status: "applied",
    });
    await softDeleteUser(sql, { id: deleted.id });

    const apps = await getApplicationsByJob(sql, { jobId: job.id });
    expect(apps).toHaveLength(1);
    expect(apps[0].candidateName).toBe("Active");
  });
});

describe("getApplicationsByCandidate", () => {
  it("returns applications with job and company info, excludes archived jobs", async () => {
    const { company } = await seedCompany({ name: "Visible Co" });
    const candidate = await seedUser({ role: "candidate" });

    const job1 = await makeOpenJob(company.id, "Active Job");
    const job2 = await makeOpenJob(company.id, "Archived Job");

    await createApplication(sql, {
      jobId: job1.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: job2.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    // Archive one job
    await archiveJob(sql, { id: job2.id, companyId: company.id });

    const apps = await getApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(apps).toHaveLength(1);
    expect(apps[0].jobTitle).toBe("Active Job");
    expect(apps[0].companyName).toBe("Visible Co");
    expect(apps[0].companyOwnerDeleted).toBe(false);
  });

  it("sets companyOwnerDeleted when the company owner was soft-deleted", async () => {
    const { company, owner } = await seedCompany({ name: "Deleted Co" });
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await softDeleteUser(sql, { id: owner.id });

    const apps = await getApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(apps).toHaveLength(1);
    expect(apps[0].companyOwnerDeleted).toBe(true);
  });
});

describe("updateApplicationStatus", () => {
  it("updates the status and updated_at", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);
    const created = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    const updated = await updateApplicationStatus(sql, {
      id: created!.id,
      status: "interview_invited",
    });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("interview_invited");
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(created!.createdAt.getTime());
  });

  it("returns null for non-existent application", async () => {
    const result = await updateApplicationStatus(sql, {
      id: "00000000-0000-0000-0000-000000000000",
      status: "rejected",
    });
    expect(result).toBeNull();
  });
});

describe("getApplicationCountByJob", () => {
  it("counts applications for a job", async () => {
    const { company } = await seedCompany();
    const c1 = await seedUser({ role: "candidate" });
    const c2 = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);

    await createApplication(sql, {
      jobId: job.id,
      candidateId: c1.id,
      resumeKey: makeTestResumeKey(c1.id),
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: job.id,
      candidateId: c2.id,
      resumeKey: makeTestResumeKey(c2.id),
      metadata: {},
      status: "applied",
    });

    const result = await getApplicationCountByJob(sql, { jobId: job.id });
    expect(result).not.toBeNull();
    expect(result!.count).toBe(2);
  });

  it("returns 0 for job with no applications", async () => {
    const { company } = await seedCompany();
    const job = await makeOpenJob(company.id);

    const result = await getApplicationCountByJob(sql, { jobId: job.id });
    expect(result).not.toBeNull();
    expect(result!.count).toBe(0);
  });
});

describe("countApplicationsByCompany", () => {
  it("counts applications across company jobs, excluding archived", async () => {
    const { company } = await seedCompany();
    const c1 = await seedUser({ role: "candidate" });
    const c2 = await seedUser({ role: "candidate" });

    const job1 = await makeOpenJob(company.id, "Active");
    const job2 = await makeOpenJob(company.id, "Archived");

    await createApplication(sql, {
      jobId: job1.id,
      candidateId: c1.id,
      resumeKey: makeTestResumeKey(c1.id),
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: job2.id,
      candidateId: c2.id,
      resumeKey: makeTestResumeKey(c2.id),
      metadata: {},
      status: "applied",
    });

    // Archive one job
    await archiveJob(sql, { id: job2.id, companyId: company.id });

    const result = await countApplicationsByCompany(sql, { companyId: company.id });
    expect(result).not.toBeNull();
    expect(result!.totalCount).toBe(1); // only the non-archived job's application
  });
});

describe("countApplicationsByCandidate", () => {
  it("returns correct breakdown, excluding archived jobs", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });

    const job1 = await makeOpenJob(company.id, "J1");
    const job2 = await makeOpenJob(company.id, "J2");
    const job3 = await makeOpenJob(company.id, "J3 - archived");

    const a1 = await createApplication(sql, {
      jobId: job1.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    const a2 = await createApplication(sql, {
      jobId: job2.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: job3.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    // Set statuses
    await updateApplicationStatus(sql, { id: a1!.id, status: "interview_invited" });
    await updateApplicationStatus(sql, { id: a2!.id, status: "rejected" });

    // Archive job3
    await archiveJob(sql, { id: job3.id, companyId: company.id });

    const counts = await countApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(counts).not.toBeNull();
    expect(counts!.totalCount).toBe(2); // archived excluded
    expect(counts!.activeCount).toBe(1); // interviewing (not rejected)
    expect(counts!.interviewInvitedCount).toBe(1);
    expect(counts!.evaluatedCount).toBe(0);
  });
});
