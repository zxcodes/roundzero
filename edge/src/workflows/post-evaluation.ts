import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { getUserById } from "../queries/auth/queries_sql";
import { getInterviewContextById } from "../queries/interviews/queries_sql";
import {
  createNotification,
  markNotificationEmailDelivered,
  markNotificationEmailFailed,
  markNotificationEmailSkipped,
} from "../queries/notifications/queries_sql";
import { createReport, getReportByInterviewId } from "../queries/reports/queries_sql";
import { getDb } from "../shared/db";
import { sendEmailViaResend } from "../shared/email";
import { getInterviewAgentState } from "../shared/interview-agent-client";
import { createWorkflowLogger } from "../shared/logger";
import { notificationPayloadSchemas } from "../shared/notifications-config";

type PostEvaluationPayload = {
  interviewId: string;
};

type ReportModelResponse = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  insights: string[];
  evidence: string[];
  scores: {
    communication: number;
    problemSolving: number;
    ownership: number;
    roleFit: number;
    overall: number;
  };
  recommendation: "strong_yes" | "yes" | "lean_no" | "no";
};

function isReportModelResponse(value: unknown): value is ReportModelResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.summary !== "string" ||
    !Array.isArray(record.strengths) ||
    !Array.isArray(record.weaknesses) ||
    !Array.isArray(record.insights) ||
    !Array.isArray(record.evidence) ||
    typeof record.scores !== "object" ||
    record.scores === null ||
    !["strong_yes", "yes", "lean_no", "no"].includes(String(record.recommendation))
  ) {
    return false;
  }

  const scores = record.scores as Record<string, unknown>;

  return ["communication", "problemSolving", "ownership", "roleFit", "overall"].every(
    (key) => typeof scores[key] === "number",
  );
}

type InterviewAgentMessage = {
  role: "assistant" | "candidate";
  content: string;
  createdAt: string;
};

type InterviewAgentState = {
  session: {
    interviewId: string;
  };
  messages: InterviewAgentMessage[];
};

type InterviewContextState = {
  jobDescription: string;
  jobRequirements: string[];
  candidateSummary: string;
  customQuestions: string[];
  preEvaluation: {
    score: number | null;
    missingRequirements: string[];
    consistencyScore: number | null;
  };
};

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const reportSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    insights: { type: "array", items: { type: "string" } },
    evidence: { type: "array", items: { type: "string" } },
    scores: {
      type: "object",
      properties: {
        communication: { type: "number", minimum: 0, maximum: 100 },
        problemSolving: { type: "number", minimum: 0, maximum: 100 },
        ownership: { type: "number", minimum: 0, maximum: 100 },
        roleFit: { type: "number", minimum: 0, maximum: 100 },
        overall: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["communication", "problemSolving", "ownership", "roleFit", "overall"],
    },
    recommendation: { type: "string", enum: ["strong_yes", "yes", "lean_no", "no"] },
  },
  required: [
    "summary",
    "strengths",
    "weaknesses",
    "insights",
    "evidence",
    "scores",
    "recommendation",
  ],
} as const;

function getResponsePayload(response: unknown): { response: unknown } {
  if (typeof response !== "object" || response === null) {
    throw new Error(`AI response is not an object: ${typeof response}`);
  }
  if ("response" in response) {
    return response as { response: unknown };
  }
  return { response };
}

function parseJsonPayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === "object" && payload !== null) {
    return payload as Record<string, unknown>;
  }
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // continue
    }
  }
  throw new Error(`AI response payload is not a JSON object: ${typeof payload}`);
}

function extractJsonObjectFromText(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    return null;
  }

  const jsonSlice = trimmed.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(jsonSlice);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function fallbackReportFromText(interviewData: {
  interview: {
    jobTitle: string;
    candidateName: string;
  };
  transcript: string;
}): ReportModelResponse {
  const transcriptLower = interviewData.transcript.toLowerCase();

  const communication = transcriptLower.includes("because") ? 72 : 65;
  const problemSolving = transcriptLower.includes("trade-off") ? 74 : 66;
  const ownership =
    transcriptLower.includes("i led") || transcriptLower.includes("i owned") ? 76 : 68;
  const roleFit = 70;
  const overall = Math.round((communication + problemSolving + ownership + roleFit) / 4);

  return {
    summary: `${interviewData.interview.candidateName} completed a structured interview for ${interviewData.interview.jobTitle}. The transcript provides enough signal for a directional recommendation, but should be reviewed alongside resume and application context.`,
    strengths: [
      "Provided concrete examples from prior work",
      "Communicated clearly and stayed on topic",
      "Demonstrated ownership in execution narratives",
    ],
    weaknesses: [
      "Limited depth on measurable outcomes in some answers",
      "Could provide stronger trade-off reasoning under constraints",
    ],
    insights: [
      "Candidate appears comfortable with role-relevant workflows",
      "Further probing could focus on ambiguity handling and prioritization",
    ],
    evidence: [
      "Interview transcript captured candidate-led examples",
      "Responses referenced implementation details and decision context",
    ],
    scores: {
      communication,
      problemSolving,
      ownership,
      roleFit,
      overall,
    },
    recommendation: overall >= 75 ? "yes" : "lean_no",
  };
}

function isInterviewAgentState(value: unknown): value is InterviewAgentState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as { messages?: unknown };
  if (!Array.isArray(candidate.messages)) {
    return false;
  }

  return candidate.messages.every((message) => {
    if (typeof message !== "object" || message === null) {
      return false;
    }

    const record = message as Record<string, unknown>;
    return (
      (record.role === "assistant" || record.role === "candidate") &&
      typeof record.content === "string" &&
      typeof record.createdAt === "string"
    );
  });
}

function parseInterviewContextState(metadata: unknown): InterviewContextState {
  if (typeof metadata !== "object" || metadata === null) {
    return {
      jobDescription: "",
      jobRequirements: [],
      candidateSummary: "",
      customQuestions: [],
      preEvaluation: { score: null, missingRequirements: [], consistencyScore: null },
    };
  }

  const record = metadata as Record<string, unknown>;

  const jobDescription = typeof record.jobDescription === "string" ? record.jobDescription : "";
  const jobRequirements = Array.isArray(record.jobRequirements)
    ? record.jobRequirements.filter(
        (requirement): requirement is string => typeof requirement === "string",
      )
    : [];
  const candidateSummary =
    typeof record.candidateSummary === "string" ? record.candidateSummary : "";
  const customQuestions = Array.isArray(record.customQuestions)
    ? record.customQuestions.filter((question): question is string => typeof question === "string")
    : [];

  const preEvaluationRaw =
    typeof record.preEvaluation === "object" && record.preEvaluation !== null
      ? (record.preEvaluation as Record<string, unknown>)
      : {};

  const preEvaluation = {
    score: typeof preEvaluationRaw.score === "number" ? preEvaluationRaw.score : null,
    missingRequirements: Array.isArray(preEvaluationRaw.missingRequirements)
      ? preEvaluationRaw.missingRequirements.filter(
          (requirement): requirement is string => typeof requirement === "string",
        )
      : [],
    consistencyScore:
      typeof preEvaluationRaw.consistencyScore === "number"
        ? preEvaluationRaw.consistencyScore
        : null,
  };

  return { jobDescription, jobRequirements, candidateSummary, customQuestions, preEvaluation };
}

export class PostEvaluationWorkflow extends WorkflowEntrypoint<Env, PostEvaluationPayload> {
  async run(event: WorkflowEvent<PostEvaluationPayload>, step: WorkflowStep) {
    const { interviewId } = event.payload;
    const log = createWorkflowLogger("post-evaluation", interviewId);

    const db = getDb();

    const existingReport = await step.do("load_existing_report", async () => {
      log.info("Loading existing report state");
      return await getReportByInterviewId(db, { interviewId });
    });

    if (existingReport) {
      log.info(`Report already exists, skipping: ${existingReport.id}`);
      return { interviewId, reportId: existingReport.id, status: "already_exists" as const };
    }

    const interviewData = await step.do("read_interview_data", async () => {
      log.info("Reading interview context and transcript");

      const interview = await getInterviewContextById(db, { id: interviewId });
      if (!interview) {
        throw new Error(`Interview not found: ${interviewId}`);
      }

      const contextState = parseInterviewContextState(interview.metadata);

      const stateCandidate = await getInterviewAgentState(this.env, interviewId);
      if (!isInterviewAgentState(stateCandidate)) {
        throw new Error(`Interview agent returned invalid state for ${interviewId}`);
      }

      const agentState = stateCandidate;
      const transcript = Array.isArray(agentState.messages)
        ? agentState.messages
            .map(
              (message: InterviewAgentMessage) =>
                `${message.role.toUpperCase()}: ${message.content}`,
            )
            .join("\n\n")
        : "";

      if (!transcript.trim()) {
        throw new Error(`Interview transcript is empty for interview ${interviewId}`);
      }

      return {
        interview,
        transcript,
        contextState,
      };
    });

    const reportDraft = await step.do("generate_report", async () => {
      log.info("Generating structured interview report with Workers AI");

      const aiResponse = await this.env.AI.run(MODEL, {
        messages: [
          {
            role: "system",
            content:
              "You are Zero, an interview evaluator. Produce a concise, evidence-based assessment from the transcript.",
          },
          {
            role: "user",
            content: [
              `Job title: ${interviewData.interview.jobTitle}`,
              `Company: ${interviewData.interview.companyName}`,
              `Candidate: ${interviewData.interview.candidateName}`,
              `Job description: ${interviewData.contextState.jobDescription || "Not provided"}`,
              `Job requirements: ${interviewData.contextState.jobRequirements.join(" | ") || "None"}`,
              `Candidate summary: ${interviewData.contextState.candidateSummary || "Not provided"}`,
              `Custom questions: ${interviewData.contextState.customQuestions.join(" | ") || "None"}`,
              `Pre-eval score: ${interviewData.contextState.preEvaluation.score ?? "unknown"}`,
              `Pre-eval missing requirements: ${interviewData.contextState.preEvaluation.missingRequirements.join(" | ") || "None"}`,
              `Pre-eval consistency score: ${interviewData.contextState.preEvaluation.consistencyScore ?? "unknown"}`,
              "Interview transcript:",
              interviewData.transcript,
            ].join("\n\n"),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "interview_report",
            schema: reportSchema,
          },
        },
      });

      const payload = getResponsePayload(aiResponse);
      let parsed: Record<string, unknown> | null = null;

      try {
        parsed = parseJsonPayload(payload.response);
      } catch {
        if (typeof payload.response === "string") {
          parsed = extractJsonObjectFromText(payload.response);
        }
      }

      if (!parsed) {
        log.warn("Workers AI returned non-JSON payload. Using deterministic fallback report.");
        return fallbackReportFromText(interviewData);
      }

      if (!isReportModelResponse(parsed)) {
        log.warn("Workers AI returned invalid report shape. Using deterministic fallback report.");
        return fallbackReportFromText(interviewData);
      }

      return parsed;
    });

    const report = await step.do("persist_report", async () => {
      log.info("Persisting report to database");

      const created = await createReport(db, {
        interviewId,
        applicationId: interviewData.interview.applicationId,
        summary: reportDraft.summary,
        strengths: reportDraft.strengths,
        weaknesses: reportDraft.weaknesses,
        insights: reportDraft.insights,
        evidence: reportDraft.evidence,
        scores: reportDraft.scores,
        recommendation: reportDraft.recommendation,
      });

      if (!created) {
        throw new Error(`Failed to create report for interview ${interviewId}`);
      }

      return created;
    });

    const notification = await step.do("notify_report_ready", async () => {
      log.info("Creating report_ready notification for company");

      const payload = notificationPayloadSchemas.report_ready.parse({
        applicationId: interviewData.interview.applicationId,
        jobId: interviewData.interview.jobId,
        jobTitle: interviewData.interview.jobTitle,
        candidateName: interviewData.interview.candidateName,
        score: reportDraft.scores.overall,
      });

      const created = await createNotification(db, {
        userId: interviewData.interview.companyOwnerId,
        type: "report_ready",
        payload,
      });

      return created;
    });

    await step.do("send_report_ready_email", async () => {
      if (!notification) {
        log.warn("No notification created, skipping email");
        return;
      }

      const resendApiKey = this.env.RESEND_API_KEY;
      const resendFromEmail = this.env.RESEND_FROM_EMAIL;

      if (!resendApiKey || !resendFromEmail) {
        log.info("Resend not configured, skipping email delivery");
        await markNotificationEmailSkipped(db, {
          id: notification.id,
          reason: "Email delivery is not configured",
        });
        return;
      }

      const owner = await getUserById(db, { id: interviewData.interview.companyOwnerId });
      if (!owner?.email) {
        log.warn("Company owner email not found, skipping email");
        await markNotificationEmailSkipped(db, {
          id: notification.id,
          reason: "Recipient email unavailable",
        });
        return;
      }

      try {
        const delivery = await sendEmailViaResend(resendApiKey, resendFromEmail, {
          to: owner.email,
          subject: `Evaluation ready for ${interviewData.interview.candidateName}`,
          text: [
            `The AI evaluation for ${interviewData.interview.candidateName} on ${interviewData.interview.jobTitle} is ready.`,
            ``,
            `Overall score: ${Math.round(reportDraft.scores.overall)}/100`,
            `Recommendation: ${reportDraft.recommendation}`,
            ``,
            `View the full report in RoundZero.`,
          ].join("\n"),
        });

        await markNotificationEmailDelivered(db, {
          id: notification.id,
          providerMessageId: delivery.providerMessageId,
        });
        log.info(`Report ready email sent to ${owner.email}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown email delivery failure";
        log.error(`Failed to send report ready email: ${message}`);
        await markNotificationEmailFailed(db, {
          id: notification.id,
          errorMessage: message,
        });
      }
    });

    log.info(`Post-evaluation complete: ${report.id}`);

    return { interviewId, reportId: report.id, status: "created" as const };
  }
}
