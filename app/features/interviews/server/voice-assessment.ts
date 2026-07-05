import { env } from "cloudflare:workers";
import { generateText, Output } from "ai";
import { z } from "zod";
import { updateApplicationStatus } from "@/features/applications/queries/queries_sql";
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
    throw new Error("No signature hash found with expected scheme v0");
  }

  const reqTimestamp = Number(timestamp) * 1000;
  if (reqTimestamp < Date.now() - 30 * 60 * 1000) {
    throw new Error("Timestamp outside the tolerance zone");
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
    throw new Error("Signature hash does not match");
  }

  return JSON.parse(rawBody);
}

export async function parseElevenLabsWebhookEvent(request: Request) {
  const rawBody = await request.text();
  const secret = env.ELEVENLABS_WEBHOOK_SECRET;

  if (!secret) {
    const parsed = JSON.parse(rawBody);
    return elevenLabsWebhookEventSchema.parse(parsed);
  }

  const signature = request.headers.get("elevenlabs-signature");
  if (!signature) {
    throw new Error("Missing elevenlabs-signature header");
  }

  const verified = await verifyElevenLabsSignature(rawBody, signature, secret);
  return elevenLabsWebhookEventSchema.parse(verified);
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

  const completedAssessment = await completeCommunicationAssessment(input.db, {
    interviewId: input.interviewId,
    transcript: transcriptForDb,
    analysis: null,
    audioKey: input.audioKey ?? null,
  });
  if (!completedAssessment) {
    return false;
  }

  // Voice is mandatory: the interview is only fully `completed` now that both
  // text and voice are done. Conditional (awaiting_voice → completed), so a
  // late webhook can't resurrect an expired/cancelled interview.
  const completedInterview = await completeInterviewAfterVoice(input.db, {
    id: input.interviewId,
  });
  if (!completedInterview) {
    await updateApplicationStatus(input.db, {
      id: interview.applicationId,
      status: "evaluation_failed",
    });
    return false;
  }

  await startPostEvaluation(input.db, {
    interviewId: input.interviewId,
    applicationId: completedInterview.applicationId,
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

  const raw = await runVoiceAnalysis(transcriptForPrompt, ctx);
  if (!raw) {
    return null;
  }

  const refined = refineCommunicationAnalysis(raw, transcriptForPrompt);
  if (!refined) {
    console.error(
      "[voice-assessment] refine rejected analysis (no grounded evidence or schema failure)",
    );
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
): Promise<CommunicationAssessmentAnalysis | null> {
  const { systemPrompt, userPrompt } = COMMUNICATION_ASSESSMENT_PROMPT.build({
    jobTitle: ctx.jobTitle,
    companyName: ctx.companyName,
    candidateName: ctx.candidateName,
    transcript,
  });

  const maxAttempts = 3;
  const perAttemptTimeoutMs = 45_000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perAttemptTimeoutMs);

    try {
      const result = await generateText({
        model: createChatModel("post_eval", { plugins: [{ id: "response-healing" }] }),
        output: Output.object({ schema: communicationAssessmentSchema }),
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 1200,
        abortSignal: controller.signal,
      });
      return result.output;
    } catch (error) {
      const recovered = recoverCommunicationAssessmentFromError(error);
      if (recovered) {
        return recovered;
      }

      console.error(`[voice-assessment] analysis attempt ${attempt + 1} failed:`, error);
      if (attempt < maxAttempts - 1) {
        const delay = 1_000 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

/**
 * Start post-evaluation once chat and voice are both finished.
 *
 * Gate (all must pass):
 *  - no report yet for this application;
 *  - `interviews.status === 'completed'`;
 *  - `communication_assessments.status === 'completed'`.
 *
 * Idempotent: safe to call from voice finalization retries; duplicate workflow
 * `create` (already running) throws and is logged.
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
  if (interview?.status !== "completed") {
    return;
  }

  const existingAssessment = await getCommunicationAssessmentByInterviewId(db, {
    interviewId: input.interviewId,
  });
  if (existingAssessment?.status !== "completed") {
    return;
  }

  try {
    const instance = await env.POST_EVALUATION.create({
      id: input.interviewId,
      params: { interviewId: input.interviewId },
    });
    disposeRpcResource(instance);
  } catch (error) {
    console.error(
      `[startPostEvaluation] failed to trigger post-evaluation for ${input.interviewId}`,
      error,
    );
  }
}
