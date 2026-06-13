import { env } from "cloudflare:workers";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  completeCommunicationAssessment,
  createCommunicationAssessment,
  getCommunicationAssessmentByInterviewId,
} from "@/features/interviews/queries/queries_sql";
import type { loadVoiceAssessmentContext } from "@/features/interviews/shared/voice-runtime";
import { getReportByApplicationId } from "@/features/reports/queries/queries_sql";
import {
  COMMUNICATION_ASSESSMENT_PROMPT,
  type CommunicationAssessmentAnalysis,
  communicationAssessmentSchema,
} from "@/prompts/communication-assessment";
import { createChatModel } from "@/shared/openrouter";
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
 * `loadVoiceAssessment`. The report still generates either way.
 */
export async function finalizeVoiceAssessmentFromTranscript(input: {
  db: Parameters<typeof getCommunicationAssessmentByInterviewId>[0];
  interviewId: string;
  messages: Array<VoiceTranscriptMessage>;
  audioKey?: string | null;
}) {
  const existing = await getCommunicationAssessmentByInterviewId(input.db, {
    interviewId: input.interviewId,
  });
  if (!existing || existing.status === "completed" || existing.status === "skipped") {
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

  const completed = await completeCommunicationAssessment(input.db, {
    interviewId: input.interviewId,
    transcript: transcriptForDb,
    analysis: null,
    audioKey: input.audioKey ?? null,
  });
  if (!completed) {
    return false;
  }

  await signalVoiceAssessmentComplete(input.interviewId);
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

  try {
    const raw = await runVoiceAnalysis(transcriptForPrompt, ctx);
    return raw ? refineCommunicationAnalysis(raw, transcriptForPrompt) : null;
  } catch (error) {
    console.error("[voice-assessment] analysis/refine failed:", error);
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

export async function signalVoiceAssessmentComplete(interviewId: string): Promise<void> {
  try {
    const instance = await env.POST_EVALUATION.get(interviewId);
    await instance.sendEvent({
      type: "voice_assessment_complete",
      payload: { interviewId },
    });
  } catch (error) {
    console.error("[voice-assessment] failed to signal post-evaluation workflow", error);
  }
}

/**
 * Seed the optional voice communication-assessment row and start the
 * post-evaluation workflow for a completed interview.
 *
 * Ordering matters: the assessment row is created BEFORE the workflow so the
 * workflow's `check_voice_assessment_pending` step reliably sees it and waits
 * for the candidate's voice call. If the row seed throws, we never create a
 * workflow that would skip the voice wait.
 *
 * Idempotent and safe to call repeatedly:
 *  - no-op once a report exists (re-completion / retries);
 *  - reuses an existing assessment row;
 *  - the workflow uses the interview id as a stable instance id, so a duplicate
 *    `create` (workflow already running) throws and is logged, which also makes
 *    this a recovery path when a prior completion created the row but failed to
 *    start the workflow.
 *
 * Shared by both completion entry points: `completeMyInterview` and the
 * interview-chat `endInterview` tool.
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

  const existingAssessment = await getCommunicationAssessmentByInterviewId(db, {
    interviewId: input.interviewId,
  });
  if (!existingAssessment) {
    await createCommunicationAssessment(db, {
      interviewId: input.interviewId,
      applicationId: input.applicationId,
      status: "pending",
    });
  }

  try {
    await env.POST_EVALUATION.create({
      // Stable id so completeMyVoiceAssessment / the webhook can signal this
      // workflow, and so a duplicate create is a no-op rather than a fork.
      id: input.interviewId,
      params: { interviewId: input.interviewId },
    });
  } catch (error) {
    console.error(
      `[startPostEvaluation] failed to trigger post-evaluation for ${input.interviewId}`,
      error,
    );
  }
}
