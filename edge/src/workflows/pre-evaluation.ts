import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { getApplicationById, updateApplicationStatus } from "../queries/applications/queries_sql";
import { getUserById } from "../queries/auth/queries_sql";
import { countInterviewSlotsUsedByJob, createInterview } from "../queries/interviews/queries_sql";
import { getJobById } from "../queries/jobs/queries_sql";
import { createNotification } from "../queries/notifications/queries_sql";
import { createPreEvaluation } from "../queries/pre-evaluations/queries_sql";
import { getDb } from "../shared/db";
import { notificationPayloadSchemas } from "../shared/notifications-config";

type PreEvaluationPayload = {
  applicationId: string;
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
    : "No specific requirements listed.";

  const skills = Array.isArray(candidateMeta.skills)
    ? candidateMeta.skills.join(", ")
    : "Not provided";

  return `You are an expert technical recruiter. Evaluate how well the candidate fits the job based on their resume and profile.

Rules:
- score 70+ and high confidence -> "interview_invited"
- score 50-69 or medium confidence -> "ask_followups"
- score below 50 or low confidence -> "hold"
- missingRequirements: list specific job requirements the resume does not clearly demonstrate

Job Title: ${job.title}
Job Description: ${job.description}
Requirements:
${requirementsList}

Candidate Skills: ${skills}
Candidate Resume:
${resumeText.slice(0, 12000)}
`;
}

export class PreEvaluationWorkflow extends WorkflowEntrypoint<Env, PreEvaluationPayload> {
  async run(event: WorkflowEvent<PreEvaluationPayload>, step: WorkflowStep) {
    const { applicationId } = event.payload;

    // Step 1: Read application + job data from Postgres
    const applicationData = await step.do("read_application_data", async () => {
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

      return { application, job };
    });

    // Step 2: Fetch resume from R2 and extract text
    // Combined into one step because Uint8Array is not JSON-serializable
    // across workflow step boundaries (step results are persisted as JSON).
    const resumeText = await step.do("fetch_and_extract_resume", async () => {
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
      return extractResumeText(bytes, contentType);
    });

    // Step 4: Run AI pre-evaluation
    const aiResult = await step.do("run_ai_pre_evaluation", async () => {
      const prompt = buildPreEvaluationPrompt(
        {
          title: applicationData.job.title,
          description: applicationData.job.description,
          requirements: applicationData.job.requirements,
        },
        resumeText,
        applicationData.application.metadata ?? {},
      );

      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
        messages: [{ role: "user", content: prompt }],
        response_format: {
          type: "json_schema",
          json_schema: preEvaluationSchema,
        },
      });

      // Workers AI returns { response: <parsed object> } with json_schema format
      const parsed = (response as { response: unknown }).response as {
        score: number;
        missingRequirements: string[];
        confidence: string;
        nextStep: string;
      };
      const result = parsed;

      return {
        score: Math.max(0, Math.min(100, Math.round(result.score))),
        missingRequirements: Array.isArray(result.missingRequirements)
          ? result.missingRequirements.filter((r: unknown) => typeof r === "string")
          : [],
        confidence: ["low", "medium", "high"].includes(result.confidence)
          ? (result.confidence as "low" | "medium" | "high")
          : "low",
        nextStep: ["interview_invited", "ask_followups", "hold"].includes(result.nextStep)
          ? (result.nextStep as "interview_invited" | "ask_followups" | "hold")
          : "hold",
      };
    });

    // Step 5: Write result to pre_evaluations table and update status
    await step.do("write_pre_evaluation", async () => {
      const db = getDb();
      await createPreEvaluation(db, {
        applicationId,
        score: aiResult.score,
        missingRequirements: aiResult.missingRequirements,
        confidence: aiResult.confidence,
        nextStep: aiResult.nextStep,
      });
      await updateApplicationStatus(db, {
        id: applicationId,
        status: "pre_screening",
      });
    });

    // Step 6: Decision layer - check quota and create interview or hold
    await step.do("decide_next_step", async () => {
      if (aiResult.nextStep === "hold") {
        return { action: "hold" as const };
      }

      const db = getDb();
      const job = applicationData.job;
      const slotsUsed = await countInterviewSlotsUsedByJob(db, { jobId: job.id });
      const usedCount = slotsUsed?.count ?? 0;

      if (usedCount >= job.reportLimit) {
        // Quota exhausted: send position_filled notification
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
        return { action: "quota_exhausted" as const };
      }

      // Create interview
      const interviewType = aiResult.nextStep === "interview_invited" ? "full" : "quick_eval";
      await createInterview(db, {
        applicationId,
        agentId: null,
        type: interviewType,
        metadata: { preEvaluationScore: aiResult.score },
        status: "pending",
        startedAt: null,
        completedAt: null,
      });

      await updateApplicationStatus(db, {
        id: applicationId,
        status: "interview_invited",
      });

      // Send interview_invited notification
      const candidate = await getUserById(db, { id: applicationData.application.candidateId });
      if (candidate) {
        const payload = notificationPayloadSchemas.interview_invited.parse({
          applicationId,
          jobId: job.id,
          jobTitle: job.title,
          interviewType,
        });
        await createNotification(db, {
          userId: candidate.id,
          type: "interview_invited",
          payload,
        });
      }

      return { action: "interview_created" as const, interviewType };
    });

    return { applicationId, result: aiResult };
  }
}
