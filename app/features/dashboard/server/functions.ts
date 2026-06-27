import { createServerFn } from "@tanstack/react-start";
import type { Sql } from "postgres";
import {
  countApplicationsByCandidate,
  getApplicationsByCandidate,
  getRecentApplicationsByCandidate,
} from "@/features/applications/queries/queries_sql";
import { hasShortlistNextSteps, parseShortlistDetails } from "@/features/applications/shortlist";
import { getActiveBatchesByCompany } from "@/features/batches/queries/queries_sql";
import { getCompanyByMemberUserId } from "@/features/companies/queries/membership-queries_sql";
import {
  buildHeroSummary,
  buildRoleAttention,
  mapReleasedReportRow,
} from "@/features/dashboard/company-metrics";
import { getReleasedReportsForCompanyDashboard } from "@/features/dashboard/queries/queries_sql";
import { getInterviewsByCandidate } from "@/features/interviews/queries/queries_sql";
import { shouldAutoExpireInterview } from "@/features/interviews/shared/expiry";
import { getJobsWithPipelineByCompanyId } from "@/features/jobs/queries/queries_sql";
import { getDb } from "@/shared/db";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";

const emptyHeroSummary = {
  awaitingReviewCount: 0,
  strongHireAwaitingCount: 0,
  applicationsProcessed: 0,
  interviewsCompleted: 0,
  reportsReady: 0,
  evaluatingCount: 0,
  viewAllAwaitingJobId: null,
};

const emptyCompanyDashboard = {
  type: "company" as const,
  hero: Promise.resolve({ heroSummary: emptyHeroSummary }),
  awaitingReview: Promise.resolve({ candidates: [], awaitingReviewCount: 0 }),
  rolesNeedingAttention: Promise.resolve({ roles: [] }),
  recentActivity: Promise.resolve({ reports: [], evaluatingCount: 0 }),
};

export function loadCompanyDashboardSections(db: Sql, companyId: string) {
  const releasedPromise = getReleasedReportsForCompanyDashboard(db, { companyId });
  const jobsPromise = getJobsWithPipelineByCompanyId(db, { companyId });
  const batchesPromise = getActiveBatchesByCompany(db, { companyId });

  const candidatesPromise = releasedPromise.then((releasedRows) =>
    releasedRows
      .map(mapReleasedReportRow)
      .filter((row): row is NonNullable<typeof row> => row !== null),
  );

  const hero = Promise.all([jobsPromise, batchesPromise, candidatesPromise]).then(
    ([jobsWithPipeline, activeBatches, candidates]) => {
      const allAwaitingReview = candidates
        .filter((candidate) => candidate.applicationStatus === "evaluated")
        .sort((a, b) => b.overallScore - a.overallScore);

      return {
        heroSummary: buildHeroSummary(
          jobsWithPipeline,
          candidates,
          allAwaitingReview,
          (activeBatches ?? []).map((batch) => ({ targetSize: batch.targetSize })),
        ),
      };
    },
  );

  const awaitingReview = candidatesPromise.then((candidates) => {
    const allAwaitingReview = candidates
      .filter((candidate) => candidate.applicationStatus === "evaluated")
      .sort((a, b) => b.overallScore - a.overallScore);

    return {
      candidates: allAwaitingReview.slice(0, 6),
      awaitingReviewCount: allAwaitingReview.length,
    };
  });

  const rolesNeedingAttention = Promise.all([jobsPromise, candidatesPromise]).then(
    ([jobsWithPipeline, candidates]) => ({
      roles: buildRoleAttention(jobsWithPipeline, candidates).slice(0, 6),
    }),
  );

  const evaluatingCountPromise = batchesPromise.then((activeBatches) =>
    (activeBatches ?? []).reduce((sum, batch) => sum + batch.targetSize, 0),
  );

  const recentActivity = Promise.all([candidatesPromise, evaluatingCountPromise]).then(
    ([candidates, evaluatingCount]) => ({
      reports: [...candidates]
        .sort((a, b) => b.releasedAt.getTime() - a.releasedAt.getTime())
        .slice(0, 6),
      evaluatingCount,
    }),
  );

  return { hero, awaitingReview, rolesNeedingAttention, recentActivity };
}

export function resolveInterviewsForDashboard<
  T extends { status: string; expiresAt: Date | string | null },
>(interviews: T[]): T[] {
  return interviews.map((interview) => {
    if (!shouldAutoExpireInterview(interview.status, interview.expiresAt)) {
      return interview;
    }

    return { ...interview, status: "expired" };
  });
}

export function loadCandidateDashboardSections(db: Sql, candidateId: string) {
  const countsPromise = countApplicationsByCandidate(db, { candidateId });
  const interviewsRawPromise = getInterviewsByCandidate(db, { candidateId });
  const applicationsPromise = getApplicationsByCandidate(db, { candidateId });
  const recentPromise = getRecentApplicationsByCandidate(db, { candidateId });

  const interviewsPromise = interviewsRawPromise.then((rawInterviews) =>
    resolveInterviewsForDashboard(rawInterviews),
  );

  const hero = Promise.all([countsPromise, interviewsPromise, applicationsPromise]).then(
    ([counts, interviews, rawApplications]) => {
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

      return {
        applicationsSent: counts?.totalCount ?? 0,
        activeApplications: counts?.activeCount ?? 0,
        interviewInvites: counts?.interviewInvitedCount ?? 0,
        evaluationsReceived: counts?.evaluatedCount ?? 0,
        shortlistedCount: shortlistedApplications.length,
        pendingInterviews,
        shortlistedApplications,
      };
    },
  );

  const recentActivity = Promise.all([recentPromise, interviewsPromise]).then(
    ([recentApplications, interviews]) => {
      const interviewStatusByApplicationId = new Map(
        interviews.map((interview) => [interview.applicationId, interview.status]),
      );

      return {
        activity: recentApplications.map((application) => ({
          id: application.id,
          jobTitle: application.jobTitle,
          companyName: application.companyName,
          status: application.status,
          updatedAt: application.updatedAt,
          jobStatus: application.jobStatus,
          companyOwnerDeleted: application.companyOwnerDeleted,
          interviewStatus:
            interviewStatusByApplicationId.get(application.id) ??
            application.interviewStatus ??
            null,
        })),
      };
    },
  );

  return { hero, recentActivity };
}

export const getAwaitingReviewReports = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const releasedRows = await getReleasedReportsForCompanyDashboard(db, {
      companyId: context.company.id,
    });

    return releasedRows
      .map(mapReleasedReportRow)
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .filter((candidate) => candidate.applicationStatus === "evaluated")
      .sort((a, b) => b.overallScore - a.overallScore);
  });

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

      const sections = loadCompanyDashboardSections(db, company.id);

      return {
        type: "company" as const,
        ...sections,
      };
    }

    const sections = loadCandidateDashboardSections(db, context.userId);

    return {
      type: "candidate" as const,
      ...sections,
    };
  });
