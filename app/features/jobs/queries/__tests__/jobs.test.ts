import { describe, expect, it } from "vitest";

import { createApplication } from "@/features/applications/queries/queries_sql";
import { softDeleteUser } from "@/features/auth/queries/queries_sql";
import {
  createTestDbConnection,
  getTestDb,
  makeTestResumeKey,
  seedCompany,
  seedUser,
  waitForBlockedQueryCount,
} from "@/shared/__tests__/test-utils";

import {
  archiveJob,
  closeExpiredJobsQuery,
  countCandidateOpenJobsFiltered,
  countJobsByCompanyAndStatus,
  countOpenJobsFiltered,
  createJob,
  getArchivedJobsByCompanyId,
  getCandidateOpenJobsPaginated,
  getJobById,
  getJobsByCompanyId,
  getOpenJobCompanies,
  getOpenJobs,
  getOpenJobsPaginated,
  updateJob,
} from "../queries_sql";

const sql = getTestDb();

const makeJobArgs = (companyId: string, overrides?: Record<string, unknown>) => ({
  companyId,
  title: "Software Engineer",
  description: "Build stuff",
  screeningQuestions: ["Are you authorized to work in the US?"],
  status: "draft" as string,
  location: "Remote",
  workplaceType: "remote",
  employmentType: "full_time",
  experienceLevel: "mid",
  salaryMin: 80000,
  salaryMax: 120000,
  salaryCurrency: "USD",
  teamSize: 5,
  headcount: 2,
  expiresAt: null as Date | null,
  finalReportTarget: 5,
  ...overrides,
});

const openJobsFilterArgs = {
  search: "",
  employmentType: "all",
  experienceLevel: "all",
  workplaceType: "all",
  salaryCurrency: "all",
  salaryMin: 0,
  companySlug: "all",
};

describe("createJob", () => {
  it("creates a job with all fields", async () => {
    const { company } = await seedCompany();
    const job = await createJob(sql, makeJobArgs(company.id));

    expect(job).not.toBeNull();
    expect(job!.title).toBe("Software Engineer");
    expect(job!.description).toBe("Build stuff");
    expect(job!.screeningQuestions).toEqual(["Are you authorized to work in the US?"]);
    expect(job!.status).toBe("draft");
    expect(job!.companyId).toBe(company.id);
    expect(job!.location).toBe("Remote");
    expect(job!.workplaceType).toBe("remote");
    expect(job!.employmentType).toBe("full_time");
    expect(job!.experienceLevel).toBe("mid");
    expect(job!.salaryMin).toBe(80000);
    expect(job!.salaryMax).toBe(120000);
    expect(job!.salaryCurrency).toBe("USD");
    expect(job!.teamSize).toBe(5);
    expect(job!.headcount).toBe(2);
    expect(job!.archivedAt).toBeNull();
    expect(job!.createdAt).toBeInstanceOf(Date);
  });

  it("creates a job with nullable fields as null", async () => {
    const { company } = await seedCompany();
    const job = await createJob(
      sql,
      makeJobArgs(company.id, {
        location: null,
        workplaceType: null,
        employmentType: null,
        experienceLevel: null,
        salaryMin: null,
        salaryMax: null,
        teamSize: null,
        headcount: null,
      }),
    );

    expect(job).not.toBeNull();
    expect(job!.location).toBeNull();
    expect(job!.workplaceType).toBeNull();
    expect(job!.salaryMin).toBeNull();
    expect(job!.teamSize).toBeNull();
  });
});

describe("getJobById", () => {
  it("returns the job with company name", async () => {
    const { company } = await seedCompany({ name: "Acme Corp" });
    const created = await createJob(sql, makeJobArgs(company.id));

    const job = await getJobById(sql, { id: created!.id });
    expect(job).not.toBeNull();
    expect(job!.title).toBe("Software Engineer");
    expect(job!.companyName).toBe("Acme Corp");
    expect(job!.companyLogoKey).toBeNull();
  });

  it("returns company logo key when set", async () => {
    const { company } = await seedCompany({ name: "Logo Co" });
    await sql`
      UPDATE companies
      SET logo_key = ${"company-logos/user-1/logo.png"}
      WHERE id = ${company.id}
    `;
    const created = await createJob(sql, makeJobArgs(company.id));

    const job = await getJobById(sql, { id: created!.id });
    expect(job).not.toBeNull();
    expect(job!.companyLogoKey).toBe("company-logos/user-1/logo.png");
  });

  it("returns null for non-existent id", async () => {
    const job = await getJobById(sql, { id: "00000000-0000-0000-0000-000000000000" });
    expect(job).toBeNull();
  });

  it("returns archived jobs (no filter on archived_at)", async () => {
    const { company } = await seedCompany();
    const created = await createJob(sql, makeJobArgs(company.id, { status: "open" }));
    await archiveJob(sql, { id: created!.id, companyId: company.id });

    const job = await getJobById(sql, { id: created!.id });
    expect(job).not.toBeNull();
    expect(job!.status).toBe("closed");
    expect(job!.archivedAt).toBeInstanceOf(Date);
  });
});

describe("getJobsByCompanyId", () => {
  it("returns only non-archived jobs for a company", async () => {
    const { company } = await seedCompany();
    await createJob(sql, makeJobArgs(company.id, { title: "Job A" }));
    await createJob(sql, makeJobArgs(company.id, { title: "Job B" }));
    const toArchive = await createJob(
      sql,
      makeJobArgs(company.id, { title: "Job C", status: "open" }),
    );
    await archiveJob(sql, { id: toArchive!.id, companyId: company.id });

    const jobs = await getJobsByCompanyId(sql, { companyId: company.id });
    expect(jobs).toHaveLength(2);
    expect(jobs.map((j) => j.title).sort()).toEqual(["Job A", "Job B"]);
  });

  it("returns empty array for company with no jobs", async () => {
    const { company } = await seedCompany();
    const jobs = await getJobsByCompanyId(sql, { companyId: company.id });
    expect(jobs).toEqual([]);
  });

  it("does not return jobs from other companies", async () => {
    const { company: c1 } = await seedCompany({ name: "Company 1" });
    const { company: c2 } = await seedCompany({ name: "Company 2" });
    await createJob(sql, makeJobArgs(c1.id, { title: "C1 Job" }));
    await createJob(sql, makeJobArgs(c2.id, { title: "C2 Job" }));

    const jobs = await getJobsByCompanyId(sql, { companyId: c1.id });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("C1 Job");
  });
});

describe("updateJob", () => {
  it("updates all fields", async () => {
    const { company } = await seedCompany();
    const created = await createJob(sql, makeJobArgs(company.id));

    const updated = await updateJob(sql, {
      id: created!.id,
      companyId: company.id,
      title: "Senior Engineer",
      description: "Lead stuff\n\n## Requirements\n\n- Go\n- Kubernetes",
      screeningQuestions: ["Are you authorized to work in the US?"],
      status: "open",
      location: "NYC",
      workplaceType: "hybrid",
      employmentType: "contract",
      experienceLevel: "senior",
      salaryMin: 150000,
      salaryMax: 200000,
      salaryCurrency: "EUR",
      teamSize: 10,
      headcount: 3,
      expiresAt: null,
      finalReportTarget: 5,
    });

    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("Senior Engineer");
    expect(updated!.screeningQuestions).toEqual(["Are you authorized to work in the US?"]);
    expect(updated!.status).toBe("open");
    expect(updated!.location).toBe("NYC");
    expect(updated!.salaryCurrency).toBe("EUR");
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(created!.createdAt.getTime());
  });

  it("returns null when companyId doesn't match (authorization)", async () => {
    const { company: c1 } = await seedCompany({ name: "Owner Co" });
    const { company: c2 } = await seedCompany({ name: "Other Co" });
    const created = await createJob(sql, makeJobArgs(c1.id));

    const result = await updateJob(sql, {
      ...makeJobArgs(c2.id, { title: "Hacked" }),
      id: created!.id,
      companyId: c2.id,
      expiresAt: null,
    });

    expect(result).toBeNull();
  });

  it("allows increasing the report target but rejects decreases", async () => {
    const { company } = await seedCompany();
    const created = await createJob(sql, makeJobArgs(company.id, { finalReportTarget: 5 }));

    const increased = await updateJob(sql, {
      ...makeJobArgs(company.id, { finalReportTarget: 10 }),
      id: created!.id,
      expiresAt: null,
    });
    expect(increased?.finalReportTarget).toBe(10);

    const decreased = await updateJob(sql, {
      ...makeJobArgs(company.id, { finalReportTarget: 3 }),
      id: created!.id,
      expiresAt: null,
    });
    expect(decreased).toBeNull();
    expect((await getJobById(sql, { id: created!.id }))?.finalReportTarget).toBe(10);
  });

  it("prevents a stale target update from undoing a concurrent increase", async () => {
    const { company } = await seedCompany();
    const created = await createJob(sql, makeJobArgs(company.id, { finalReportTarget: 5 }));
    const blocker = createTestDbConnection();
    let releaseJobLock = () => {};
    let markJobLockHeld = () => {};
    const holdJobLock = new Promise<void>((resolve) => {
      releaseJobLock = resolve;
    });
    const jobLockHeld = new Promise<void>((resolve) => {
      markJobLockHeld = resolve;
    });
    const blockerTask = blocker.begin(async (tx) => {
      await tx`SELECT id FROM jobs WHERE id = ${created!.id} FOR UPDATE`;
      markJobLockHeld();
      await holdJobLock;
    });

    await jobLockHeld;
    const increase = updateJob(sql, {
      ...makeJobArgs(company.id, { finalReportTarget: 10 }),
      id: created!.id,
    });
    let staleUpdate: ReturnType<typeof updateJob>;
    try {
      await waitForBlockedQueryCount(sql, {
        minimum: 1,
        queryPattern: "%UPDATE jobs%final_report_target%",
      });
      staleUpdate = updateJob(sql, {
        ...makeJobArgs(company.id, { finalReportTarget: 7 }),
        id: created!.id,
      });
      await waitForBlockedQueryCount(sql, {
        minimum: 2,
        queryPattern: "%UPDATE jobs%final_report_target%",
      });
    } finally {
      releaseJobLock();
      await blockerTask;
      await blocker.end();
    }

    expect((await increase)?.finalReportTarget).toBe(10);
    expect(await staleUpdate!).toBeNull();
    expect((await getJobById(sql, { id: created!.id }))?.finalReportTarget).toBe(10);
  });
});

describe("archiveJob", () => {
  it("sets archived_at and status to closed", async () => {
    const { company } = await seedCompany();
    const created = await createJob(sql, makeJobArgs(company.id, { status: "open" }));

    const archived = await archiveJob(sql, { id: created!.id, companyId: company.id });
    expect(archived).not.toBeNull();
    expect(archived!.status).toBe("closed");
    expect(archived!.archivedAt).toBeInstanceOf(Date);
  });

  it("returns null when already archived (idempotency guard)", async () => {
    const { company } = await seedCompany();
    const created = await createJob(sql, makeJobArgs(company.id, { status: "open" }));
    await archiveJob(sql, { id: created!.id, companyId: company.id });

    const second = await archiveJob(sql, { id: created!.id, companyId: company.id });
    expect(second).toBeNull();
  });

  it("returns null when companyId doesn't match", async () => {
    const { company: c1 } = await seedCompany({ name: "Owner" });
    const { company: c2 } = await seedCompany({ name: "Other" });
    const created = await createJob(sql, makeJobArgs(c1.id, { status: "open" }));

    const result = await archiveJob(sql, { id: created!.id, companyId: c2.id });
    expect(result).toBeNull();
  });
});

describe("getArchivedJobsByCompanyId", () => {
  it("returns only archived jobs", async () => {
    const { company } = await seedCompany();
    await createJob(sql, makeJobArgs(company.id, { title: "Active" }));
    const toArchive = await createJob(
      sql,
      makeJobArgs(company.id, { title: "Archived", status: "open" }),
    );
    await archiveJob(sql, { id: toArchive!.id, companyId: company.id });

    const archived = await getArchivedJobsByCompanyId(sql, { companyId: company.id });
    expect(archived).toHaveLength(1);
    expect(archived[0].title).toBe("Archived");
    expect(archived[0].archivedAt).toBeInstanceOf(Date);
  });

  it("returns empty array when no archived jobs", async () => {
    const { company } = await seedCompany();
    await createJob(sql, makeJobArgs(company.id));

    const archived = await getArchivedJobsByCompanyId(sql, { companyId: company.id });
    expect(archived).toEqual([]);
  });
});

describe("getOpenJobs", () => {
  it("returns only open, non-archived jobs with company name", async () => {
    const { company } = await seedCompany({ name: "Visible Corp" });
    await createJob(sql, makeJobArgs(company.id, { title: "Draft Job", status: "draft" }));
    await createJob(sql, makeJobArgs(company.id, { title: "Open Job", status: "open" }));
    const toArchive = await createJob(
      sql,
      makeJobArgs(company.id, { title: "Archived Open", status: "open" }),
    );
    await archiveJob(sql, { id: toArchive!.id, companyId: company.id });

    const open = await getOpenJobs(sql);
    expect(open).toHaveLength(1);
    expect(open[0].title).toBe("Open Job");
    expect(open[0].companyName).toBe("Visible Corp");
    expect(open[0].companySlug).toBeDefined();
  });

  it("excludes expired jobs", async () => {
    const { company } = await seedCompany({ name: "Expiry Corp" });
    const pastDate = new Date("2020-01-01");
    const futureDate = new Date("2099-01-01");

    await createJob(
      sql,
      makeJobArgs(company.id, { title: "Expired Job", status: "open", expiresAt: pastDate }),
    );
    await createJob(
      sql,
      makeJobArgs(company.id, { title: "Future Job", status: "open", expiresAt: futureDate }),
    );
    await createJob(
      sql,
      makeJobArgs(company.id, { title: "No Expiry Job", status: "open", expiresAt: null }),
    );

    const open = await getOpenJobs(sql);
    const titles = open.map((j) => j.title);
    expect(titles).toContain("Future Job");
    expect(titles).toContain("No Expiry Job");
    expect(titles).not.toContain("Expired Job");
  });

  it("excludes jobs from companies whose owner was soft-deleted", async () => {
    const { company, owner } = await seedCompany({ name: "Deleted Owner Corp" });
    await createJob(sql, makeJobArgs(company.id, { title: "Ghost Job", status: "open" }));
    await softDeleteUser(sql, { id: owner.id });

    const open = await getOpenJobs(sql);
    expect(open.map((j) => j.title)).not.toContain("Ghost Job");
  });
});

describe("paginated open jobs", () => {
  it("filters jobs and counts by company", async () => {
    const { company: firstCompany } = await seedCompany({ name: "First Company" });
    const { company: secondCompany } = await seedCompany({ name: "Second Company" });
    await createJob(sql, makeJobArgs(firstCompany.id, { title: "First Role", status: "open" }));
    await createJob(sql, makeJobArgs(secondCompany.id, { title: "Second Role", status: "open" }));

    const filterArgs = { ...openJobsFilterArgs, companySlug: firstCompany.slug };
    const [jobs, count] = await Promise.all([
      getOpenJobsPaginated(sql, { ...filterArgs, limit: 12, offset: 0 }),
      countOpenJobsFiltered(sql, filterArgs),
    ]);

    expect(jobs.map((job) => job.title)).toEqual(["First Role"]);
    expect(count?.total).toBe(1);
  });

  it("lists only companies with visible open jobs in name order", async () => {
    const { company: zuluCompany } = await seedCompany({ name: "Zulu Company" });
    const { company: alphaCompany } = await seedCompany({ name: "Alpha Company" });
    const { company: draftCompany } = await seedCompany({ name: "Draft Company" });
    await createJob(sql, makeJobArgs(zuluCompany.id, { status: "open" }));
    await createJob(sql, makeJobArgs(alphaCompany.id, { status: "open" }));
    await createJob(sql, makeJobArgs(draftCompany.id, { status: "draft" }));

    const companies = await getOpenJobCompanies(sql);

    expect(companies).toEqual([
      { id: alphaCompany.id, name: "Alpha Company", slug: alphaCompany.slug },
      { id: zuluCompany.id, name: "Zulu Company", slug: zuluCompany.slug },
    ]);
  });

  it("hides only jobs the current candidate has applied to", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });
    const otherCandidate = await seedUser({ role: "candidate" });
    const appliedJob = await createJob(
      sql,
      makeJobArgs(company.id, { title: "Applied Role", status: "open" }),
    );
    const visibleJob = await createJob(
      sql,
      makeJobArgs(company.id, { title: "Visible Role", status: "open" }),
    );
    await createApplication(sql, {
      jobId: appliedJob!.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "applied",
    });
    await createApplication(sql, {
      jobId: visibleJob!.id,
      candidateId: otherCandidate.id,
      resumeKey: makeTestResumeKey(otherCandidate.id),
      metadata: {},
      status: "applied",
    });

    const filterArgs = { ...openJobsFilterArgs, candidateId: candidate.id };
    const [jobs, count] = await Promise.all([
      getCandidateOpenJobsPaginated(sql, { ...filterArgs, limit: 12, offset: 0 }),
      countCandidateOpenJobsFiltered(sql, filterArgs),
    ]);

    expect(jobs.map((job) => job.title)).toEqual(["Visible Role"]);
    expect(count?.total).toBe(1);
  });
});

describe("getJobById soft-deletion", () => {
  it("returns null when the company's owner was soft-deleted", async () => {
    const { company, owner } = await seedCompany();
    const created = await createJob(sql, makeJobArgs(company.id, { status: "open" }));
    await softDeleteUser(sql, { id: owner.id });

    const job = await getJobById(sql, { id: created!.id });
    expect(job).toBeNull();
  });
});

describe("closeExpiredJobs", () => {
  it("auto-closes expired open jobs without archiving them", async () => {
    const { company } = await seedCompany({ name: "Closure Corp" });
    const pastDate = new Date("2020-01-01");

    const created = await createJob(
      sql,
      makeJobArgs(company.id, { title: "Should Close", status: "open", expiresAt: pastDate }),
    );

    await sql.unsafe(closeExpiredJobsQuery);

    const job = await getJobById(sql, { id: created!.id });
    expect(job).not.toBeNull();
    expect(job!.status).toBe("closed");
    expect(job!.archivedAt).toBeNull();
  });
});

describe("countJobsByCompanyAndStatus", () => {
  it("counts open, draft, and total (excluding archived)", async () => {
    const { company } = await seedCompany();
    await createJob(sql, makeJobArgs(company.id, { status: "draft" }));
    await createJob(sql, makeJobArgs(company.id, { status: "draft" }));
    await createJob(sql, makeJobArgs(company.id, { status: "open" }));
    const toArchive = await createJob(sql, makeJobArgs(company.id, { status: "open" }));
    await archiveJob(sql, { id: toArchive!.id, companyId: company.id });

    const counts = await countJobsByCompanyAndStatus(sql, { companyId: company.id });
    expect(counts).not.toBeNull();
    expect(counts!.draftCount).toBe(2);
    expect(counts!.openCount).toBe(1);
    expect(counts!.totalCount).toBe(3); // archived excluded
  });
});
