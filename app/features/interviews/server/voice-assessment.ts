import { env } from "cloudflare:workers";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  completeCommunicationAssessment,
  getCommunicationAssessmentByInterviewId,
  getInterviewContextById,
} from "@/features/interviews/queries/queries_sql";
import { loadVoiceAssessmentContext } from "@/features/interviews/shared/voice-runtime";
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

export function getVoiceWebhookClient(): ElevenLabsClient {
  return new ElevenLabsClient({
    apiKey: env.ELEVENLABS_API_KEY || undefined,
  });
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

  const verified = await getVoiceWebhookClient().webhooks.constructEvent(
    rawBody,
    signature,
    secret,
  );
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

export function normalizeVoiceTranscriptMessages(
  transcript: z.infer<typeof elevenLabsTranscriptEventSchema>["data"]["transcript"],
): Array<VoiceTranscriptMessage> {
  return transcript.reduce<Array<VoiceTranscriptMessage>>((messages, message) => {
    const content = message.message.trim();
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

  const fullInterview = await getInterviewContextById(input.db, { id: input.interviewId });
  if (!fullInterview) {
    return false;
  }

  const ctx = await loadVoiceAssessmentContext(input.db, fullInterview);
  const transcriptForDb = input.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const transcriptForPrompt = transcriptForDb
    .map((message) => {
      if (message.role === "assistant") {
        return `Zero: ${message.content}`;
      }
      return `${ctx.candidateName || "Candidate"}: ${message.content}`;
    })
    .join("\n")
    .trim();

  let analysis: CommunicationAssessmentAnalysis | null = null;
  if (transcriptForPrompt.length > 0) {
    const raw = await runVoiceAnalysis(transcriptForPrompt, ctx);
    analysis = raw ? refineCommunicationAnalysis(raw, transcriptForPrompt) : null;
  }

  await completeCommunicationAssessment(input.db, {
    interviewId: input.interviewId,
    transcript: transcriptForDb,
    analysis,
    audioKey: input.audioKey ?? null,
  });

  await signalVoiceAssessmentComplete(input.interviewId);
  return true;
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
