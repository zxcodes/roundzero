import { describe, expect, it } from "vitest";
import { getTestDb, seedCompany } from "@/shared/__tests__/test-utils";
import {
  createJob,
  getJobById,
  getJobsByCompanyId,
  getOpenJobs,
  updateJob,
} from "../queries/queries_sql";

const sql = getTestDb();

const makeJobArgs = (companyId: string, overrides?: Record<string, unknown>) => ({
  companyId,
  title: "Test Job",
  description: "Test description",
  requirements: [],
  interviewQuestions: [],
  status: "draft" as string,
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
  ...overrides,
});

// ─── Job visibility rules ───────────────────────────────────────
// Server function `getJob` hides non-open jobs from non-owners.
// Here we test the underlying data layer that supports that logic.

describe("job visibility", () => {
  it("draft jobs are returned by getJobById (detail view allows owner access)", async () => {
    const { company } = await seedCompany();
    const job = await createJob(sql, makeJobArgs(company.id, { status: "draft" }));

    const found = await getJobById(sql, { id: job!.id });
    expect(found).not.toBeNull();
    expect(found!.status).toBe("draft");
  });

  it("draft jobs are NOT returned by getOpenJobs (public listing)", async () => {
    const { company } = await seedCompany();
    await createJob(sql, makeJobArgs(company.id, { status: "draft", title: "Hidden Draft" }));

    const open = await getOpenJobs(sql);
    expect(open.find((j) => j.title === "Hidden Draft")).toBeUndefined();
  });

  it("closed jobs are NOT returned by getOpenJobs", async () => {
    const { company } = await seedCompany();
    await createJob(sql, makeJobArgs(company.id, { status: "closed", title: "Closed Job" }));

    const open = await getOpenJobs(sql);
    expect(open.find((j) => j.title === "Closed Job")).toBeUndefined();
  });

  it("getJobsByCompanyId returns both draft and open (not archived)", async () => {
    const { company } = await seedCompany();
    await createJob(sql, makeJobArgs(company.id, { title: "Draft", status: "draft" }));
    await createJob(sql, makeJobArgs(company.id, { title: "Open", status: "open" }));

    const jobs = await getJobsByCompanyId(sql, { companyId: company.id });
    expect(jobs).toHaveLength(2);
    expect(jobs.map((j) => j.title).sort()).toEqual(["Draft", "Open"]);
  });

  it("getJobById returns companyId for server-side ownership check", async () => {
    const { company } = await seedCompany({ name: "Visibility Co" });
    const job = await createJob(sql, makeJobArgs(company.id));

    const found = await getJobById(sql, { id: job!.id });
    expect(found!.companyId).toBe(company.id);
    expect(found!.companyName).toBe("Visibility Co");
  });
});

// ─── Publish guard ──────────────────────────────────────────────
// Server function `publishJob` only allows draft → open.

describe("publish guard (draft → open)", () => {
  it("draft job can be published to open", async () => {
    const { company } = await seedCompany();
    const job = await createJob(sql, makeJobArgs(company.id, { status: "draft" }));

    const updated = await updateJob(sql, {
      ...makeJobArgs(company.id, { status: "open" }),
      id: job!.id,
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("open");
  });

  it("already-open job retains open status on update", async () => {
    const { company } = await seedCompany();
    const job = await createJob(sql, makeJobArgs(company.id, { status: "open" }));

    // Server would reject this with "Only draft jobs can be published",
    // but at the DB level the update just changes the status.
    // This test verifies the data layer doesn't prevent it — the guard is in the server function.
    const updated = await updateJob(sql, {
      ...makeJobArgs(company.id, { status: "open", title: "Updated Title" }),
      id: job!.id,
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("open");
    expect(updated!.title).toBe("Updated Title");
  });

  it("wrong companyId prevents publish (authorization)", async () => {
    const { company: owner } = await seedCompany({ name: "Owner Co" });
    const { company: other } = await seedCompany({ name: "Other Co" });
    const job = await createJob(sql, makeJobArgs(owner.id, { status: "draft" }));

    const result = await updateJob(sql, {
      ...makeJobArgs(other.id, { status: "open" }),
      id: job!.id,
      companyId: other.id,
    });
    expect(result).toBeNull();

    // Verify the job is still draft
    const check = await getJobById(sql, { id: job!.id });
    expect(check!.status).toBe("draft");
  });
});

// ─── Cross-company isolation ────────────────────────────────────

describe("company isolation", () => {
  it("company A cannot update company B's job", async () => {
    const { company: a } = await seedCompany({ name: "Company A" });
    const { company: b } = await seedCompany({ name: "Company B" });

    const jobA = await createJob(sql, makeJobArgs(a.id, { title: "A's Job" }));

    const result = await updateJob(sql, {
      ...makeJobArgs(b.id, { title: "Hijacked" }),
      id: jobA!.id,
      companyId: b.id,
    });
    expect(result).toBeNull();

    const check = await getJobById(sql, { id: jobA!.id });
    expect(check!.title).toBe("A's Job");
  });

  it("getJobsByCompanyId only returns that company's jobs", async () => {
    const { company: a } = await seedCompany({ name: "Company A" });
    const { company: b } = await seedCompany({ name: "Company B" });

    await createJob(sql, makeJobArgs(a.id, { title: "A's Job" }));
    await createJob(sql, makeJobArgs(b.id, { title: "B's Job" }));

    const jobsA = await getJobsByCompanyId(sql, { companyId: a.id });
    expect(jobsA).toHaveLength(1);
    expect(jobsA[0].title).toBe("A's Job");

    const jobsB = await getJobsByCompanyId(sql, { companyId: b.id });
    expect(jobsB).toHaveLength(1);
    expect(jobsB[0].title).toBe("B's Job");
  });
});
