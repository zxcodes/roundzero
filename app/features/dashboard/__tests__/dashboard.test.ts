import { describe, expect, it } from "vitest";
import {
  countApplicationsByCandidate,
  countApplicationsByCompany,
  createApplication,
  getApplicationsByCandidate,
  getRecentApplicationsByCandidate,
  updateApplicationStatus,
} from "@/features/applications/queries/queries_sql";
import { getUserById } from "@/features/auth/queries/queries_sql";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import {
  createInterview,
  getInterviewsByCandidate,
} from "@/features/interviews/queries/queries_sql";
import {
  archiveJob,
  countJobsByCompanyAndStatus,
  createJob,
} from "@/features/jobs/queries/queries_sql";
import { getTestDb, makeTestResumeKey, seedCompany, seedUser } from "@/shared/__tests__/test-utils";

const sql = getTestDb();

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

const makeDraftJob = async (companyId: string, title = "Draft Job") => {
  const job = await createJob(sql, {
    companyId,
    title,
    description: "Test",
    requirements: [],
    screeningQuestions: [],
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
    expiresAt: null,
    finalReportTarget: 5,
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
      resumeKey: makeTestResumeKey(c1.id),
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: job1.id,
      candidateId: c2.id,
      resumeKey: makeTestResumeKey(c2.id),
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: job2.id,
      candidateId: c3.id,
      resumeKey: makeTestResumeKey(c3.id),
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: archivedJob.id,
      candidateId: c1.id,
      resumeKey: makeTestResumeKey(c1.id),
      metadata: {},
      status: "applied",
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
    expect(counts?.interviewInvitedCount ?? 0).toBe(0);
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
    const a3 = await createApplication(sql, {
      jobId: job3.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: job4.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    await updateApplicationStatus(sql, { id: a1!.id, status: "interview_invited" });
    await updateApplicationStatus(sql, { id: a2!.id, status: "interview_invited" });
    await updateApplicationStatus(sql, { id: a2!.id, status: "evaluated" });
    await updateApplicationStatus(sql, { id: a3!.id, status: "rejected" });

    const counts = await countApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(counts?.totalCount).toBe(4);
    // active = applied + interviewing + evaluated (not rejected)
    expect(counts?.activeCount).toBe(3);
    expect(counts?.interviewInvitedCount).toBe(1);
    expect(counts?.evaluatedCount).toBe(1);
  });

  it("excludes withdrawn applications from active count", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });

    const job1 = await makeOpenJob(company.id, "J1");
    const job2 = await makeOpenJob(company.id, "J2");

    await createApplication(sql, {
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

    await updateApplicationStatus(sql, { id: a2!.id, status: "withdrawn" });

    const counts = await countApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(counts?.totalCount).toBe(2);
    expect(counts?.activeCount).toBe(1); // withdrawn excluded from active
  });

  it("excludes applications for archived jobs", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });

    const activeJob = await makeOpenJob(company.id, "Active");
    const archivedJob = await makeOpenJob(company.id, "Archived");

    await createApplication(sql, {
      jobId: activeJob.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: archivedJob.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });

    await archiveJob(sql, { id: archivedJob.id, companyId: company.id });

    const counts = await countApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(counts?.totalCount).toBe(1);
  });

  it("surfaces shortlisted apps and pending interviews for the enriched candidate dashboard", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });

    const jobShort = await makeOpenJob(company.id, "Shortlisted Role");
    const jobInt = await makeOpenJob(company.id, "Interview Role");

    // Shortlisted app with follow-up note in metadata
    await createApplication(sql, {
      jobId: jobShort.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {
        shortlist: {
          note: "Excited to chat — please reply with availability.",
          updatedAt: new Date().toISOString(),
        },
      },
      status: "shortlisted",
    });

    // Separate app + pending interview (actionable interview path)
    const intApp = await createApplication(sql, {
      jobId: jobInt.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "interview_invited",
    });

    await createInterview(sql, {
      applicationId: intApp!.id,
      agentId: "test-agent",
      type: "full",
      metadata: { expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() },
      status: "pending",
      invitedAt: new Date(),
      startedAt: null,
      completedAt: null,
    });

    const apps = await getApplicationsByCandidate(sql, { candidateId: candidate.id });
    const interviews = await getInterviewsByCandidate(sql, { candidateId: candidate.id });

    const shortlisted = apps.filter((a) => a.status === "shortlisted");
    expect(shortlisted.length).toBeGreaterThan(0);
    expect(shortlisted[0].metadata?.shortlist).toBeTruthy();

    const pendingInts = interviews.filter(
      (i) => i.status === "pending" || i.status === "in_progress",
    );
    expect(pendingInts.length).toBeGreaterThan(0);
    expect(pendingInts[0].jobTitle).toBe("Interview Role");

    const recent = await getRecentApplicationsByCandidate(sql, { candidateId: candidate.id });
    expect(recent.length).toBe(2);
    // intApp created after shortlisted one, so most recent first
    expect(recent[0].jobTitle).toBe("Interview Role");
    expect(recent.some((a) => a.jobTitle === "Shortlisted Role")).toBe(true);
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
