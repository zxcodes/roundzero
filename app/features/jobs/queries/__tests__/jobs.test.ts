import { describe, expect, it } from "vitest";
import { getTestDb, seedCompany } from "@/shared/__tests__/test-utils";
import {
  archiveJob,
  closeExpiredJobsQuery,
  countJobsByCompanyAndStatus,
  createJob,
  getArchivedJobsByCompanyId,
  getJobById,
  getJobsByCompanyId,
  getOpenJobs,
  updateJob,
} from "../queries_sql";

const sql = getTestDb();

const makeJobArgs = (companyId: string, overrides?: Record<string, unknown>) => ({
  companyId,
  title: "Software Engineer",
  description: "Build stuff",
  requirements: ["TypeScript", "React"],
  interviewQuestions: ["Are you authorized to work in the US?"],
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
  ...overrides,
});

describe("createJob", () => {
  it("creates a job with all fields", async () => {
    const { company } = await seedCompany();
    const job = await createJob(sql, makeJobArgs(company.id));

    expect(job).not.toBeNull();
    expect(job!.title).toBe("Software Engineer");
    expect(job!.description).toBe("Build stuff");
    expect(job!.interviewQuestions).toEqual(["Are you authorized to work in the US?"]);
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
      description: "Lead stuff",
      requirements: ["Go", "Kubernetes"],
      interviewQuestions: ["Are you authorized to work in the US?"],
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
    });

    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("Senior Engineer");
    expect(updated!.interviewQuestions).toEqual(["Are you authorized to work in the US?"]);
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
