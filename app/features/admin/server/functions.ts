import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import {
  getPlatformAdminApplicationMetrics,
  getPlatformAdminCompanyMetrics,
  getPlatformAdminInterviewMetrics,
  getPlatformAdminJobMetrics,
  getPlatformAdminReportMetrics,
  getPlatformAdminUserMetrics,
} from "@/features/admin/queries/queries_sql";
import {
  countFeedbackForPlatformAdmin,
  listFeedbackForPlatformAdmin,
} from "@/features/feedback/queries/queries_sql";
import { getDb } from "@/shared/db";
import { platformAdminMiddleware } from "@/shared/middleware";

export const ADMIN_FEEDBACK_PAGE_SIZE = 25;

const adminFeedbackPageSchema = z.object({
  page: z.number().int().min(1).default(1),
});

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
    ] = await Promise.all([
      getPlatformAdminUserMetrics(db),
      getPlatformAdminCompanyMetrics(db),
      getPlatformAdminJobMetrics(db),
      getPlatformAdminApplicationMetrics(db),
      getPlatformAdminInterviewMetrics(db),
      getPlatformAdminReportMetrics(db),
    ]);

    if (
      !userMetrics ||
      !companyMetrics ||
      !jobMetrics ||
      !applicationMetrics ||
      !interviewMetrics ||
      !reportMetrics
    ) {
      throw new Error("Failed to load platform admin metrics");
    }

    return buildPlatformAdminStatsPayload({
      userMetrics,
      companyMetrics,
      jobMetrics,
      applicationMetrics,
      interviewMetrics,
      reportMetrics,
    });
  });

export const getPlatformAdminFeedback = createServerFn({ method: "GET" })
  .middleware([platformAdminMiddleware])
  .validator(zodValidator(adminFeedbackPageSchema))
  .handler(async ({ data }) => {
    const db = getDb();
    const offset = (data.page - 1) * ADMIN_FEEDBACK_PAGE_SIZE;
    const [totalRow, items] = await Promise.all([
      countFeedbackForPlatformAdmin(db),
      listFeedbackForPlatformAdmin(db, {
        offset,
        limit: ADMIN_FEEDBACK_PAGE_SIZE,
      }),
    ]);

    if (!totalRow) {
      throw new Error("Failed to load feedback count");
    }

    const totalPages = Math.max(1, Math.ceil(totalRow.total / ADMIN_FEEDBACK_PAGE_SIZE));

    return {
      total: totalRow.total,
      items,
      page: data.page,
      pageSize: ADMIN_FEEDBACK_PAGE_SIZE,
      totalPages,
    };
  });

function buildPlatformAdminStatsPayload({
  userMetrics,
  companyMetrics,
  jobMetrics,
  applicationMetrics,
  interviewMetrics,
  reportMetrics,
}: {
  userMetrics: NonNullable<Awaited<ReturnType<typeof getPlatformAdminUserMetrics>>>;
  companyMetrics: NonNullable<Awaited<ReturnType<typeof getPlatformAdminCompanyMetrics>>>;
  jobMetrics: NonNullable<Awaited<ReturnType<typeof getPlatformAdminJobMetrics>>>;
  applicationMetrics: NonNullable<Awaited<ReturnType<typeof getPlatformAdminApplicationMetrics>>>;
  interviewMetrics: NonNullable<Awaited<ReturnType<typeof getPlatformAdminInterviewMetrics>>>;
  reportMetrics: NonNullable<Awaited<ReturnType<typeof getPlatformAdminReportMetrics>>>;
}) {
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
    interviews: {
      active: interviewMetrics.interviewsActive,
    },
    reports: {
      total: reportMetrics.reports,
      released: reportMetrics.reportsReleased,
    },
    generatedAt: new Date().toISOString(),
  };
}
