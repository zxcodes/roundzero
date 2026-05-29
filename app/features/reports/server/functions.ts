import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getApplicationReviewById } from "@/features/applications/queries/queries_sql";
import {
  getCommunicationAssessmentByApplicationId,
  getInterviewByApplicationId,
  getInterviewMessagesByInterviewId,
} from "@/features/interviews/queries/queries_sql";
import { parseInterviewMetadata } from "@/features/interviews/shared/runtime";
import { getPreEvaluationByApplicationId } from "@/features/pre-evaluations/queries/queries_sql";
import { getReportByApplicationId } from "@/features/reports/queries/queries_sql";
import { reportSchema } from "@/features/reports/schemas";
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
  .inputValidator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const application = await getApplicationReviewById(db, { id: data.applicationId });
    if (!application) {
      return null;
    }

    if (application.companyId !== context.company.id) {
      throw new Error("Not authorized to view this applicant");
    }

    const interview = await getInterviewByApplicationId(db, {
      applicationId: data.applicationId,
    });
    const preEvaluation = await getPreEvaluationByApplicationId(db, {
      applicationId: data.applicationId,
    });
    const reportRow = await getReportByApplicationId(db, {
      applicationId: data.applicationId,
    });
    const communicationAssessment = await getCommunicationAssessmentByApplicationId(db, {
      applicationId: data.applicationId,
    });
    const interviewMessages = interview
      ? await getInterviewMessagesByInterviewId(db, {
          interviewId: interview.id,
        })
      : [];
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

    return {
      application,
      preEvaluation,
      interview,
      interviewState,
      report: reportRow
        ? (reportSchema.safeParse({
            summary: reportRow.summary,
            strengths: reportRow.strengths,
            weaknesses: reportRow.weaknesses,
            insights: reportRow.insights,
            evidence: reportRow.evidence,
            screeningAnswers: reportRow.screeningAnswers,
            scores: reportRow.scores,
            recommendation: reportRow.recommendation,
          }).data ?? null)
        : null,
      reportCreatedAt: reportRow?.createdAt ?? null,
      communicationAssessment,
    };
  });
