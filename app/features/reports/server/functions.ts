import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getApplicationReviewById } from "@/features/applications/queries/queries_sql";
import { getReportsByBatchId } from "@/features/batches/queries/queries_sql";
import {
  getCommunicationAssessmentByApplicationId,
  getInterviewByApplicationId,
  getInterviewMessagesByInterviewId,
} from "@/features/interviews/queries/queries_sql";
import { expireInterviewIfDue } from "@/features/interviews/server/expire";
import { parseInterviewMetadata } from "@/features/interviews/shared/runtime";
import { getPreEvaluationByApplicationId } from "@/features/pre-evaluations/queries/queries_sql";
import { getReleasedReportByApplicationId } from "@/features/reports/queries/queries_sql";
import { parseStoredReport } from "@/features/reports/schemas";
import { getDb } from "@/shared/db";
import { companyMiddleware } from "@/shared/middleware";

const applicationIdSchema = z.object({
  applicationId: z.string().uuid(),
});

const getInterviewFallbackTimeline = (
  interview: NonNullable<Awaited<ReturnType<typeof getInterviewByApplicationId>>>,
) => {
  const metadata = parseInterviewMetadata(interview.metadata);
  const summary =
    metadata.contextState?.candidateSummary ?? "Interview completed in chat workspace.";
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

export const getCompanyApplicantReportTimeline = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .validator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const application = await getApplicationReviewById(db, { id: data.applicationId });
    if (!application) {
      return null;
    }

    if (application.companyId !== context.company.id) {
      throw new Error("Not authorized to view this applicant");
    }

    let interview = await getInterviewByApplicationId(db, {
      applicationId: data.applicationId,
    });
    if (interview) {
      const result = await expireInterviewIfDue({
        db,
        interview: {
          id: interview.id,
          applicationId: interview.applicationId,
          status: interview.status,
          expiresAt: interview.metadata?.expiresAt ?? null,
        },
        postEvaluation: env.POST_EVALUATION,
      });
      if (result.expiredNow) {
        interview = await getInterviewByApplicationId(db, {
          applicationId: data.applicationId,
        });
      }
    }
    const interviewMessagesPromise = interview
      ? getInterviewMessagesByInterviewId(db, { interviewId: interview.id })
      : Promise.resolve<Awaited<ReturnType<typeof getInterviewMessagesByInterviewId>>>([]);

    const [preEvaluation, reportRow, communicationAssessment, interviewMessages] =
      await Promise.all([
        getPreEvaluationByApplicationId(db, { applicationId: data.applicationId }),
        getReleasedReportByApplicationId(db, { applicationId: data.applicationId }),
        getCommunicationAssessmentByApplicationId(db, { applicationId: data.applicationId }),
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
          ? getInterviewFallbackTimeline(interview)
          : null;

    // Batch navigation — prev/next reports inside the same batch, ranked by score.
    let batchNavigation: {
      batchId: string;
      position: number;
      total: number;
      previousApplicationId: string | null;
      nextApplicationId: string | null;
    } | null = null;
    if (interview?.batchId) {
      const batchReports = await getReportsByBatchId(db, { batchId: interview.batchId });
      const currentIndex = batchReports.findIndex((r) => r.applicationId === data.applicationId);
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
  });
