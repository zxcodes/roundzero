import type { Sql } from "postgres";

import type { getApplicationReviewById } from "@/features/applications/queries/queries_sql";
import { getReportsByBatchId } from "@/features/batches/queries/queries_sql";
import {
  getCommunicationAssessmentByApplicationId,
  getInterviewForCompanyByApplicationId,
  getInterviewMessagesByInterviewId,
} from "@/features/interviews/queries/queries_sql";
import { expireInterviewIfDue } from "@/features/interviews/server/expire";
import { loadCandidateSummaryFromApplication } from "@/features/interviews/shared/runtime";
import { getPreEvaluationByApplicationId } from "@/features/pre-evaluations/queries/queries_sql";
import { getReleasedReportByApplicationId } from "@/features/reports/queries/queries_sql";
import { parseStoredReport } from "@/features/reports/schemas";

type ApplicationReview = NonNullable<Awaited<ReturnType<typeof getApplicationReviewById>>>;

const getInterviewFallbackTimeline = (
  interview: NonNullable<Awaited<ReturnType<typeof getInterviewForCompanyByApplicationId>>>,
  applicationMetadata: unknown,
) => {
  const summary =
    loadCandidateSummaryFromApplication(applicationMetadata) ||
    "Interview completed in chat workspace.";
  const role: "assistant" | "candidate" = "assistant";

  return {
    messages: [
      {
        role,
        content: summary,
        createdAt: interview.updatedAt.toISOString(),
      },
    ],
  };
};

export async function loadApplicantReportTimeline(db: Sql, application: ApplicationReview) {
  let interview = await getInterviewForCompanyByApplicationId(db, {
    applicationId: application.id,
  });
  if (interview) {
    const result = await expireInterviewIfDue({
      db,
      interview: {
        id: interview.id,
        applicationId: interview.applicationId,
        status: interview.status,
        expiresAt: interview.expiresAt ?? null,
      },
    });
    if (result.expiredNow) {
      interview = await getInterviewForCompanyByApplicationId(db, {
        applicationId: application.id,
      });
    }
  }

  const interviewMessagesPromise = interview
    ? getInterviewMessagesByInterviewId(db, { interviewId: interview.id })
    : Promise.resolve<Awaited<ReturnType<typeof getInterviewMessagesByInterviewId>>>([]);

  const [preEvaluation, reportRow, communicationAssessment, interviewMessages] = await Promise.all([
    getPreEvaluationByApplicationId(db, { applicationId: application.id }),
    getReleasedReportByApplicationId(db, { applicationId: application.id }),
    getCommunicationAssessmentByApplicationId(db, { applicationId: application.id }),
    interviewMessagesPromise,
  ]);
  const interviewState =
    interview && interviewMessages.length > 0
      ? {
          messages: interviewMessages.map((message) => {
            const role: "assistant" | "candidate" =
              message.role === "assistant" ? "assistant" : "candidate";
            return {
              role,
              content: message.content,
              createdAt: message.createdAt.toISOString(),
            };
          }),
        }
      : interview
        ? getInterviewFallbackTimeline(interview, application.metadata)
        : null;

  let batchNavigation: {
    batchId: string;
    position: number;
    total: number;
    previousApplicationId: string | null;
    nextApplicationId: string | null;
  } | null = null;
  if (interview?.batchId) {
    const batchReports = await getReportsByBatchId(db, { batchId: interview.batchId });
    const currentIndex = batchReports.findIndex(
      (report) => report.applicationId === application.id,
    );
    if (currentIndex >= 0) {
      batchNavigation = {
        batchId: interview.batchId,
        position: currentIndex + 1,
        total: batchReports.length,
        previousApplicationId:
          currentIndex > 0 ? batchReports[currentIndex - 1].applicationId : null,
        nextApplicationId:
          currentIndex < batchReports.length - 1
            ? batchReports[currentIndex + 1].applicationId
            : null,
      };
    }
  }

  return {
    application,
    preEvaluation,
    interview,
    interviewState,
    report: reportRow ? parseStoredReport(reportRow) : null,
    reportCreatedAt: reportRow?.createdAt ?? null,
    communicationAssessment,
    batchNavigation,
  };
}
