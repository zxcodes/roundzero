import { createServerFn } from "@tanstack/react-start";
import {
  getPlatformAdminApplicationStatuses,
  getPlatformAdminCompanyPlans,
  getPlatformAdminMetrics,
} from "@/features/admin/queries/queries_sql";
import { getDb } from "@/shared/db";
import { platformAdminMiddleware } from "@/shared/middleware";

export const getPlatformAdminStats = createServerFn({ method: "GET" })
  .middleware([platformAdminMiddleware])
  .handler(async () => {
    const db = getDb();
    const [metricsRow, companyPlansRow, applicationStatusesRow] = await Promise.all([
      getPlatformAdminMetrics(db),
      getPlatformAdminCompanyPlans(db),
      getPlatformAdminApplicationStatuses(db),
    ]);

    if (!metricsRow || !companyPlansRow || !applicationStatusesRow) {
      throw new Error("Failed to load platform admin metrics");
    }

    const metrics = metricsRow;
    const companyPlans = companyPlansRow;
    const applicationStatuses = applicationStatusesRow;

    return {
      overview: {
        activeUsers: metrics.activeUsers,
        companies: metrics.companies,
        openJobs: metrics.openJobs,
        applications: metrics.applications,
        interviewsCompleted: metrics.interviewsCompleted,
        reportsReleased: metrics.reportsReleased,
      },
      recent: {
        newUsers: metrics.newUsers_7d,
        newCompanies: metrics.newCompanies_7d,
        newApplications: metrics.newApplications_7d,
        newInterviews: metrics.newInterviews_7d,
        newReports: metrics.newReports_7d,
      },
      users: {
        active: metrics.activeUsers,
        company: metrics.companyUsers,
        candidate: metrics.candidateUsers,
        unassigned: metrics.unassignedUsers,
        deleted: metrics.deletedUsers,
      },
      companies: {
        total: metrics.companies,
        onboarded: metrics.onboardedCompanies,
        plans: {
          free: companyPlans.planFree,
          starter: companyPlans.planStarter,
          growth: companyPlans.planGrowth,
          scale: companyPlans.planScale,
        },
      },
      jobs: {
        active: metrics.activeJobs,
        open: metrics.openJobs,
        draft: metrics.draftJobs,
        closed: metrics.closedJobs,
        archived: metrics.archivedJobs,
      },
      interviews: {
        total: metrics.interviews,
        completed: metrics.interviewsCompleted,
        active: metrics.interviewsActive,
        cancelled: metrics.interviewsCancelled,
        expired: metrics.interviewsExpired,
      },
      reports: {
        total: metrics.reports,
        released: metrics.reportsReleased,
      },
      pipeline: {
        batches: metrics.batches,
        preEvaluations: metrics.preEvaluations,
        applications: applicationStatuses,
      },
      generatedAt: new Date().toISOString(),
    };
  });
