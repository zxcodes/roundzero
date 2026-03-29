import { describe, expect, it } from "vitest";
import {
  countApplicationsByCandidate,
  countApplicationsByCompany,
  createApplication,
  updateApplicationStatus,
} from "@/features/applications/queries/queries_sql";
import { getUserById } from "@/features/auth/queries/queries_sql";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import {
  archiveJob,
  countJobsByCompanyAndStatus,
  createJob,
} from "@/features/jobs/queries/queries_sql";
import { getTestDb, seedCompany, seedUser } from "@/shared/__tests__/test-utils";

const sql = getTestDb();

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

const makeDraftJob = async (companyId: string, title = "Draft Job") => {
  const job = await createJob(sql, {
    companyId,
    title,
    description: "Test",
    requirements: JSON.stringify([]),
    status: "draft",
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

// ─── Company dashboard metrics ──────────────────────────────────
// getDashboardMetrics for company users aggregates job counts + application counts.

describe("company dashboard metrics", () => {
  it("returns zeros for company with no data", async () => {
    const { company } = await seedCompany();

    const jobCounts = await countJobsByCompanyAndStatus(sql, { companyId: company.id });
    const appCounts = await countApplicationsByCompany(sql, { companyId: company.id });

    expect(jobCounts?.openCount ?? 0).toBe(0);
    expect(jobCounts?.draftCount ?? 0).toBe(0);
    expect(jobCounts?.totalCount ?? 0).toBe(0);
    expect(appCounts?.totalCount ?? 0).toBe(0);
  });

  it("counts open, draft, and total jobs (excluding archived)", async () => {
    const { company } = await seedCompany();
    await makeDraftJob(company.id);
    await makeDraftJob(company.id);
    await makeOpenJob(company.id);
    const toArchive = await makeOpenJob(company.id);
    await archiveJob(sql, { id: toArchive.id, companyId: company.id });

    const counts = await countJobsByCompanyAndStatus(sql, { companyId: company.id });
    expect(counts?.draftCount).toBe(2);
    expect(counts?.openCount).toBe(1);
    expect(counts?.totalCount).toBe(3); // archived excluded
  });

  it("counts total applicants across active jobs", async () => {
    const { company } = await seedCompany();
    const c1 = await seedUser({ role: "candidate" });
    const c2 = await seedUser({ role: "candidate" });
    const c3 = await seedUser({ role: "candidate" });

    const job1 = await makeOpenJob(company.id, "Job 1");
    const job2 = await makeOpenJob(company.id, "Job 2");
    const archivedJob = await makeOpenJob(company.id, "Archived Job");

    await createApplication(sql, {
      jobId: job1.id,
      candidateId: c1.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });
    await createApplication(sql, {
      jobId: job1.id,
      candidateId: c2.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });
    await createApplication(sql, {
      jobId: job2.id,
      candidateId: c3.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });
    await createApplication(sql, {
      jobId: archivedJob.id,
      candidateId: c1.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });

    // Archive one job — its applications should be excluded from count
    await archiveJob(sql, { id: archivedJob.id, companyId: company.id });

    const counts = await countApplicationsByCompany(sql, { companyId: company.id });
    expect(counts?.totalCount).toBe(3); // c1's archived job application excluded
  });
});

// ─── Candidate dashboard metrics ────────────────────────────────
// getDashboardMetrics for candidates returns application breakdown.

describe("candidate dashboard metrics", () => {
  it("returns zeros for candidate with no applications", async () => {
    const candidate = await seedUser({ role: "candidate" });

    const counts = await countApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(counts?.totalCount ?? 0).toBe(0);
    expect(counts?.activeCount ?? 0).toBe(0);
    expect(counts?.interviewingCount ?? 0).toBe(0);
    expect(counts?.evaluatedCount ?? 0).toBe(0);
  });

  it("breaks down applications by status", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });

    const job1 = await makeOpenJob(company.id, "J1");
    const job2 = await makeOpenJob(company.id, "J2");
    const job3 = await makeOpenJob(company.id, "J3");
    const job4 = await makeOpenJob(company.id, "J4");

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
    const a3 = await createApplication(sql, {
      jobId: job3.id,
      candidateId: candidate.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });
    await createApplication(sql, {
      jobId: job4.id,
      candidateId: candidate.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });

    await updateApplicationStatus(sql, { id: a1!.id, status: "interviewing" });
    await updateApplicationStatus(sql, { id: a2!.id, status: "interviewing" });
    await updateApplicationStatus(sql, { id: a2!.id, status: "evaluated" });
    await updateApplicationStatus(sql, { id: a3!.id, status: "rejected" });

    const counts = await countApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(counts?.totalCount).toBe(4);
    // active = applied + interviewing + evaluated (not rejected)
    expect(counts?.activeCount).toBe(3);
    expect(counts?.interviewingCount).toBe(1);
    expect(counts?.evaluatedCount).toBe(1);
  });

  it("excludes applications for archived jobs", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });

    const activeJob = await makeOpenJob(company.id, "Active");
    const archivedJob = await makeOpenJob(company.id, "Archived");

    await createApplication(sql, {
      jobId: activeJob.id,
      candidateId: candidate.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });
    await createApplication(sql, {
      jobId: archivedJob.id,
      candidateId: candidate.id,
      resumeUrl: null,
      links: JSON.stringify([]),
    });

    await archiveJob(sql, { id: archivedJob.id, companyId: company.id });

    const counts = await countApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(counts?.totalCount).toBe(1);
  });
});

// ─── Role-based access patterns ─────────────────────────────────
// The server functions check user role before allowing actions.
// Here we verify the data layer supports these checks.

describe("role-based access", () => {
  it("getUserById returns role for server-side role checks", async () => {
    const candidate = await seedUser({ role: "candidate" });
    const companyUser = await seedUser({ role: "company" });

    const c = await getUserById(sql, { id: candidate.id });
    expect(c?.role).toBe("candidate");

    const co = await getUserById(sql, { id: companyUser.id });
    expect(co?.role).toBe("company");
  });

  it("getCompanyByOwnerId returns null for non-company users", async () => {
    const candidate = await seedUser({ role: "candidate" });
    const result = await getCompanyByOwnerId(sql, { ownerId: candidate.id });
    expect(result).toBeNull();
  });

  it("getCompanyByOwnerId returns company for owner", async () => {
    const { company, owner } = await seedCompany();
    const result = await getCompanyByOwnerId(sql, { ownerId: owner.id });
    expect(result).not.toBeNull();
    expect(result!.id).toBe(company.id);
  });
});
