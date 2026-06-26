import type { getReleasedReportsForCompanyDashboardRow } from "@/features/dashboard/queries/queries_sql";
import type { getJobsWithPipelineByCompanyIdRow } from "@/features/jobs/queries/queries_sql";
import { getOverallScore, reportScoresSchema } from "@/features/reports/schemas";
import { type Recommendation, recommendationSchema } from "@/shared/enums";

export type DashboardCandidateReport = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  overallScore: number;
  recommendation: Recommendation;
  confidence: string | null;
  strengths: string[];
  topConcern: string | null;
  scores: {
    communication: number;
    problemSolving: number;
    ownership: number;
    roleFit: number;
  };
  releasedAt: Date;
  applicationStatus: string;
};

export type RoleAttention = {
  jobId: string;
  title: string;
  applicants: number;
  reportsReady: number;
  strongHire: number;
  hire: number;
  maybe: number;
  reject: number;
};

export type HeroSummary = {
  awaitingReviewCount: number;
  strongHireAwaitingCount: number;
  applicationsProcessed: number;
  interviewsCompleted: number;
  reportsReady: number;
  evaluatingCount: number;
  viewAllAwaitingJobId: string | null;
};

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
};

const formatConfidence = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export function mapReleasedReportRow(
  row: getReleasedReportsForCompanyDashboardRow,
): DashboardCandidateReport | null {
  const parsedRecommendation = recommendationSchema.safeParse(row.recommendation);
  if (!parsedRecommendation.success) {
    return null;
  }

  const overallScore = getOverallScore(row.scores);
  if (overallScore === null) {
    return null;
  }

  const parsedScores = reportScoresSchema.safeParse(row.scores);
  if (!parsedScores.success) {
    return null;
  }

  const weaknesses = parseStringArray(row.weaknesses);

  return {
    applicationId: row.applicationId,
    jobId: row.jobId,
    jobTitle: row.jobTitle,
    candidateName: row.candidateName,
    overallScore: Math.round(overallScore * 10) / 10,
    recommendation: parsedRecommendation.data,
    confidence: formatConfidence(row.preEvaluationConfidence),
    strengths: parseStringArray(row.strengths).slice(0, 3),
    topConcern: weaknesses[0] ?? null,
    scores: {
      communication: parsedScores.data.communication,
      problemSolving: parsedScores.data.problemSolving,
      ownership: parsedScores.data.ownership,
      roleFit: parsedScores.data.roleFit,
    },
    releasedAt: row.releasedAt ?? new Date(0),
    applicationStatus: row.applicationStatus,
  };
}

export function buildHeroSummary(
  jobs: getJobsWithPipelineByCompanyIdRow[],
  candidates: DashboardCandidateReport[],
  awaitingReview: DashboardCandidateReport[],
  activeBatches: { targetSize: number }[],
): HeroSummary {
  const applicationsProcessed = jobs.reduce((sum, job) => sum + job.totalApplicants, 0);
  const interviewsCompleted = jobs.reduce(
    (sum, job) =>
      sum + job.evaluatedCount + job.evaluatedHeldCount + job.shortlistedCount + job.rejectedCount,
    0,
  );
  const reportsReady = candidates.length;
  const evaluatingCount = activeBatches.reduce((sum, batch) => sum + batch.targetSize, 0);

  const jobCounts = new Map<string, number>();
  for (const candidate of awaitingReview) {
    jobCounts.set(candidate.jobId, (jobCounts.get(candidate.jobId) ?? 0) + 1);
  }

  let viewAllAwaitingJobId: string | null = null;
  let topCount = 0;
  for (const [jobId, count] of jobCounts) {
    if (count > topCount) {
      topCount = count;
      viewAllAwaitingJobId = jobId;
    }
  }

  return {
    awaitingReviewCount: awaitingReview.length,
    strongHireAwaitingCount: awaitingReview.filter(
      (candidate) => candidate.recommendation === "strong_yes",
    ).length,
    applicationsProcessed,
    interviewsCompleted,
    reportsReady,
    evaluatingCount,
    viewAllAwaitingJobId,
  };
}

export function buildRoleAttention(
  jobs: getJobsWithPipelineByCompanyIdRow[],
  candidates: DashboardCandidateReport[],
): RoleAttention[] {
  const openJobs = jobs.filter((job) => job.status === "open");

  return openJobs
    .map((job) => {
      const roleCandidates = candidates.filter((candidate) => candidate.jobId === job.id);

      return {
        jobId: job.id,
        title: job.title,
        applicants: job.totalApplicants,
        reportsReady: roleCandidates.length,
        strongHire: roleCandidates.filter((c) => c.recommendation === "strong_yes").length,
        hire: roleCandidates.filter((c) => c.recommendation === "yes").length,
        maybe: roleCandidates.filter((c) => c.recommendation === "lean_no").length,
        reject: roleCandidates.filter((c) => c.recommendation === "no").length,
      };
    })
    .filter((role) => role.applicants > 0 || role.reportsReady > 0)
    .sort((a, b) => {
      if (b.reportsReady !== a.reportsReady) {
        return b.reportsReady - a.reportsReady;
      }
      return b.applicants - a.applicants;
    });
}
