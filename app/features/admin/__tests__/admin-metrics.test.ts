import { describe, expect, it } from "vitest";

import {
  getPlatformAdminApplicationMetrics,
  getPlatformAdminApplicationStatuses,
  getPlatformAdminBatchCount,
  getPlatformAdminCompanyMetrics,
  getPlatformAdminCompanyPlans,
  getPlatformAdminInterviewMetrics,
  getPlatformAdminJobMetrics,
  getPlatformAdminPreEvaluationCount,
  getPlatformAdminReportMetrics,
  getPlatformAdminUserMetrics,
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

    const userMetrics = await getPlatformAdminUserMetrics(sql);
    const companyMetrics = await getPlatformAdminCompanyMetrics(sql);
    const jobMetrics = await getPlatformAdminJobMetrics(sql);
    const applicationMetrics = await getPlatformAdminApplicationMetrics(sql);
    const interviewMetrics = await getPlatformAdminInterviewMetrics(sql);
    const reportMetrics = await getPlatformAdminReportMetrics(sql);
    const batchCount = await getPlatformAdminBatchCount(sql);
    const preEvaluationCount = await getPlatformAdminPreEvaluationCount(sql);
    const plans = await getPlatformAdminCompanyPlans(sql);
    const statuses = await getPlatformAdminApplicationStatuses(sql);

    expect(userMetrics).not.toBeNull();
    expect(userMetrics!.activeUsers).toBeGreaterThanOrEqual(2);
    expect(companyMetrics).not.toBeNull();
    expect(companyMetrics!.companies).toBeGreaterThanOrEqual(1);
    expect(jobMetrics).not.toBeNull();
    expect(jobMetrics!.openJobs).toBeGreaterThanOrEqual(1);
    expect(applicationMetrics).not.toBeNull();
    expect(applicationMetrics!.applications).toBeGreaterThanOrEqual(1);
    expect(interviewMetrics).not.toBeNull();
    expect(interviewMetrics!.interviewsCompleted).toBeGreaterThanOrEqual(1);
    expect(reportMetrics).not.toBeNull();
    expect(batchCount).not.toBeNull();
    expect(preEvaluationCount).not.toBeNull();

    expect(plans).not.toBeNull();
    expect(plans!.total).toBeGreaterThanOrEqual(1);
    expect(plans!.planFree).toBeGreaterThanOrEqual(1);

    expect(statuses).not.toBeNull();
    expect(statuses!.applied).toBeGreaterThanOrEqual(1);
    expect(statuses!.total).toBeGreaterThanOrEqual(1);
  });
});
