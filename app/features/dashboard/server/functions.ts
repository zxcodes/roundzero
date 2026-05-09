import { createServerFn } from "@tanstack/react-start";
import {
  countApplicationsByCandidate,
  countApplicationsByCompany,
  getApplicationsByJob,
} from "@/features/applications/queries/queries_sql";
import { getActiveBatchesByCompany } from "@/features/batches/queries/queries_sql";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import {
  countJobsByCompanyAndStatus,
  getJobsWithPipelineByCompanyId,
} from "@/features/jobs/queries/queries_sql";
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

          const reportScores =
            typeof applicant.reportScores === "object" && applicant.reportScores !== null
              ? (applicant.reportScores as Record<string, unknown>)
              : null;

          const overallScoreRaw = reportScores?.overall;
          const overallScore =
            typeof overallScoreRaw === "number"
              ? Math.round(overallScoreRaw)
              : typeof overallScoreRaw === "string"
                ? Number.parseInt(overallScoreRaw, 10)
                : null;

          reportHighlights.push({
            applicationId: applicant.id,
            jobId: role.jobId,
            jobTitle: role.title,
            candidateName: applicant.candidateName,
            candidateEmail: applicant.candidateEmail,
            recommendation: applicant.reportRecommendation ?? "unknown",
            overallScore: Number.isFinite(overallScore ?? NaN) ? overallScore : null,
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

    return {
      type: "candidate",
      applicationsSent: counts?.totalCount ?? 0,
      activeApplications: counts?.activeCount ?? 0,
      interviewInvites: counts?.interviewInvitedCount ?? 0,
      evaluationsReceived: counts?.evaluatedCount ?? 0,
    };
  });
