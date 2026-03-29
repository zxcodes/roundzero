import { describe, expect, it } from "vitest";
import { archiveJob, createJob } from "@/features/jobs/queries/queries_sql";
import { getTestDb, seedCompany, seedUser } from "@/shared/__tests__/test-utils";
import {
  countApplicationsByCandidate,
  countApplicationsByCompany,
  createApplication,
  getApplicationById,
  getApplicationByJobAndCandidate,
  getApplicationCountByJob,
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
    requirements: JSON.stringify([]),
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
  });
  return job!;
};

describe("createApplication", () => {
  it("creates an application with default status 'applied'", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);

    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeUrl: "https://example.com/resume.pdf",
      links: JSON.stringify(["https://github.com/test"]),
    });

    expect(app).not.toBeNull();
    expect(app!.jobId).toBe(job.id);
    expect(app!.candidateId).toBe(candidate.id);
    expect(app!.resumeUrl).toBe("https://example.com/resume.pdf");
    expect(app!.status).toBe("applied");
    expect(app!.createdAt).toBeInstanceOf(Date);
  });

  it("creates an application with null resume", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);

    const app = await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });

    expect(app).not.toBeNull();
    expect(app!.resumeUrl).toBeNull();
  });

  it("enforces unique(job_id, candidate_id) constraint", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const job = await makeOpenJob(company.id);

    await createApplication(sql, {
      jobId: job.id,
      candidateId: candidate.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });

    await expect(
      createApplication(sql, {
        jobId: job.id,
        candidateId: candidate.id,
        resumeUrl: null,
        links: JSON.stringify([]),
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
      resumeUrl: null,
      links: JSON.stringify([]),
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
      resumeUrl: null,
      links: JSON.stringify([]),
    });

    const found = await getApplicationById(sql, { id: created!.id });
    expect(found).not.toBeNull();
    expect(found!.jobTitle).toBe("Frontend Dev");
    expect(found!.companyName).toBe("Great Co");
    expect(found!.jobStatus).toBe("open");
  });

  it("returns null for non-existent id", async () => {
    const found = await getApplicationById(sql, {
      id: "00000000-0000-0000-0000-000000000000",
    });
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
      resumeUrl: null,
      links: JSON.stringify([]),
    });
    await createApplication(sql, {
      jobId: job.id,
      candidateId: c2.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });

    const apps = await getApplicationsByJob(sql, { jobId: job.id });
    expect(apps).toHaveLength(2);
    expect(apps.map((a) => a.candidateName).sort()).toEqual(["Alice", "Bob"]);
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
      resumeUrl: null,
      links: JSON.stringify([]),
    });
    await createApplication(sql, {
      jobId: job2.id,
      candidateId: candidate.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });

    // Archive one job
    await archiveJob(sql, { id: job2.id, companyId: company.id });

    const apps = await getApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(apps).toHaveLength(1);
    expect(apps[0].jobTitle).toBe("Active Job");
    expect(apps[0].companyName).toBe("Visible Co");
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
      resumeUrl: null,
      links: JSON.stringify([]),
    });

    const updated = await updateApplicationStatus(sql, {
      id: created!.id,
      status: "interviewing",
    });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("interviewing");
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
      resumeUrl: null,
      links: JSON.stringify([]),
    });
    await createApplication(sql, {
      jobId: job.id,
      candidateId: c2.id,
      resumeUrl: null,
      links: JSON.stringify([]),
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
      resumeUrl: null,
      links: JSON.stringify([]),
    });
    await createApplication(sql, {
      jobId: job2.id,
      candidateId: c2.id,
      resumeUrl: null,
      links: JSON.stringify([]),
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
      resumeUrl: null,
      links: JSON.stringify([]),
    });
    const a2 = await createApplication(sql, {
      jobId: job2.id,
      candidateId: candidate.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });
    await createApplication(sql, {
      jobId: job3.id,
      candidateId: candidate.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });

    // Set statuses
    await updateApplicationStatus(sql, { id: a1!.id, status: "interviewing" });
    await updateApplicationStatus(sql, { id: a2!.id, status: "rejected" });

    // Archive job3
    await archiveJob(sql, { id: job3.id, companyId: company.id });

    const counts = await countApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(counts).not.toBeNull();
    expect(counts!.totalCount).toBe(2); // archived excluded
    expect(counts!.activeCount).toBe(1); // interviewing (not rejected)
    expect(counts!.interviewingCount).toBe(1);
    expect(counts!.evaluatedCount).toBe(0);
  });
});
