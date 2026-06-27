import { describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({
  env: {
    HYPERDRIVE: {
      connectionString:
        process.env.TEST_DATABASE_URL ??
        "postgres://postgres:password@localhost:6312/postgres?sslmode=disable",
    },
    RESUMES: {
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { createApplication } from "@/features/applications/queries/queries_sql";
import {
  loadCandidateDashboardSections,
  loadCompanyDashboardSections,
  resolveInterviewsForDashboard,
} from "@/features/dashboard/server/functions";
import { createInterview } from "@/features/interviews/queries/queries_sql";
import { createJob } from "@/features/jobs/queries/queries_sql";
import { getTestDb, makeTestResumeKey, seedCompany, seedUser } from "@/shared/__tests__/test-utils";

const sql = getTestDb();

describe("dashboard section loaders", () => {
  it("returns promise-shaped company section keys", async () => {
    const { company } = await seedCompany();
    const sections = loadCompanyDashboardSections(sql, company.id);

    expect(sections.hero).toBeInstanceOf(Promise);
    expect(sections.awaitingReview).toBeInstanceOf(Promise);
    expect(sections.rolesNeedingAttention).toBeInstanceOf(Promise);
    expect(sections.recentActivity).toBeInstanceOf(Promise);

    const [hero, awaitingReview, roles, recent] = await Promise.all([
      sections.hero,
      sections.awaitingReview,
      sections.rolesNeedingAttention,
      sections.recentActivity,
    ]);

    expect(hero).toHaveProperty("heroSummary");
    expect(awaitingReview).toHaveProperty("candidates");
    expect(awaitingReview).toHaveProperty("awaitingReviewCount");
    expect(roles).toHaveProperty("roles");
    expect(recent).toHaveProperty("reports");
    expect(recent).toHaveProperty("evaluatingCount");
  });

  it("resolves company recent activity independently of hero", async () => {
    const { company } = await seedCompany();
    const sections = loadCompanyDashboardSections(sql, company.id);

    const recent = await sections.recentActivity;
    expect(recent).toEqual({
      reports: [],
      evaluatingCount: 0,
    });

    const hero = await sections.hero;
    expect(hero.heroSummary.reportsReady).toBe(0);
  });

  it("returns promise-shaped candidate section keys", async () => {
    const candidate = await seedUser({ role: "candidate" });
    const sections = loadCandidateDashboardSections(sql, candidate.id);

    expect(sections.hero).toBeInstanceOf(Promise);
    expect(sections.recentActivity).toBeInstanceOf(Promise);

    const [hero, recent] = await Promise.all([sections.hero, sections.recentActivity]);

    expect(hero).toHaveProperty("pendingInterviews");
    expect(hero).toHaveProperty("shortlistedApplications");
    expect(recent).toHaveProperty("activity");
    expect(Array.isArray(recent.activity)).toBe(true);
  });
});

describe("resolveInterviewsForDashboard", () => {
  it("marks overdue pending interviews as expired for display", () => {
    const pastExpiry = new Date(Date.now() - 60_000).toISOString();
    const [interview] = resolveInterviewsForDashboard([
      {
        id: "iv-1",
        status: "pending",
        expiresAt: pastExpiry,
      },
    ]);

    expect(interview?.status).toBe("expired");
  });

  it("leaves active pending interviews unchanged", () => {
    const futureExpiry = new Date(Date.now() + 60_000 * 60).toISOString();
    const [interview] = resolveInterviewsForDashboard([
      {
        id: "iv-1",
        status: "pending",
        expiresAt: futureExpiry,
      },
    ]);

    expect(interview?.status).toBe("pending");
  });
});

describe("candidate dashboard recent activity expiry overlay", () => {
  it("shows expired interview status in recent activity when the window has passed", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });

    const job = await createJob(sql, {
      companyId: company.id,
      title: "Expired Interview Role",
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

    const application = await createApplication(sql, {
      jobId: job!.id,
      candidateId: candidate.id,
      resumeKey: makeTestResumeKey(candidate.id),
      metadata: {},
      status: "interview_invited",
    });

    await createInterview(sql, {
      applicationId: application!.id,
      agentId: "test-agent",
      type: "full",
      metadata: { expiresAt: new Date(Date.now() - 60_000).toISOString() },
      status: "pending",
      invitedAt: new Date(),
      startedAt: null,
      completedAt: null,
    });

    const sections = loadCandidateDashboardSections(sql, candidate.id);
    const [hero, recent] = await Promise.all([sections.hero, sections.recentActivity]);

    expect(hero.pendingInterviews).toHaveLength(0);
    expect(recent.activity[0]?.interviewStatus).toBe("expired");
  });
});
