import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getApplicationReviewById } from "@/features/applications/queries/queries_sql";
import {
  getCommunicationAssessmentByApplicationId,
  getInterviewByApplicationId,
} from "@/features/interviews/queries/queries_sql";
import { getPreEvaluationByApplicationId } from "@/features/pre-evaluations/queries/queries_sql";
import { getReportByApplicationId } from "@/features/reports/queries/queries_sql";
import { reportSchema } from "@/features/reports/schemas";
import { getDb } from "@/shared/db";
import { getInterviewAgentState } from "@/shared/interview-agent-client";
import { companyMiddleware } from "@/shared/middleware";

const applicationIdSchema = z.object({
  applicationId: z.string().uuid(),
});

type InterviewAgentMessage = {
  role: "assistant" | "candidate";
  content: string;
  createdAt: string;
};

type InterviewAgentState = {
  messages: InterviewAgentMessage[];
};

const getInterviewStateForCompany = async (interviewId: string) => {
  try {
    const payload = await getInterviewAgentState(interviewId);
    if (!payload || !Array.isArray((payload as InterviewAgentState).messages)) {
      return null;
    }
    const messages = (payload as InterviewAgentState).messages.filter(
      (m) =>
        (m.role === "assistant" || m.role === "candidate") &&
        typeof m.content === "string" &&
        typeof m.createdAt === "string",
    );
    return { messages };
  } catch {
    return null;
  }
};

const getInterviewFallbackTimeline = (
  interview: NonNullable<Awaited<ReturnType<typeof getInterviewByApplicationId>>>,
) => {
  const metadataRecord =
    typeof interview.metadata === "object" && interview.metadata !== null
      ? (interview.metadata as Record<string, unknown>)
      : {};

  const summary =
    typeof metadataRecord.candidateSummary === "string"
      ? metadataRecord.candidateSummary
      : "Interview completed in agents workspace.";

  return {
    messages: [
      {
        role: "assistant" as const,
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
    const interviewState = interview
      ? ((await getInterviewStateForCompany(interview.id)) ??
        getInterviewFallbackTimeline(interview))
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
