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
import { createWorkflowLogger } from "../shared/logger";
import { notificationPayloadSchemas } from "../shared/notifications-config";

function getResponsePayload(response: unknown): { response: unknown } {
  if (typeof response !== "object" || response === null) {
    throw new Error("AI response is not an object");
  }
  if (!("response" in response)) {
    throw new Error("AI response missing 'response' field");
  }
  return response as { response: unknown };
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

const SYSTEM_PROMPT = `You are Zero, a pre-screening evaluator for a hiring platform. Your job is to decide whether a candidate deserves a deeper AI interview based on their resume and profile.

You are NOT making a hiring decision. You are answering one question: "Is this candidate worth interviewing for this role?"

## Scoring Rubric (0-100)

Evaluate across these dimensions and average them:

1. **Skills Match (0-30)**: How many required skills does the resume explicitly demonstrate? Count only skills clearly shown through experience or projects, not just listed.
2. **Experience Relevance (0-30)**: Does the candidate's work history align with the role's domain, seniority, and responsibilities? Years alone don't count -- relevance matters.
3. **Seniority Fit (0-20)**: Does the candidate's career level match what the job expects? A junior applying for a principal role scores low here, even with matching skills.
4. **Ownership & Impact (0-10)**: Does the resume show ownership signals like "I led", "I designed", "I owned" with concrete outcomes? Generic team contributions score lower.
5. **Tech Debt & Tradeoffs (0-10)**: Does the candidate demonstrate awareness of technical tradeoffs, migrations, refactoring, or system evolution? Look for phrases about rewriting, deprecating, scaling challenges, or architectural decisions.

## Confidence

- **high**: Resume clearly addresses the role's core requirements -- you can make a confident judgment.
- **medium**: Resume is ambiguous -- some signals match but key areas are unclear or missing context.
- **low**: Resume is too vague, too short, too generic (AI-generated slop), or too unrelated to assess meaningfully.

## Decision Rules

- score >= 70 AND confidence is high -> nextStep: "interview_invited"
- score 50-69 OR confidence is medium -> nextStep: "ask_followups"
- score < 50 OR confidence is low -> nextStep: "hold"

## Rules

- Only credit skills and experience the resume explicitly demonstrates. Do not infer or assume.
- If the resume is very short, generic, or full of buzzwords without specifics, set confidence to "low" and nextStep to "hold".
- missingRequirements must list specific job requirements the resume does not clearly cover. Be concrete (e.g., "No AWS experience mentioned") not vague (e.g., "Lacks cloud skills").
- Penalize resumes that read like AI-generated slop: generic phrasing, no specific numbers or outcomes, buzzword-heavy without substance.`;

const SLOP_DETECTION_PROMPT = `You are a resume authenticity checker. Compare the candidate's profile metadata with their resume text to detect inconsistencies, exaggerations, or signs of AI-generated/fabricated content.

Look for:
1. Skills in profile but never mentioned in resume
2. Job titles in profile that don't match resume
3. Resume uses generic AI phrasing ("passionate about leveraging cutting-edge solutions")
4. Claims in resume that profile contradicts
5. Resume is suspiciously polished while profile is sparse
6. Specific metrics in resume that seem fabricated (round numbers, unrealistic scale)`;

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

    // Step 3: Slop detection (profile vs resume consistency)
    const slopCheck = await step.do("detect_slop", async () => {
      log.step("slop", "Running consistency check: profile vs resume");
      const prompt = buildSlopDetectionPrompt(
        applicationData.application.metadata ?? {},
        resumeText,
      );

      const startTime = Date.now();
      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: SLOP_DETECTION_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: slopDetectionSchema,
        },
      });
      const latency = Date.now() - startTime;

      const payload = getResponsePayload(response).response;
      if (typeof payload !== "object" || payload === null) {
        throw new Error("Slop detection AI response payload is not an object");
      }

      const raw = payload as Record<string, unknown>;
      const result = {
        consistencyScore:
          typeof raw.consistencyScore === "number"
            ? Math.max(0, Math.min(100, Math.round(raw.consistencyScore)))
            : 0,
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

    // Step 4: Run AI pre-evaluation
    const aiResult = await step.do(
      "run_ai_pre_evaluation",
      async (): Promise<{ result: PreEvaluationResult; rawResponse: string }> => {
        log.step("ai", "Calling Workers AI for pre-evaluation");
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
        const latency = Date.now() - startTime;

        const payload = getResponsePayload(response).response;
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Pre-evaluation AI response payload is not an object");
        }

        const raw = payload as Record<string, unknown>;
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

    // Step 5: Write result to DB
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

    // Step 6: Decision layer
    const decision = await step.do("decide_next_step", async () => {
      log.step("decide", "Checking quota and making decision");
      if (aiResult.result.nextStep === "hold") {
        log.result("decide", { action: "hold", reason: "low_fit" });
        return { action: "hold" as const };
      }

      const db = getDb();
      const job = applicationData.job;
      const slotsUsed = await countInterviewSlotsUsedByJob(db, { jobId: job.id });
      const usedCount = slotsUsed?.count ?? 0;

      log.info(`Quota: ${usedCount}/${job.reportLimit} slots used`);

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
        log.result("decide", {
          action: "quota_exhausted",
          used: usedCount,
          limit: job.reportLimit,
        });
        return { action: "quota_exhausted" as const };
      }

      const interviewType =
        aiResult.result.nextStep === "interview_invited" ? "full" : "quick_eval";
      await createInterview(db, {
        applicationId,
        agentId: null,
        type: interviewType,
        metadata: { preEvaluationScore: aiResult.result.score },
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
