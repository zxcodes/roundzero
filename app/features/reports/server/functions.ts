import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getApplicationReviewById } from "@/features/applications/queries/queries_sql";
import { getInterviewByApplicationId } from "@/features/interviews/queries/queries_sql";
import { getPreEvaluationByApplicationId } from "@/features/pre-evaluations/queries/queries_sql";
import { getReportByApplicationId } from "@/features/reports/queries/queries_sql";
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

const isInterviewAgentState = (value: unknown): value is InterviewAgentState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.messages)) {
    return false;
  }

  return record.messages.every((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }

    const message = entry as Record<string, unknown>;
    return (
      (message.role === "assistant" || message.role === "candidate") &&
      typeof message.content === "string" &&
      typeof message.createdAt === "string"
    );
  });
};

const getInterviewStateForCompany = async (interviewId: string) => {
  try {
    const payload = (await getInterviewAgentState(env, interviewId)) as unknown;
    if (!isInterviewAgentState(payload)) {
      return null;
    }

    return payload;
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
    const report = await getReportByApplicationId(db, {
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
      report,
    };
  });
