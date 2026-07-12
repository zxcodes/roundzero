import type { RealtimeToken } from "@tanstack/ai";
import { chat } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { updateApplicationStatus } from "@/features/applications/queries/queries_sql";
import {
  cancelInterview,
  createCommunicationAssessment,
  createInterviewMessage,
  getCommunicationAssessmentByInterviewId,
  getInterviewContextById,
  getInterviewForCandidateByApplicationId,
  getInterviewForCandidateById,
  getInterviewMessagesByInterviewId,
  getInterviewsByCandidate,
  registerCommunicationAssessmentConversation,
  registerCommunicationAssessmentSession,
  submitInterviewForVoice,
  updateInterviewStatus,
} from "@/features/interviews/queries/queries_sql";
import { type ExpirableInterview, expireInterviewIfDue } from "@/features/interviews/server/expire";
import {
  finalizeVoiceAssessmentFromTranscript,
  startPostEvaluation,
} from "@/features/interviews/server/voice-assessment";
import {
  buildInterviewSystemPrompt,
  ensureInterviewRuntimeMetadata,
  loadInterviewRuntimeContext,
} from "@/features/interviews/shared/runtime";
import { loadVoiceAssessmentContext } from "@/features/interviews/shared/voice-runtime";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";
import { getModelChain } from "@/shared/openrouter";

const interviewIdSchema = z.object({
  interviewId: z.string().uuid(),
});

const expireInterviewIfNeeded = <T extends ExpirableInterview>(input: {
  db: ReturnType<typeof getDb>;
  interview: T;
}) =>
  expireInterviewIfDue({
    db: input.db,
    interview: input.interview,
  });

export const getMyInterview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view interviews");
    }

    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });

    if (!interview) {
      return null;
    }

    const expired = await expireInterviewIfNeeded({ db, interview });
    if (expired.expiredNow) {
      return expired.interview;
    }

    return interview;
  });

export const getMyInterviewMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view interviews");
    }

    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });

    if (!interview) {
      return null;
    }

    const [expired, messages] = await Promise.all([
      expireInterviewIfNeeded({ db, interview }),
      getInterviewMessagesByInterviewId(db, {
        interviewId: data.interviewId,
      }),
    ]);

    return {
      status: expired.interview.status,
      messages: messages
        .filter((message) => message.role === "assistant" || message.role === "candidate")
        .map((message) => ({
          id: message.id,
          role: message.role === "assistant" ? "assistant" : "candidate",
          content: message.content,
        })),
    };
  });

export const getMyInterviews = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view interviews");
    }

    const interviews = await getInterviewsByCandidate(db, {
      candidateId: context.userId,
    });

    return await Promise.all(
      interviews.map(async (interview) => {
        // The helper internally short-circuits when the interview is not due
        // for expiry, so no extra guard is needed.
        const expired = await expireInterviewIfNeeded({ db, interview });
        return expired.interview;
      }),
    );
  });

export const startMyInterview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can start interviews");
    }

    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });

    if (!interview) {
      return null;
    }

    const expired = await expireInterviewIfNeeded({ db, interview });
    const effectiveInterview = expired.interview;

    if (effectiveInterview.status === "expired") {
      throw new Error("Interview has expired");
    }

    if (
      effectiveInterview.status === "completed" ||
      effectiveInterview.status === "awaiting_voice"
    ) {
      return effectiveInterview;
    }

    if (effectiveInterview.status === "cancelled") {
      throw new Error("Interview is no longer available");
    }

    const wasAlreadyActive = effectiveInterview.status === "in_progress";

    if (!wasAlreadyActive) {
      const updated = await updateInterviewStatus(db, {
        id: data.interviewId,
        status: "in_progress",
      });
      if (!updated) {
        return null;
      }

      await updateApplicationStatus(db, {
        id: effectiveInterview.applicationId,
        status: "interview_in_progress",
      });
    }

    const interviewContext = await getInterviewContextById(db, { id: data.interviewId });
    if (!interviewContext) {
      return null;
    }

    const metadata = await ensureInterviewRuntimeMetadata(db, interviewContext);
    const runtimeContext = await loadInterviewRuntimeContext(db, interviewContext, metadata);

    const existingMessages = await getInterviewMessagesByInterviewId(db, {
      interviewId: data.interviewId,
    });

    if (!existingMessages.some((message) => message.role === "assistant")) {
      const { model, fallbacks } = getModelChain("interview");
      const greeting = await chat({
        adapter: createOpenRouterText(model, env.OPENROUTER_API_KEY, {
          httpReferer: env.APP_URL,
          appTitle: "RoundZero",
        }),
        messages: [
          {
            role: "user",
            content: `Open the interview. Greet ${runtimeContext.candidateName || "the candidate"} warmly by name, then ask your first company-supplied screening question. If there are no company questions, start with a question about a specific project, role, or technology from their resume. Plain conversational English only.`,
          },
        ],
        systemPrompts: [
          buildInterviewSystemPrompt({
            runtimeContext,
            screeningCoverage: metadata.screeningCoverage ?? {},
            assistantTurnCount: existingMessages.filter((message) => message.role === "assistant")
              .length,
            maxQuestions: 5,
          }),
        ],
        modelOptions: {
          ...(fallbacks.length > 0 ? { models: fallbacks } : {}),
          parallelToolCalls: false,
          temperature: 0.3,
          maxCompletionTokens: 150,
        },
        stream: false,
      });

      const content = greeting.trim();
      if (content.length > 0) {
        await createInterviewMessage(db, {
          interviewId: data.interviewId,
          role: "assistant",
          content,
        });
      }
    }

    if (wasAlreadyActive) {
      return effectiveInterview;
    }
    return await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
  });

export const cancelMyInterview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can cancel interviews");
    }

    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });

    if (!interview) {
      return null;
    }

    const expired = await expireInterviewIfNeeded({ db, interview });
    const effectiveInterview = expired.interview;

    if (effectiveInterview.status === "expired") {
      return effectiveInterview;
    }

    if (effectiveInterview.status === "completed") {
      throw new Error("Completed interviews cannot be cancelled");
    }

    if (effectiveInterview.status === "cancelled") {
      return effectiveInterview;
    }

    const updated = await cancelInterview(db, {
      id: data.interviewId,
      cancellationReason: "Candidate cancelled via dashboard",
    });

    if (!updated) {
      return null;
    }

    await updateApplicationStatus(db, {
      id: effectiveInterview.applicationId,
      status: "withdrawn",
    });

    return await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
  });

export const completeMyInterview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can complete interviews");
    }

    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });

    if (!interview) {
      return null;
    }

    const expired = await expireInterviewIfNeeded({ db, interview });
    const effectiveInterview = expired.interview;

    if (effectiveInterview.status === "expired") {
      throw new Error("Interview has expired");
    }

    if (
      effectiveInterview.status === "awaiting_voice" ||
      effectiveInterview.status === "completed"
    ) {
      return effectiveInterview;
    }

    if (effectiveInterview.status === "cancelled") {
      throw new Error("Interview is no longer available");
    }

    const updated = await submitInterviewForVoice(db, { id: data.interviewId });
    if (!updated) {
      return null;
    }

    return await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
  });

export const getInterviewForApplication = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(
    zodValidator(
      z.object({
        applicationId: z.string().uuid(),
      }),
    ),
  )
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view interviews");
    }

    const interview = await getInterviewForCandidateByApplicationId(db, {
      id: data.applicationId,
      candidateId: context.userId,
    });

    if (!interview) {
      return null;
    }

    const expired = await expireInterviewIfNeeded({ db, interview });
    if (expired.expiredNow) {
      return expired.interview;
    }

    return interview;
  });

export const getMyVoiceAssessment = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view voice assessments");
    }

    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });

    if (!interview) {
      return null;
    }

    const assessment = await getCommunicationAssessmentByInterviewId(db, {
      interviewId: data.interviewId,
    });

    return {
      interviewId: interview.id,
      jobTitle: interview.jobTitle,
      companyName: interview.companyName,
      interviewStatus: interview.status,
      assessment: assessment
        ? {
            status: assessment.status,
            startedAt: assessment.startedAt?.toISOString() ?? null,
            completedAt: assessment.completedAt?.toISOString() ?? null,
          }
        : null,
    };
  });

const voiceTranscriptMessageSchema = z.object({
  role: z.enum(["assistant", "user", "candidate"]),
  content: z.string().trim().min(1),
});

const completeVoiceAssessmentSchema = z.object({
  interviewId: z.string().uuid(),
  messages: z.array(voiceTranscriptMessageSchema).max(500),
});

const registerVoiceAssessmentSessionSchema = z.object({
  interviewId: z.string().uuid(),
  conversationId: z.string().trim().min(1),
});

export const getMyVoiceToken = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }): Promise<RealtimeToken> => {
    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can start voice assessments");
    }

    const apiKey = env.ELEVENLABS_API_KEY;
    const agentId = env.ELEVENLABS_AGENT_ID;
    if (!apiKey || !agentId) {
      throw new Error("Voice assessment is not configured");
    }

    const db = getDb();
    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
    if (!interview) {
      throw new Error("Interview not found");
    }
    if (interview.status !== "awaiting_voice") {
      throw new Error("Voice assessment is not available yet");
    }

    const existing = await getCommunicationAssessmentByInterviewId(db, {
      interviewId: interview.id,
    });
    if (existing?.status === "completed" || existing?.status === "skipped") {
      throw new Error("Voice assessment is already complete");
    }

    if (!existing) {
      await createCommunicationAssessment(db, {
        interviewId: interview.id,
        applicationId: interview.applicationId,
        status: "pending",
      });
    }

    // Reuse the existing session id when present so a token refetch during an
    // active call does not unlink an in-flight provider_conversation_id.
    let providerSessionId = existing?.providerSessionId ?? null;
    if (!providerSessionId) {
      providerSessionId = crypto.randomUUID();
      await registerCommunicationAssessmentSession(db, {
        interviewId: interview.id,
        providerSessionId,
      });
    }

    // Load candidate/job context so the ElevenLabs agent can personalise
    // the conversation (addressed by dynamic variables in its system prompt).
    const contextInterview = await getInterviewContextById(db, { id: interview.id });
    let candidateName = "";
    let candidateSummary = "";
    if (contextInterview) {
      const ctx = await loadVoiceAssessmentContext(db, contextInterview);
      candidateName = ctx.candidateName;
      candidateSummary = ctx.candidateSummary;
    }

    const tokenResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      { headers: { "xi-api-key": apiKey } },
    );
    if (!tokenResponse.ok) {
      throw new Error("Failed to get ElevenLabs signed URL");
    }
    const { signed_url: signedUrl } = (await tokenResponse.json()) as { signed_url: string };

    return {
      provider: "elevenlabs",
      token: signedUrl,
      expiresAt: Date.now() + 30 * 60 * 1000,
      config: {
        providerOptions: {
          agentId,
          userId: providerSessionId,
          dynamicVariables: {
            candidate_name: candidateName,
            job_title: interview.jobTitle,
            company_name: interview.companyName,
            candidate_summary: candidateSummary,
          },
        },
      },
    };
  });

const voiceTranscriptDbSchema = z
  .array(
    z.object({
      role: z.string(),
      content: z.string(),
    }),
  )
  .catch([]);

export const getMyVoiceAssessmentTranscript = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view voice assessment transcripts");
    }

    const db = getDb();
    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
    if (!interview) {
      return { messages: [] as Array<{ role: string; content: string }> };
    }

    const assessment = await getCommunicationAssessmentByInterviewId(db, {
      interviewId: data.interviewId,
    });
    const parsed = voiceTranscriptDbSchema.safeParse(assessment?.transcript ?? []);
    return { messages: parsed.success ? parsed.data : [] };
  });

export const registerMyVoiceAssessmentSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(registerVoiceAssessmentSessionSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can start voice assessments");
    }

    const db = getDb();
    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
    if (!interview) {
      return { ok: false };
    }

    const existing = await getCommunicationAssessmentByInterviewId(db, {
      interviewId: data.interviewId,
    });
    if (!existing || existing.status === "completed" || existing.status === "skipped") {
      return { ok: false };
    }

    await registerCommunicationAssessmentConversation(db, {
      interviewId: data.interviewId,
      providerConversationId: data.conversationId,
    });

    return { ok: true };
  });

export const completeMyVoiceAssessment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(completeVoiceAssessmentSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can complete voice assessments");
    }

    const db = getDb();
    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
    if (!interview) {
      return { ok: false };
    }

    const existing = await getCommunicationAssessmentByInterviewId(db, {
      interviewId: data.interviewId,
    });
    if (existing?.status === "completed") {
      await startPostEvaluation(db, {
        interviewId: data.interviewId,
        applicationId: interview.applicationId,
      });
      return { ok: true };
    }
    if (existing?.status === "skipped") {
      return { ok: true };
    }
    if (!existing) {
      await createCommunicationAssessment(db, {
        interviewId: data.interviewId,
        applicationId: interview.applicationId,
        status: "pending",
      });
    }

    const completed = await finalizeVoiceAssessmentFromTranscript({
      db,
      interviewId: data.interviewId,
      messages: data.messages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "candidate",
        content: message.content,
      })),
    });
    return { ok: completed };
  });
