import { chat, EventType } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { createServerFn } from "@tanstack/react-start";
import { setCookie, setResponseHeader } from "@tanstack/react-start/server";
import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { updateApplicationStatus } from "@/features/applications/queries/queries_sql";
import { withdrawApplicationWorkflow } from "@/features/applications/services/workflows";
import {
  claimInterviewGreeting,
  completeInterviewGreeting,
  createCommunicationAssessmentIfAbsent,
  failInterviewGreeting,
  getCommunicationAssessmentByInterviewId,
  getInterviewContextById,
  getInterviewForCandidateById,
  getInterviewMessagesByInterviewId,
  getInterviewsByCandidate,
  submitInterviewForVoice,
  updateInterviewStatus,
} from "@/features/interviews/queries/queries_sql";
import { type ExpirableInterview, expireInterviewIfDue } from "@/features/interviews/server/expire";
import {
  startPostEvaluation,
  type VoiceFinalizationResult,
} from "@/features/interviews/server/voice-assessment";
import {
  createVoiceCapability,
  getVoiceAgentPath,
  getVoiceCapabilityCookieName,
  VOICE_CAPABILITY_TTL_MS,
} from "@/features/interviews/server/voice-capability";
import {
  buildInterviewSystemPrompt,
  ensureInterviewRuntimeMetadata,
  interviewContinueResponseSchema,
  loadInterviewRuntimeContext,
} from "@/features/interviews/shared/runtime";
import { getDb } from "@/shared/db";
import { appEnv, isDev } from "@/shared/env.app";
import { ExpectedError } from "@/shared/expected-error";
import { authMiddleware } from "@/shared/middleware";
import { getModelChain } from "@/shared/openrouter";
import { zodValidator } from "@/shared/validation";

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
      throw new ExpectedError("forbidden", "Only candidates can view interviews");
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
      interview: expired.interview,
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
      throw new ExpectedError("forbidden", "Only candidates can view interviews");
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
      throw new ExpectedError("forbidden", "Only candidates can start interviews");
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
      throw new ExpectedError("expired", "Interview has expired");
    }

    if (
      effectiveInterview.status === "completed" ||
      effectiveInterview.status === "awaiting_voice"
    ) {
      return effectiveInterview;
    }

    if (effectiveInterview.status === "cancelled") {
      throw new ExpectedError("invalid_state", "Interview is no longer available");
    }

    const wasAlreadyActive = effectiveInterview.status === "in_progress";

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
      const greetingClaim = await claimInterviewGreeting(db, { interviewId: data.interviewId });
      if (greetingClaim) {
        try {
          const { model, fallbacks } = getModelChain("interview");
          const greetingStream = chat({
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
              }),
            ],
            outputSchema: interviewContinueResponseSchema,
            modelOptions: {
              ...(fallbacks.length > 0 ? { models: fallbacks } : {}),
              parallelToolCalls: false,
              plugins: [{ id: "response-healing" }],
              reasoning: { effort: "none" },
              temperature: 0.3,
              maxCompletionTokens: 300,
            },
            stream: true,
          });

          let greeting: z.infer<typeof interviewContinueResponseSchema> | null = null;
          for await (const chunk of greetingStream) {
            if (chunk.type === EventType.RUN_ERROR) {
              throw new Error(chunk.message || "Interview greeting generation failed");
            }
            if (chunk.type === EventType.CUSTOM && chunk.name === "structured-output.complete") {
              greeting = interviewContinueResponseSchema.parse(chunk.value.object);
            }
          }

          if (!greeting) {
            throw new Error("The interview assistant did not produce a greeting");
          }

          const savedGreeting = await completeInterviewGreeting(db, {
            interviewId: data.interviewId,
            content: greeting.message,
          });
          if (!savedGreeting) {
            throw new Error("Could not persist the interview greeting");
          }
        } catch (error) {
          await failInterviewGreeting(db, { interviewId: data.interviewId });
          throw error;
        }
      }
    }

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
      throw new ExpectedError("forbidden", "Only candidates can cancel interviews");
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
      throw new ExpectedError("invalid_state", "Completed interviews cannot be cancelled");
    }

    if (effectiveInterview.status === "cancelled") {
      return effectiveInterview;
    }

    await withdrawApplicationWorkflow(db, {
      userId: context.userId,
      applicationId: effectiveInterview.applicationId,
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
      throw new ExpectedError("forbidden", "Only candidates can complete interviews");
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
      throw new ExpectedError("expired", "Interview has expired");
    }

    if (
      effectiveInterview.status === "awaiting_voice" ||
      effectiveInterview.status === "completed"
    ) {
      return effectiveInterview;
    }

    if (effectiveInterview.status === "cancelled") {
      throw new ExpectedError("invalid_state", "Interview is no longer available");
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

export const getMyVoiceAssessment = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new ExpectedError("forbidden", "Only candidates can view voice assessments");
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

export const prepareMyVoiceConnection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "candidate") {
      throw new ExpectedError("forbidden", "Only candidates can start voice assessments");
    }

    const db = getDb();
    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
    if (!interview) {
      throw new ExpectedError("not_found", "Interview not found");
    }
    if (
      interview.status !== "awaiting_voice" ||
      interview.applicationStatus === "withdrawn" ||
      interview.applicationStatus === "rejected"
    ) {
      throw new ExpectedError("invalid_state", "Voice assessment is not available yet");
    }

    const existing = await getCommunicationAssessmentByInterviewId(db, {
      interviewId: interview.id,
    });
    if (existing?.status === "completed" || existing?.status === "skipped") {
      throw new ExpectedError("already_exists", "Voice assessment is already complete");
    }

    await createCommunicationAssessmentIfAbsent(db, {
      interviewId: interview.id,
      applicationId: interview.applicationId,
    });

    const capability = await createVoiceCapability({
      secret: appEnv.SESSION_SECRET,
      candidateId: context.userId,
      interviewId: interview.id,
    });
    setCookie(getVoiceCapabilityCookieName(interview.id), capability.token, {
      httpOnly: true,
      sameSite: "strict",
      secure: !isDev,
      path: getVoiceAgentPath(interview.id),
      maxAge: VOICE_CAPABILITY_TTL_MS / 1000,
    });
    setResponseHeader("Cache-Control", "no-store");

    return { expiresAt: capability.expiresAt };
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
      throw new ExpectedError("forbidden", "Only candidates can view voice assessment transcripts");
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

export const requestMyVoiceFinalization = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }): Promise<VoiceFinalizationResult> => {
    if (context.user.role !== "candidate") {
      throw new ExpectedError("forbidden", "Only candidates can complete voice assessments");
    }

    const db = getDb();
    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
    if (!interview) {
      return { ok: false, reason: "terminal_state" };
    }

    const existing = await getCommunicationAssessmentByInterviewId(db, {
      interviewId: data.interviewId,
    });
    if (existing?.status === "completed" && interview.status === "completed") {
      await startPostEvaluation(db, {
        interviewId: data.interviewId,
        applicationId: interview.applicationId,
      });
      return { ok: true, reason: "already_completed" };
    }
    if (
      interview.status === "cancelled" ||
      interview.status === "expired" ||
      interview.applicationStatus === "withdrawn" ||
      interview.applicationStatus === "rejected"
    ) {
      return { ok: false, reason: "terminal_state" };
    }
    if (interview.status !== "awaiting_voice" || !existing || existing.status === "skipped") {
      return { ok: false, reason: "assessment_unavailable" };
    }

    const voiceAgent = await getAgentByName(env.VoiceAssessmentAgent, data.interviewId, {
      locationHint: "enam",
    });
    return await voiceAgent.finalizeCommittedHistory();
  });
