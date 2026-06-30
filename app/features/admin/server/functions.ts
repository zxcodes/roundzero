import { createServerFn } from "@tanstack/react-start";
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
import { getDb } from "@/shared/db";
import { platformAdminMiddleware } from "@/shared/middleware";

export const getPlatformAdminStats = createServerFn({ method: "GET" })
  .middleware([platformAdminMiddleware])
  .handler(async () => {
    const db = getDb();
    const [
      userMetrics,
      companyMetrics,
      jobMetrics,
      applicationMetrics,
      interviewMetrics,
      reportMetrics,
      batchCount,
      preEvaluationCount,
      companyPlans,
      applicationStatuses,
    ] = await Promise.all([
      getPlatformAdminUserMetrics(db),
      getPlatformAdminCompanyMetrics(db),
      getPlatformAdminJobMetrics(db),
      getPlatformAdminApplicationMetrics(db),
      getPlatformAdminInterviewMetrics(db),
      getPlatformAdminReportMetrics(db),
      getPlatformAdminBatchCount(db),
      getPlatformAdminPreEvaluationCount(db),
      getPlatformAdminCompanyPlans(db),
      getPlatformAdminApplicationStatuses(db),
    ]);

    if (
      !userMetrics ||
      !companyMetrics ||
      !jobMetrics ||
      !applicationMetrics ||
      !interviewMetrics ||
      !reportMetrics ||
      !batchCount ||
      !preEvaluationCount ||
      !companyPlans ||
      !applicationStatuses
    ) {
      throw new Error("Failed to load platform admin metrics");
    }

    return {
      overview: {
        activeUsers: userMetrics.activeUsers,
        companies: companyMetrics.companies,
        openJobs: jobMetrics.openJobs,
        applications: applicationMetrics.applications,
        interviewsCompleted: interviewMetrics.interviewsCompleted,
        reportsReleased: reportMetrics.reportsReleased,
      },
      recent: {
        newUsers: userMetrics.newUsers_7d,
        newCompanies: companyMetrics.newCompanies_7d,
        newApplications: applicationMetrics.newApplications_7d,
        newInterviews: interviewMetrics.newInterviews_7d,
        newReports: reportMetrics.newReports_7d,
      },
      users: {
        active: userMetrics.activeUsers,
        company: userMetrics.companyUsers,
        candidate: userMetrics.candidateUsers,
        unassigned: userMetrics.unassignedUsers,
        deleted: userMetrics.deletedUsers,
      },
      companies: {
        total: companyMetrics.companies,
        onboarded: companyMetrics.onboardedCompanies,
        plans: {
          free: companyPlans.planFree,
          starter: companyPlans.planStarter,
          growth: companyPlans.planGrowth,
          scale: companyPlans.planScale,
        },
      },
      jobs: {
        active: jobMetrics.activeJobs,
        open: jobMetrics.openJobs,
        draft: jobMetrics.draftJobs,
        closed: jobMetrics.closedJobs,
        archived: jobMetrics.archivedJobs,
      },
      interviews: {
        total: interviewMetrics.interviews,
        completed: interviewMetrics.interviewsCompleted,
        active: interviewMetrics.interviewsActive,
        cancelled: interviewMetrics.interviewsCancelled,
        expired: interviewMetrics.interviewsExpired,
      },
      reports: {
        total: reportMetrics.reports,
        released: reportMetrics.reportsReleased,
      },
      pipeline: {
        batches: batchCount.batches,
        preEvaluations: preEvaluationCount.preEvaluations,
        applications: applicationStatuses,
      },
      generatedAt: new Date().toISOString(),
    };
  });
