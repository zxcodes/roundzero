import { createServerFn } from "@tanstack/react-start";
import {
  countApplicationsByCandidate,
  getApplicationsByCandidate,
  getRecentApplicationsByCandidate,
} from "@/features/applications/queries/queries_sql";
import { hasShortlistNextSteps, parseShortlistDetails } from "@/features/applications/shortlist";
import { getActiveBatchesByCompany } from "@/features/batches/queries/queries_sql";
import { getCompanyByMemberUserId } from "@/features/companies/queries/membership-queries_sql";
import {
  buildActivitySummary,
  buildHeroSummary,
  buildRoleAttention,
  mapReleasedReportRow,
} from "@/features/dashboard/company-metrics";
import {
  getRecentCompanyApplicationActivity,
  getReleasedReportsForCompanyDashboard,
} from "@/features/dashboard/queries/queries_sql";
import { getInterviewsByCandidate } from "@/features/interviews/queries/queries_sql";
import { expireInterviewIfDue } from "@/features/interviews/server/expire";
import { getJobsWithPipelineByCompanyId } from "@/features/jobs/queries/queries_sql";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";

const emptyCompanyDashboard = {
  type: "company" as const,
  awaitingReview: [],
  rolesNeedingAttention: [],
  recentReports: [],
  activitySummary: [],
  heroSummary: {
    awaitingReviewCount: 0,
    strongHireAwaitingCount: 0,
    applicationsProcessed: 0,
    interviewsCompleted: 0,
    reportsReady: 0,
    evaluatingCount: 0,
    viewAllAwaitingJobId: null,
  },
};

export const getDashboardMetrics = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    if (!context.user.role) {
      throw new Error("User not found or role not set");
    }

    if (context.user.role === "company") {
      const company = await getCompanyByMemberUserId(db, { userId: context.userId });
      if (!company) {
        return emptyCompanyDashboard;
      }

      const [jobsWithPipeline, activeBatches, releasedRows, recentActivityRows] = await Promise.all(
        [
          getJobsWithPipelineByCompanyId(db, { companyId: company.id }),
          getActiveBatchesByCompany(db, { companyId: company.id }),
          getReleasedReportsForCompanyDashboard(db, { companyId: company.id }),
          getRecentCompanyApplicationActivity(db, { companyId: company.id }),
        ],
      );

      const candidates = releasedRows
        .map(mapReleasedReportRow)
        .filter((row): row is NonNullable<typeof row> => row !== null);

      const allAwaitingReview = candidates
        .filter((candidate) => candidate.applicationStatus === "evaluated")
        .sort((a, b) => b.overallScore - a.overallScore);

      const awaitingReview = allAwaitingReview.slice(0, 3);

      const recentReports = [...candidates]
        .sort((a, b) => b.releasedAt.getTime() - a.releasedAt.getTime())
        .slice(0, 5);

      const rolesNeedingAttention = buildRoleAttention(jobsWithPipeline, candidates).slice(0, 6);

      const activitySummary = buildActivitySummary(candidates, recentActivityRows);

      const heroSummary = buildHeroSummary(
        jobsWithPipeline,
        candidates,
        allAwaitingReview,
        (activeBatches ?? []).map((batch) => ({ targetSize: batch.targetSize })),
      );

      return {
        type: "company" as const,
        awaitingReview,
        rolesNeedingAttention,
        recentReports,
        activitySummary,
        heroSummary,
      };
    }

    const counts = await countApplicationsByCandidate(db, { candidateId: context.userId });

    const [rawInterviews, rawApplications, recentApplications] = await Promise.all([
      getInterviewsByCandidate(db, { candidateId: context.userId }),
      getApplicationsByCandidate(db, { candidateId: context.userId }),
      getRecentApplicationsByCandidate(db, { candidateId: context.userId }),
    ]);

    const interviews = await Promise.all(
      rawInterviews.map(async (iv) => {
        const result = await expireInterviewIfDue({
          db,
          interview: iv,
          postEvaluation: null,
        });
        return result.interview;
      }),
    );

    const pendingInterviews = interviews
      .filter((iv) => iv.status === "pending" || iv.status === "in_progress")
      .map((iv) => ({
        id: iv.id,
        applicationId: iv.applicationId,
        jobTitle: iv.jobTitle,
        companyName: iv.companyName,
        status: iv.status,
        expiresAt: iv.expiresAt ?? null,
      }))
      .sort((a, b) => {
        if (!a.expiresAt && !b.expiresAt) return 0;
        if (!a.expiresAt) return 1;
        if (!b.expiresAt) return -1;
        return a.expiresAt.localeCompare(b.expiresAt);
      });

    const shortlistedApplications = rawApplications
      .filter((a) => a.status === "shortlisted" && !a.companyOwnerDeleted)
      .map((a) => {
        const details = parseShortlistDetails(a.metadata);
        return {
          id: a.id,
          jobTitle: a.jobTitle,
          companyName: a.companyName,
          hasFollowUp: hasShortlistNextSteps(details),
        };
      });

    const recentActivity = recentApplications.map((a) => ({
      id: a.id,
      jobTitle: a.jobTitle,
      companyName: a.companyName,
      status: a.status,
      updatedAt: a.updatedAt,
      jobStatus: a.jobStatus,
      companyOwnerDeleted: a.companyOwnerDeleted,
      interviewStatus: a.interviewStatus ?? null,
    }));

    return {
      type: "candidate",
      applicationsSent: counts?.totalCount ?? 0,
      activeApplications: counts?.activeCount ?? 0,
      interviewInvites: counts?.interviewInvitedCount ?? 0,
      evaluationsReceived: counts?.evaluatedCount ?? 0,
      shortlistedCount: shortlistedApplications.length,
      pendingInterviews,
      shortlistedApplications,
      recentActivity,
    };
  });
