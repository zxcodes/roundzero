import { describe, expect, it } from "vitest";
import {
  getPlatformAdminApplicationStatuses,
  getPlatformAdminCompanyPlans,
  getPlatformAdminMetrics,
} from "@/features/admin/queries/queries_sql";
import { createApplication } from "@/features/applications/queries/queries_sql";
import { createInterview } from "@/features/interviews/queries/queries_sql";
import { createJob } from "@/features/jobs/queries/queries_sql";
import { getTestDb, makeTestResumeKey, seedCompany, seedUser } from "@/shared/__tests__/test-utils";

const sql = getTestDb();

describe("platform admin metrics queries", () => {
  it("returns aggregate counts across core tables", async () => {
    const { company } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });

    const job = await createJob(sql, {
      companyId: company.id,
      title: "Platform Metrics Job",
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
      status: "applied",
    });

    await createInterview(sql, {
      applicationId: application!.id,
      agentId: null,
      type: "full",
      metadata: {},
      status: "completed",
      invitedAt: null,
      startedAt: null,
      completedAt: null,
    });

    const metrics = await getPlatformAdminMetrics(sql);
    const plans = await getPlatformAdminCompanyPlans(sql);
    const statuses = await getPlatformAdminApplicationStatuses(sql);

    expect(metrics).not.toBeNull();
    expect(metrics!.activeUsers).toBeGreaterThanOrEqual(2);
    expect(metrics!.companies).toBeGreaterThanOrEqual(1);
    expect(metrics!.openJobs).toBeGreaterThanOrEqual(1);
    expect(metrics!.applications).toBeGreaterThanOrEqual(1);
    expect(metrics!.interviewsCompleted).toBeGreaterThanOrEqual(1);

    expect(plans).not.toBeNull();
    expect(plans!.total).toBeGreaterThanOrEqual(1);
    expect(plans!.planFree).toBeGreaterThanOrEqual(1);

    expect(statuses).not.toBeNull();
    expect(statuses!.applied).toBeGreaterThanOrEqual(1);
    expect(statuses!.total).toBeGreaterThanOrEqual(1);
  });
});
