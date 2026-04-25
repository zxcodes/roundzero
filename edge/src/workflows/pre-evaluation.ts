import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { CLASSIFY_JOB_SYSTEM_PROMPT, JOB_TYPE_SCHEMA } from "../prompts/classify-job";
import { CREATIVE_EVAL_SYSTEM_PROMPT } from "../prompts/evaluate/creative";
import { CUSTOMER_FACING_EVAL_SYSTEM_PROMPT } from "../prompts/evaluate/customer-facing";
import { GENERAL_EVAL_SYSTEM_PROMPT } from "../prompts/evaluate/general";
import { LEADERSHIP_EVAL_SYSTEM_PROMPT } from "../prompts/evaluate/leadership";
import { OPERATIONS_EVAL_SYSTEM_PROMPT } from "../prompts/evaluate/operations";
import { TECHNICAL_EVAL_SYSTEM_PROMPT } from "../prompts/evaluate/technical";
import { SLOP_DETECTION_SYSTEM_PROMPT } from "../prompts/slop-detection";
import { getApplicationById, updateApplicationStatus } from "../queries/applications/queries_sql";
import { getUserById } from "../queries/auth/queries_sql";
import {
  countInterviewSlotsUsedByJob,
  createInterview,
  getInterviewByApplicationId,
} from "../queries/interviews/queries_sql";
import { getJobById } from "../queries/jobs/queries_sql";
import { createNotification } from "../queries/notifications/queries_sql";
import { createPreEvaluation } from "../queries/pre-evaluations/queries_sql";
import { getDb } from "../shared/db";
import { initializeInterviewAgent } from "../shared/interview-agent-client";
import { createWorkflowLogger } from "../shared/logger";
import { notificationPayloadSchemas } from "../shared/notifications-config";

// Model: the only 8B model empirically verified to support json_schema in this environment.
// The "fast" and "fp8" variants are on the docs list but throw "5025: This model doesn't support JSON Schema" at runtime.
// Stick with this until Cloudflare fixes the discrepancy.
const MODEL = "@cf/meta/llama-3.1-8b-instruct"; // ~8K ctx, verified working

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
      // continue with extraction fallbacks
    }

    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch?.[1]) {
      try {
        const parsed = JSON.parse(fenceMatch[1]);
        if (typeof parsed === "object" && parsed !== null) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // continue with extraction fallbacks
      }
    }

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(candidate);
        if (typeof parsed === "object" && parsed !== null) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // fall through to throw
      }
    }
  }
  throw new Error(`AI response payload is not a JSON object: ${typeof payload}`);
}

type PreEvaluationPayload = {
  applicationId: string;
};

type PreEvaluationResult = {
  score: number;
  missingRequirements: string[];
  confidence: "low" | "medium" | "high";
  nextStep: "interview_invited" | "ask_followups" | "hold";
};

const preEvaluationSchema = {
  type: "object",
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    missingRequirements: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    nextStep: { type: "string", enum: ["interview_invited", "ask_followups", "hold"] },
  },
  required: ["score", "missingRequirements", "confidence", "nextStep"],
} as const;

const slopDetectionSchema = {
  type: "object",
  properties: {
    consistencyScore: { type: "number", minimum: 0, maximum: 100 },
    redFlags: { type: "array", items: { type: "string" } },
    explanation: { type: "string" },
  },
  required: ["consistencyScore", "redFlags", "explanation"],
} as const;

async function extractResumeText(bytes: Uint8Array, contentType: string): Promise<string> {
  if (contentType === "application/pdf") {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }

  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer as ArrayBuffer });
    return result.value;
  }

  throw new Error(`Unsupported resume format: ${contentType}`);
}

function getPromptForRoleType(roleType: string): string {
  switch (roleType) {
    case "technical":
      return TECHNICAL_EVAL_SYSTEM_PROMPT;
    case "customer_facing":
      return CUSTOMER_FACING_EVAL_SYSTEM_PROMPT;
    case "creative":
      return CREATIVE_EVAL_SYSTEM_PROMPT;
    case "operations":
      return OPERATIONS_EVAL_SYSTEM_PROMPT;
    case "leadership":
      return LEADERSHIP_EVAL_SYSTEM_PROMPT;
    default:
      return GENERAL_EVAL_SYSTEM_PROMPT;
  }
}

function buildPreEvaluationPrompt(
  job: {
    title: string;
    description: string;
    requirements: string[];
  },
  resumeText: string,
  candidateMeta: Record<string, unknown>,
): string {
  const requirementsList = Array.isArray(job.requirements)
    ? job.requirements.map((r) => `- ${r}`).join("\n")
    : "None listed.";

  const skills = Array.isArray(candidateMeta.skills)
    ? (candidateMeta.skills as string[]).join(", ")
    : "Not provided";

  const workHistory = Array.isArray(candidateMeta.workHistory)
    ? (
        candidateMeta.workHistory as {
          company: string;
          title: string;
          description: string | null;
        }[]
      )
        .map((w) => `- ${w.title} at ${w.company}${w.description ? `: ${w.description}` : ""}`)
        .join("\n")
    : "Not provided";

  return `## Job

Title: ${job.title}
Description: ${job.description}

Requirements:
${requirementsList}

## Candidate Profile

Skills: ${skills}

Work History:
${workHistory}

## Resume

${resumeText.slice(0, 12000)}`;
}

function buildSlopDetectionPrompt(
  candidateMeta: Record<string, unknown>,
  resumeText: string,
): string {
  const skills = Array.isArray(candidateMeta.skills)
    ? (candidateMeta.skills as string[]).join(", ")
    : "Not provided";

  const headline =
    typeof candidateMeta.headline === "string" ? candidateMeta.headline : "Not provided";
  const bio = typeof candidateMeta.bio === "string" ? candidateMeta.bio : "Not provided";

  return `## Profile Metadata

Headline: ${headline}
Bio: ${bio}
Skills: ${skills}

## Resume Text

${resumeText.slice(0, 8000)}`;
}

export class PreEvaluationWorkflow extends WorkflowEntrypoint<Env, PreEvaluationPayload> {
  async run(event: WorkflowEvent<PreEvaluationPayload>, step: WorkflowStep) {
    const { applicationId } = event.payload;
    const log = createWorkflowLogger("pre-eval", applicationId);
    log.info("Starting pre-evaluation workflow");

    // Step 1: Read application + job data
    const applicationData = await step.do("read_application_data", async () => {
      log.step("read", "Loading application from DB");
      const db = getDb();
      const application = await getApplicationById(db, { id: applicationId });
      if (!application) {
        throw new Error(`Application not found: ${applicationId}`);
      }
      if (!application.resumeKey) {
        throw new Error(`Application has no resume: ${applicationId}`);
      }

      const job = await getJobById(db, { id: application.jobId });
      if (!job) {
        throw new Error(`Job not found: ${application.jobId}`);
      }

      log.result("read", {
        jobTitle: job.title,
        jobId: job.id,
        resumeKey: application.resumeKey,
        candidateId: application.candidateId,
      });
      return { application, job };
    });

    // Step 2: Fetch and extract resume
    const resumeText = await step.do("fetch_and_extract_resume", async () => {
      log.step("resume", "Fetching from R2 and extracting text");
      const resumeKey = applicationData.application.resumeKey;
      if (!resumeKey) {
        throw new Error(`Application has no resume: ${applicationId}`);
      }

      const object = await this.env.RESUMES.get(resumeKey);
      if (!object) {
        throw new Error(`Resume not found in R2: ${resumeKey}`);
      }

      const arrayBuffer = await object.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const contentType = resumeKey.endsWith(".pdf")
        ? "application/pdf"
        : resumeKey.endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf";

      log.info(`Resume format: ${contentType}, size: ${bytes.length} bytes`);
      const text = await extractResumeText(bytes, contentType);
      log.result("resume", { chars: text.length, words: text.split(/\s+/).length });
      return text;
    });

    // Step 3: Classify job type
    const jobClassification = await step.do("classify_job_type", async () => {
      log.step("classify", "Classifying job type for role-specific evaluation");
      const prompt = `Job Title: ${applicationData.job.title}\n\nJob Description: ${applicationData.job.description}`;

      const startTime = Date.now();
      const response = await this.env.AI.run(MODEL, {
        messages: [
          { role: "system", content: CLASSIFY_JOB_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: JOB_TYPE_SCHEMA,
        },
      });
      const latency = Date.now() - startTime;

      const payload = getResponsePayload(response).response;
      const raw = parseJsonPayload(payload);
      const result = {
        roleType: typeof raw.roleType === "string" ? raw.roleType : "general",
        reasoning: typeof raw.reasoning === "string" ? raw.reasoning : "",
      };

      log.ai(prompt.length, 0, latency);
      log.result("classify", {
        roleType: result.roleType,
        reasoning: result.reasoning.slice(0, 80),
      });
      return result;
    });

    // Step 4: Slop detection
    const slopCheck = await step.do("detect_slop", async () => {
      log.step("slop", "Running consistency check: profile vs resume");
      const prompt = buildSlopDetectionPrompt(
        applicationData.application.metadata ?? {},
        resumeText,
      );

      const startTime = Date.now();
      const response = await this.env.AI.run(MODEL, {
        messages: [
          { role: "system", content: SLOP_DETECTION_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: slopDetectionSchema,
        },
      });
      const latency = Date.now() - startTime;

      const payload = getResponsePayload(response).response;
      let raw: Record<string, unknown>;
      try {
        raw = parseJsonPayload(payload);
      } catch {
        const payloadPreview =
          typeof payload === "string"
            ? payload.slice(0, 300)
            : JSON.stringify(payload).slice(0, 300);
        log.warn(`Slop detection returned non-JSON payload: ${payloadPreview}`);
        const fallback = {
          consistencyScore: 50,
          redFlags: [],
          explanation: "Could not parse AI response",
        };
        log.ai(prompt.length, 0, latency);
        log.result("slop", {
          consistencyScore: fallback.consistencyScore,
          redFlags: fallback.redFlags.length,
          explanation: fallback.explanation,
        });
        return fallback;
      }

      const result = {
        consistencyScore:
          typeof raw.consistencyScore === "number"
            ? Math.max(0, Math.min(100, Math.round(raw.consistencyScore)))
            : 50,
        redFlags: Array.isArray(raw.redFlags)
          ? raw.redFlags.filter((r: unknown): r is string => typeof r === "string")
          : [],
        explanation: typeof raw.explanation === "string" ? raw.explanation : "",
      };

      log.ai(prompt.length, 0, latency);
      log.result("slop", {
        consistencyScore: result.consistencyScore,
        redFlags: result.redFlags.length,
        explanation: result.explanation.slice(0, 100),
      });
      return result;
    });

    // Step 5: Run AI pre-evaluation
    const aiResult = await step.do(
      "run_ai_pre_evaluation",
      async (): Promise<{ result: PreEvaluationResult; rawResponse: string }> => {
        log.step("ai", "Calling Workers AI for pre-evaluation");
        const systemPrompt = getPromptForRoleType(jobClassification.roleType);
        const userPrompt = buildPreEvaluationPrompt(
          {
            title: applicationData.job.title,
            description: applicationData.job.description,
            requirements: applicationData.job.requirements,
          },
          resumeText,
          applicationData.application.metadata ?? {},
        );

        const startTime = Date.now();
        const response = await this.env.AI.run(MODEL, {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: preEvaluationSchema,
          },
        });
        const latency = Date.now() - startTime;

        const payload = getResponsePayload(response).response;
        const raw = parseJsonPayload(payload);
        const score =
          typeof raw.score === "number" ? Math.max(0, Math.min(100, Math.round(raw.score))) : 0;
        const missingRequirements = Array.isArray(raw.missingRequirements)
          ? raw.missingRequirements.filter((r: unknown): r is string => typeof r === "string")
          : [];
        const confidence = ["low", "medium", "high"].includes(String(raw.confidence))
          ? (String(raw.confidence) as "low" | "medium" | "high")
          : "low";
        const nextStep = ["interview_invited", "ask_followups", "hold"].includes(
          String(raw.nextStep),
        )
          ? (String(raw.nextStep) as "interview_invited" | "ask_followups" | "hold")
          : "hold";

        const result: PreEvaluationResult = { score, missingRequirements, confidence, nextStep };

        log.ai(userPrompt.length, 0, latency);
        log.result("ai", {
          score: result.score,
          confidence: result.confidence,
          nextStep: result.nextStep,
          missingCount: result.missingRequirements.length,
        });

        return { result, rawResponse: JSON.stringify(response) };
      },
    );

    // Step 6: Write result to DB
    await step.do("write_pre_evaluation", async () => {
      log.step("write", "Saving pre-evaluation to DB");
      const db = getDb();
      await createPreEvaluation(db, {
        applicationId,
        score: aiResult.result.score,
        missingRequirements: aiResult.result.missingRequirements,
        confidence: aiResult.result.confidence,
        nextStep: aiResult.result.nextStep,
        consistencyScore: slopCheck.consistencyScore,
        rawResponse: aiResult.rawResponse,
      });
      await updateApplicationStatus(db, {
        id: applicationId,
        status: "pre_screening",
      });
      log.result("write", {
        status: "pre_screening",
        consistencyScore: slopCheck.consistencyScore,
      });
    });

    // Step 7: Decision layer
    const decision = await step.do("decide_next_step", async () => {
      log.step("decide", "Checking quota and making decision");
      if (aiResult.result.nextStep === "hold") {
        log.result("decide", { action: "hold", reason: "low_fit" });
        return { action: "hold" as const };
      }

      const db = getDb();
      const job = applicationData.job;
      const existingInterview = await getInterviewByApplicationId(db, {
        applicationId,
      });
      if (existingInterview) {
        log.result("decide", {
          action: "already_invited",
          interviewId: existingInterview.id,
        });
        return { action: "interview_created" as const, interviewType: existingInterview.type };
      }

      const slotsUsed = await countInterviewSlotsUsedByJob(db, { jobId: job.id });
      const usedCount = slotsUsed?.count ?? 0;

      const finalReportTarget =
        typeof job.finalReportTarget === "number" ? job.finalReportTarget : 5;
      log.info(`Quota: ${usedCount}/${finalReportTarget} slots used`);

      if (usedCount >= finalReportTarget) {
        const candidate = await getUserById(db, { id: applicationData.application.candidateId });
        if (candidate) {
          const payload = notificationPayloadSchemas.position_filled.parse({
            applicationId,
            jobId: job.id,
            jobTitle: job.title,
          });
          await createNotification(db, {
            userId: candidate.id,
            type: "position_filled",
            payload,
          });
        }
        log.result("decide", {
          action: "quota_exhausted",
          used: usedCount,
          limit: finalReportTarget,
        });
        return { action: "quota_exhausted" as const };
      }

      const interviewType =
        aiResult.result.nextStep === "interview_invited" ? "full" : "quick_eval";
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const interview = await createInterview(db, {
        applicationId,
        agentId: null,
        type: interviewType,
        metadata: { preEvaluationScore: aiResult.result.score, expiresAt },
        status: "pending",
        startedAt: null,
        completedAt: null,
      });
      if (!interview) {
        throw new Error(`Failed to create interview for application: ${applicationId}`);
      }

      await initializeInterviewAgent(this.env, {
        interviewId: interview.id,
        applicationId,
        interviewType: interviewType,
        jobTitle: job.title,
        companyName: job.companyName,
        jobDescription: job.description,
        jobRequirements: Array.isArray(job.requirements)
          ? (job.requirements as unknown[])
              .filter((requirement): requirement is string => typeof requirement === "string")
              .map((requirement) => requirement.trim())
              .filter((requirement) => requirement.length > 0)
          : [],
        candidateSummary: resumeText.slice(0, 2000),
        customQuestions: Array.isArray(job.interviewQuestions)
          ? (job.interviewQuestions as unknown[])
              .filter((question): question is string => typeof question === "string")
              .map((question) => question.trim())
              .filter((question) => question.length > 0)
          : [],
        preEvaluation: {
          score: aiResult.result.score,
          missingRequirements: aiResult.result.missingRequirements,
          consistencyScore: slopCheck.consistencyScore,
        },
      });

      await updateApplicationStatus(db, {
        id: applicationId,
        status: "interview_invited",
      });

      const candidate = await getUserById(db, { id: applicationData.application.candidateId });
      if (candidate) {
        const payload = notificationPayloadSchemas.interview_invited.parse({
          applicationId,
          interviewId: interview.id,
          jobId: job.id,
          jobTitle: job.title,
          interviewType,
          expiresAt,
        });
        await createNotification(db, {
          userId: candidate.id,
          type: "interview_invited",
          payload,
        });
      }

      log.result("decide", {
        action: "interview_created",
        interviewType,
        newStatus: "interview_invited",
      });
      return { action: "interview_created" as const, interviewType };
    });

    log.info(
      `Workflow complete: score=${aiResult.result.score}, nextStep=${aiResult.result.nextStep}, decision=${decision.action}`,
    );
    return { applicationId, result: aiResult.result };
  }
}
