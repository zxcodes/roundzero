import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { getInterviewContextById } from "../queries/interviews/queries_sql";
import { createReport, getReportByInterviewId } from "../queries/reports/queries_sql";
import { getDb } from "../shared/db";
import { getInterviewAgentState } from "../shared/interview-agent-client";
import { createWorkflowLogger } from "../shared/logger";

type ReportGenerationPayload = {
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

export class ReportGenerationWorkflow extends WorkflowEntrypoint<Env, ReportGenerationPayload> {
  async run(event: WorkflowEvent<ReportGenerationPayload>, step: WorkflowStep) {
    const { interviewId } = event.payload;
    const log = createWorkflowLogger("report-generation", interviewId);

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
      const parsed = parseJsonPayload(payload.response);

      return parsed as unknown as ReportModelResponse;
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

    log.info(`Report generation complete: ${report.id}`);

    return { interviewId, reportId: report.id, status: "created" as const };
  }
}
