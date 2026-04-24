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

const SYSTEM_PROMPT = `You are Zero, a pre-screening evaluator for a hiring platform. Your job is to decide whether a candidate deserves a deeper AI interview based on their resume and profile.

You are NOT making a hiring decision. You are answering one question: "Is this candidate worth interviewing for this role?"

## Scoring Rubric (0–100)

Evaluate across these dimensions and average them:

1. **Skills Match (0–30)**: How many required skills does the resume explicitly demonstrate? Count only skills clearly shown through experience or projects, not just listed.
2. **Experience Relevance (0–30)**: Does the candidate's work history align with the role's domain, seniority, and responsibilities? Years alone don't count — relevance matters.
3. **Seniority Fit (0–20)**: Does the candidate's career level match what the job expects? A junior applying for a principal role scores low here, even with matching skills.
4. **Overall Alignment (0–20)**: Does the candidate's background tell a coherent story for this role? Consider career trajectory, industry relevance, and any custom focus areas the company specified.

## Confidence

- **high**: Resume clearly addresses the role's core requirements — you can make a confident judgment.
- **medium**: Resume is ambiguous — some signals match but key areas are unclear or missing context.
- **low**: Resume is too vague, too short, or too unrelated to assess meaningfully.

## Decision Rules

- score >= 70 AND confidence is high → nextStep: "interview_invited"
- score 50–69 OR confidence is medium → nextStep: "ask_followups"
- score < 50 OR confidence is low → nextStep: "hold"

## Rules

- Only credit skills and experience the resume explicitly demonstrates. Do not infer or assume.
- If the resume is very short or generic, set confidence to "low" and nextStep to "hold".
- missingRequirements must list specific job requirements the resume does not clearly cover. Be concrete (e.g., "No AWS experience mentioned") not vague (e.g., "Lacks cloud skills").`;

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

  let prompt = `## Job

Title: ${job.title}
Description: ${job.description}

Requirements:
${requirementsList}`;

  prompt += `\n\n## Candidate

Skills: ${skills}

Work History:
${workHistory}

Resume:
${resumeText.slice(0, 12000)}`;

  return prompt;
}

export class PreEvaluationWorkflow extends WorkflowEntrypoint<Env, PreEvaluationPayload> {
  async run(event: WorkflowEvent<PreEvaluationPayload>, step: WorkflowStep) {
    const { applicationId } = event.payload;
    console.log(`[pre-eval] Starting workflow for application ${applicationId}`);

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

      console.log(
        `[pre-eval] Loaded application for job "${job.title}" (${job.id}), resume: ${application.resumeKey}`,
      );
      return { application, job };
    });

    const resumeText = await step.do("fetch_and_extract_resume", async () => {
      const resumeKey = applicationData.application.resumeKey;
      if (!resumeKey) {
        throw new Error(`Application has no resume: ${applicationId}`);
      }
      console.log(`[pre-eval] Fetching resume from R2: ${resumeKey}`);
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
      console.log(`[pre-eval] Extracting text from resume (${contentType}, ${bytes.length} bytes)`);
      const text = await extractResumeText(bytes, contentType);
      console.log(`[pre-eval] Extracted ${text.length} chars from resume`);
      return text;
    });

    const aiResult = await step.do("run_ai_pre_evaluation", async () => {
      const userPrompt = buildPreEvaluationPrompt(
        {
          title: applicationData.job.title,
          description: applicationData.job.description,
          requirements: applicationData.job.requirements,
        },
        resumeText,
        applicationData.application.metadata ?? {},
      );

      console.log(
        `[pre-eval] Calling Workers AI (llama-3.1-8b-instruct), prompt length: ${userPrompt.length} chars`,
      );
      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: preEvaluationSchema,
        },
      });

      console.log(`[pre-eval] Raw AI response:`, JSON.stringify(response));

      const parsed = (response as { response: unknown }).response as {
        score: number;
        missingRequirements: string[];
        confidence: string;
        nextStep: string;
      };
      const result = parsed;

      const normalized = {
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

      console.log(
        `[pre-eval] AI result: score=${normalized.score}, confidence=${normalized.confidence}, nextStep=${normalized.nextStep}, missing=${normalized.missingRequirements.length} items`,
      );
      return normalized;
    });

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
      console.log(`[pre-eval] Wrote pre-evaluation to DB, status -> pre_screening`);
    });

    await step.do("decide_next_step", async () => {
      if (aiResult.nextStep === "hold") {
        console.log(`[pre-eval] Decision: HOLD (low fit, no interview)`);
        return { action: "hold" as const };
      }

      const db = getDb();
      const job = applicationData.job;
      const slotsUsed = await countInterviewSlotsUsedByJob(db, { jobId: job.id });
      const usedCount = slotsUsed?.count ?? 0;
      console.log(`[pre-eval] Quota check: ${usedCount}/${job.reportLimit} slots used`);

      if (usedCount >= job.reportLimit) {
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
        console.log(`[pre-eval] Decision: QUOTA EXHAUSTED (${usedCount}/${job.reportLimit})`);
        return { action: "quota_exhausted" as const };
      }

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

      console.log(
        `[pre-eval] Decision: INTERVIEW CREATED (type=${interviewType}), status -> interview_invited`,
      );
      return { action: "interview_created" as const, interviewType };
    });

    console.log(
      `[pre-eval] Workflow complete for ${applicationId}: score=${aiResult.score}, nextStep=${aiResult.nextStep}`,
    );
    return { applicationId, result: aiResult };
  }
}
