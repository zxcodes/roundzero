import { createServerFn } from "@tanstack/react-start";
import {
  countApplicationsByCandidate,
  countApplicationsByCompany,
  getApplicationsByCandidate,
  getApplicationsByJob,
  getRecentApplicationsByCandidate,
} from "@/features/applications/queries/queries_sql";
import { hasShortlistNextSteps, parseShortlistDetails } from "@/features/applications/shortlist";
import { getActiveBatchesByCompany } from "@/features/batches/queries/queries_sql";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { getInterviewsByCandidate } from "@/features/interviews/queries/queries_sql";
import { expireInterviewIfDue } from "@/features/interviews/server/expire";
import {
  countJobsByCompanyAndStatus,
  getJobsWithPipelineByCompanyId,
} from "@/features/jobs/queries/queries_sql";
import { getOverallScore } from "@/features/reports/schemas";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";

export const getDashboardMetrics = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    if (!context.user.role) {
      throw new Error("User not found or role not set");
    }

    if (context.user.role === "company") {
      const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
      if (!company) {
        return {
          type: "company",
          openRoles: 0,
          draftJobs: 0,
          totalJobs: 0,
          totalApplicants: 0,
          evaluatedAwaitingDecision: 0,
          reportsCompleted: 0,
          shortlistRate: 0,
          roleHealth: [],
          reportHighlights: [],
          activeBatches: [],
        };
      }

      const [jobCounts, appCounts, jobsWithPipeline, activeBatches] = await Promise.all([
        countJobsByCompanyAndStatus(db, { companyId: company.id }),
        countApplicationsByCompany(db, { companyId: company.id }),
        getJobsWithPipelineByCompanyId(db, { companyId: company.id }),
        getActiveBatchesByCompany(db, { companyId: company.id }),
      ]);

      const roleHealth = jobsWithPipeline
        .filter((job) => job.status === "open")
        .map((job) => {
          const releasedReports = job.evaluatedCount;
          const backlog = job.evaluatedCount;
          const shortlistRate =
            releasedReports > 0 ? Math.round((job.shortlistedCount / releasedReports) * 100) : 0;

          const now = Date.now();
          const expiresAt = job.expiresAt ? job.expiresAt.getTime() : null;
          const expiresInDays =
            expiresAt && expiresAt > now
              ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
              : null;

          return {
            jobId: job.id,
            title: job.title,
            applicants: job.totalApplicants,
            applied: job.appliedCount,
            preScreening: job.preScreeningCount,
            queuedForBatch: job.queuedForBatchCount ?? 0,
            invited: job.interviewInvitedCount,
            inProgress: job.interviewInProgressCount,
            evaluatedHeld: job.evaluatedHeldCount ?? 0,
            evaluated: job.evaluatedCount,
            shortlisted: job.shortlistedCount,
            rejected: job.rejectedCount,
            reportsCompleted: releasedReports,
            finalReportTarget: job.finalReportTarget,
            backlog,
            shortlistRate,
            expiresInDays,
          };
        })
        .sort((a, b) => b.backlog - a.backlog);

      const evaluatedAwaitingDecision = roleHealth.reduce((sum, role) => sum + role.backlog, 0);
      const reportsCompleted = roleHealth.reduce((sum, role) => sum + role.reportsCompleted, 0);
      const shortlistedTotal = roleHealth.reduce((sum, role) => sum + role.shortlisted, 0);
      const shortlistRate =
        reportsCompleted > 0 ? Math.round((shortlistedTotal / reportsCompleted) * 100) : 0;

      const reportHighlights: {
        applicationId: string;
        jobId: string;
        jobTitle: string;
        candidateName: string;
        candidateEmail: string;
        recommendation: string;
        overallScore: number | null;
      }[] = [];

      for (const role of roleHealth.slice(0, 4)) {
        const jobApplicants = await getApplicationsByJob(db, { jobId: role.jobId });

        for (const applicant of jobApplicants) {
          if (applicant.reportId === null || applicant.reportReleasedAt === null) {
            continue;
          }

          const score = getOverallScore(applicant.reportScores);

          reportHighlights.push({
            applicationId: applicant.id,
            jobId: role.jobId,
            jobTitle: role.title,
            candidateName: applicant.candidateName,
            candidateEmail: applicant.candidateEmail,
            recommendation: applicant.reportRecommendation ?? "unknown",
            overallScore: score !== null ? Math.round(score) : null,
          });
        }
      }

      reportHighlights.sort((a, b) => {
        const scoreA = a.overallScore ?? 0;
        const scoreB = b.overallScore ?? 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return a.candidateName.localeCompare(b.candidateName);
      });

      return {
        type: "company",
        openRoles: jobCounts?.openCount ?? 0,
        draftJobs: jobCounts?.draftCount ?? 0,
        totalJobs: jobCounts?.totalCount ?? 0,
        totalApplicants: appCounts?.totalCount ?? 0,
        evaluatedAwaitingDecision,
        reportsCompleted,
        shortlistRate,
        roleHealth,
        reportHighlights: reportHighlights.slice(0, 8),
        activeBatches: activeBatches ?? [],
      };
    }

    // Candidate
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
        // Soonest expiry first; nulls (no expiry) last
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
