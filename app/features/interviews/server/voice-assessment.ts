import { generateText, Output } from "ai";
import { env } from "cloudflare:workers";
import { z } from "zod";

import {
  completeCommunicationAssessment,
  completeInterviewAfterVoice,
  getCommunicationAssessmentByInterviewId,
  getInterviewContextById,
} from "@/features/interviews/queries/queries_sql";
import type { loadVoiceAssessmentContext } from "@/features/interviews/shared/voice-runtime";
import { getReportByApplicationId } from "@/features/reports/queries/queries_sql";
import {
  COMMUNICATION_ASSESSMENT_PROMPT,
  type CommunicationAssessmentAnalysis,
  communicationAssessmentSchema,
  parseCommunicationAssessment,
} from "@/prompts/communication-assessment";
import { ExpectedError } from "@/shared/expected-error";
import { createChatModel } from "@/shared/openrouter";
import { disposeRpcResource } from "@/shared/workflow-rpc";
import { refineCommunicationAnalysis } from "@/workflows/post-evaluation/refine";

const elevenLabsTranscriptEventSchema = z.object({
  type: z.literal("post_call_transcription"),
  data: z.object({
    conversationId: z.string().min(1).optional(),
    conversation_id: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    user_id: z.string().min(1).optional(),
    transcript: z
      .array(
        z.object({
          role: z.string().min(1),
          message: z.string().default(""),
        }),
      )
      .catch([]),
  }),
});

export const elevenLabsWebhookEventSchema = z.discriminatedUnion("type", [
  elevenLabsTranscriptEventSchema,
  z.object({ type: z.literal("post_call_audio") }).loose(),
  z.object({ type: z.literal("call_initiation_failure") }).loose(),
]);

export type VoiceTranscriptMessage = {
  role: "assistant" | "candidate";
  content: string;
};

async function verifyElevenLabsSignature(
  rawBody: string,
  sigHeader: string,
  secret: string,
): Promise<unknown> {
  const parts = sigHeader.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const signature = parts.find((p) => p.startsWith("v0="));

  if (!timestamp || !signature) {
    throw new ExpectedError("invalid_input", "No signature hash found with expected scheme v0");
  }

  const reqTimestamp = Number(timestamp) * 1000;
  if (reqTimestamp < Date.now() - 30 * 60 * 1000) {
    throw new ExpectedError("invalid_input", "Timestamp outside the tolerance zone");
  }

  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(`${timestamp}.${rawBody}`));

  const digest =
    "v0=" +
    Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  if (signature !== digest) {
    throw new ExpectedError("invalid_input", "Signature hash does not match");
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new ExpectedError("invalid_input", "Invalid webhook payload");
  }
}

function parseElevenLabsWebhookPayload(rawBody: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new ExpectedError("invalid_input", "Invalid webhook payload");
  }

  const result = elevenLabsWebhookEventSchema.safeParse(parsed);
  if (!result.success) {
    throw new ExpectedError("invalid_input", "Invalid webhook payload");
  }
  return result.data;
}

export async function parseElevenLabsWebhookEvent(request: Request) {
  const rawBody = await request.text();
  const secret = env.ELEVENLABS_WEBHOOK_SECRET;

  if (!secret) {
    return parseElevenLabsWebhookPayload(rawBody);
  }

  const signature = request.headers.get("elevenlabs-signature");
  if (!signature) {
    throw new ExpectedError("invalid_input", "Missing elevenlabs-signature header");
  }

  const verified = await verifyElevenLabsSignature(rawBody, signature, secret);
  const result = elevenLabsWebhookEventSchema.safeParse(verified);
  if (!result.success) {
    throw new ExpectedError("invalid_input", "Invalid webhook payload");
  }
  return result.data;
}

export function getWebhookConversationId(
  event: z.infer<typeof elevenLabsTranscriptEventSchema>,
): string | null {
  return event.data.conversationId ?? event.data.conversation_id ?? null;
}

export function getWebhookSessionId(
  event: z.infer<typeof elevenLabsTranscriptEventSchema>,
): string | null {
  return event.data.userId ?? event.data.user_id ?? null;
}

const EXPRESSIVE_TAG_RE = /\[[\w\s-]+?\]\s*/g;

function stripExpressiveTags(text: string): string {
  return text.replace(EXPRESSIVE_TAG_RE, "").trim();
}

export function normalizeVoiceTranscriptMessages(
  transcript: z.infer<typeof elevenLabsTranscriptEventSchema>["data"]["transcript"],
): Array<VoiceTranscriptMessage> {
  return transcript.reduce<Array<VoiceTranscriptMessage>>((messages, message) => {
    const content = stripExpressiveTags(message.message);
    if (!content) {
      return messages;
    }

    if (message.role === "agent" || message.role === "assistant") {
      messages.push({ role: "assistant", content });
      return messages;
    }

    if (message.role === "user" || message.role === "candidate") {
      messages.push({ role: "candidate", content });
    }

    return messages;
  }, []);
}

/**
 * Persist the voice transcript and mark the assessment completed.
 *
 * This intentionally does NOT run the communication-scoring LLM call. That
 * analysis is slow and unreliable on free/fallback models (it routinely fails
 * with `NoOutputGeneratedError` or times out), and running it here blocked the
 * candidate's request for up to ~2 minutes — leaving them stranded on
 * "Finalising results…" — and, on failure, marked the row `completed` with a
 * null analysis, permanently discarding the candidate's voice scoring.
 *
 * Instead we save the transcript instantly and let the durable post-evaluation
 * workflow compute the analysis from the stored transcript (with retries) via
 * `loadVoiceAssessment`. Report generation requires a completed voice assessment.
 */
export async function finalizeVoiceAssessmentFromTranscript(input: {
  db: Parameters<typeof getCommunicationAssessmentByInterviewId>[0];
  interviewId: string;
  messages: Array<VoiceTranscriptMessage>;
  audioKey?: string | null;
}) {
  const existingAssessment = await getCommunicationAssessmentByInterviewId(input.db, {
    interviewId: input.interviewId,
  });
  const interview = await getInterviewContextById(input.db, { id: input.interviewId });

  if (existingAssessment?.status === "completed") {
    if (interview) {
      await startPostEvaluation(input.db, {
        interviewId: input.interviewId,
        applicationId: interview.applicationId,
      });
    }
    return true;
  }

  if (!existingAssessment || existingAssessment.status === "skipped") {
    return false;
  }

  if (interview?.status !== "awaiting_voice") {
    return false;
  }

  const transcriptForDb = input.messages.map((message) => ({
    role: message.role,
    content: stripExpressiveTags(message.content),
  }));

  // Never terminally complete an empty transcript. An empty webhook payload
  // would otherwise lock the row and block the browser fallback (or a later,
  // real webhook) from ever saving the actual conversation.
  if (transcriptForDb.length === 0) {
    return false;
  }

  const transition = await input.db.begin(async (tx) => {
    const transaction = tx as unknown as Parameters<
      typeof getCommunicationAssessmentByInterviewId
    >[0];

    // Canonical individual-transition order. Holding both locks makes voice
    // completion serialize with cancellation and withdrawal.
    const applications = await tx`
      SELECT status FROM applications
      WHERE id = ${interview.applicationId}
      FOR UPDATE
    `;
    const interviews = await tx`
      SELECT status FROM interviews
      WHERE id = ${input.interviewId}
      FOR UPDATE
    `;
    const applicationStatus = applications[0]?.status;
    const interviewStatus = interviews[0]?.status;

    if (
      applicationStatus === "withdrawn" ||
      applicationStatus === "rejected" ||
      interviewStatus === "cancelled"
    ) {
      return { kind: "terminal_winner" } as const;
    }
    if (interviewStatus !== "awaiting_voice") {
      return { kind: "not_awaiting_voice" } as const;
    }

    const completedAssessment = await completeCommunicationAssessment(transaction, {
      interviewId: input.interviewId,
      transcript: transcriptForDb,
      analysis: null,
      audioKey: input.audioKey ?? null,
    });
    if (!completedAssessment) return { kind: "assessment_not_completed" } as const;

    const completedInterview = await completeInterviewAfterVoice(transaction, {
      id: input.interviewId,
    });
    if (!completedInterview) {
      // Re-read under the locks rather than turning a winning terminal state
      // into evaluation_failed based on a stale pre-transaction snapshot.
      const current = await tx`
        SELECT i.status AS interview_status, a.status AS application_status
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        WHERE i.id = ${input.interviewId}
      `;
      if (
        current[0]?.interview_status === "cancelled" ||
        current[0]?.application_status === "withdrawn" ||
        current[0]?.application_status === "rejected"
      ) {
        return { kind: "terminal_winner" } as const;
      }
      await tx`
        UPDATE applications
        SET status = 'evaluation_failed', updated_at = now()
        WHERE id = ${interview.applicationId}
          AND status IN ('interview_invited', 'interview_in_progress')
      `;
      return { kind: "completion_failed" } as const;
    }

    return { kind: "completed", applicationId: completedInterview.applicationId } as const;
  });

  if (transition.kind !== "completed") return false;

  await startPostEvaluation(input.db, {
    interviewId: input.interviewId,
    applicationId: transition.applicationId,
  });

  return true;
}

/**
 * Run the communication-scoring analysis over a stored transcript and refine
 * it. Returns `null` (never throws) when the transcript is empty or the model
 * fails to produce a valid result, so callers can degrade gracefully.
 *
 * Invoked from the post-evaluation workflow's `load_voice_assessment` step,
 * where it runs in the background without blocking the candidate.
 */
function formatVoiceAnalysisError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function analyzeVoiceTranscript(
  messages: Array<VoiceTranscriptMessage>,
  ctx: Awaited<ReturnType<typeof loadVoiceAssessmentContext>>,
): Promise<CommunicationAssessmentAnalysis | null> {
  const transcriptForPrompt = messages
    .map((message) =>
      message.role === "assistant"
        ? `Zero: ${message.content}`
        : `${ctx.candidateName || "Candidate"}: ${message.content}`,
    )
    .join("\n")
    .trim();

  if (!transcriptForPrompt) {
    return null;
  }

  const rawResult = await runVoiceAnalysis(transcriptForPrompt, ctx);
  if (!rawResult.analysis) {
    console.error(
      `[voice-assessment] LLM analysis failed: ${rawResult.failure ?? "unknown error"}`,
    );
    return null;
  }

  const refined = refineCommunicationAnalysis(rawResult.analysis, transcriptForPrompt);
  if (!refined) {
    const wordCount = transcriptForPrompt.trim().split(/\s+/).length;
    console.error(`[voice-assessment] refine rejected analysis (transcriptWords=${wordCount})`);
    return null;
  }

  return refined;
}

function recoverCommunicationAssessmentFromError(
  error: unknown,
): CommunicationAssessmentAnalysis | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const text = "text" in error && typeof error.text === "string" ? error.text : null;
  if (!text) {
    return null;
  }

  try {
    return parseCommunicationAssessment(JSON.parse(text));
  } catch {
    return null;
  }
}

async function runVoiceAnalysis(
  transcript: string,
  ctx: Awaited<ReturnType<typeof loadVoiceAssessmentContext>>,
): Promise<{ analysis: CommunicationAssessmentAnalysis | null; failure: string | null }> {
  const { systemPrompt, userPrompt } = COMMUNICATION_ASSESSMENT_PROMPT.build({
    jobTitle: ctx.jobTitle,
    companyName: ctx.companyName,
    candidateName: ctx.candidateName,
    transcript,
  });

  const maxAttempts = 3;
  const perAttemptTimeoutMs = 45_000;
  let lastFailure: string | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perAttemptTimeoutMs);

    try {
      const result = await generateText({
        model: createChatModel("post_eval", { plugins: [{ id: "response-healing" }] }),
        output: Output.object({ schema: communicationAssessmentSchema }),
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 2000,
        abortSignal: controller.signal,
      });
      if (!result.output) {
        lastFailure = "Structured output was empty";
        continue;
      }
      return { analysis: result.output, failure: null };
    } catch (error) {
      const recovered = recoverCommunicationAssessmentFromError(error);
      if (recovered) {
        return { analysis: recovered, failure: null };
      }

      lastFailure = formatVoiceAnalysisError(error);
      console.error(`[voice-assessment] analysis attempt ${attempt + 1} failed:`, error);
      if (attempt < maxAttempts - 1) {
        const delay = 1_000 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return { analysis: null, failure: lastFailure };
}

/**
 * Start post-evaluation once chat and voice are both finished.
 *
 * Gate (all must pass):
 *  - no report yet for this application;
 *  - `interviews.status === 'completed'`;
 *  - `communication_assessments.status === 'completed'`.
 *
 * Idempotent: a stable instance id is reconciled through Workflow get/status.
 */
export async function startPostEvaluation(
  db: Parameters<typeof getCommunicationAssessmentByInterviewId>[0],
  input: { interviewId: string; applicationId: string },
): Promise<void> {
  const existingReport = await getReportByApplicationId(db, {
    applicationId: input.applicationId,
  });
  if (existingReport) {
    return;
  }

  const interview = await getInterviewContextById(db, { id: input.interviewId });
  if (
    interview?.status !== "completed" ||
    interview.applicationStatus !== "interview_in_progress"
  ) {
    return;
  }

  const existingAssessment = await getCommunicationAssessmentByInterviewId(db, {
    interviewId: input.interviewId,
  });
  if (existingAssessment?.status !== "completed") {
    return;
  }

  let instance: WorkflowInstance | null = null;
  try {
    try {
      instance = await env.POST_EVALUATION.get(input.interviewId);
    } catch {
      const created = await env.POST_EVALUATION.create({
        id: input.interviewId,
        params: { interviewId: input.interviewId },
      });
      disposeRpcResource(created);
      return;
    }

    const status = await instance.status();
    try {
      if (status.status === "errored" || status.status === "terminated") {
        await instance.restart();
      }
      // queued/running/waiting/paused/complete are healthy. unknown and
      // waitingForPause are conservatively left alone rather than duplicated.
    } finally {
      disposeRpcResource(status);
    }
  } catch (error) {
    await db`
      UPDATE applications
      SET status = 'evaluation_failed', updated_at = now()
      WHERE id = ${input.applicationId}
        AND status IN ('interview_invited', 'interview_in_progress')
    `;
    console.error(
      `[startPostEvaluation] failed to reconcile post-evaluation for ${input.interviewId}`,
      error,
    );
    throw error;
  } finally {
    disposeRpcResource(instance);
  }
}
