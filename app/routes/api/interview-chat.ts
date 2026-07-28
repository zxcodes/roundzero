import {
  chat,
  chatParamsFromRequest,
  EventType,
  type ModelMessage,
  maxIterations,
  type StreamChunk,
  toolDefinition,
  toServerSentEventsResponse,
  type UIMessage,
} from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { z } from "zod";

import {
  claimInterviewTurn,
  completeInterviewTurnWithAssistant,
  failInterviewTurn,
  getInterviewContextById,
  getInterviewForCandidateById,
  getInterviewMessagesByInterviewId,
  submitInterviewForVoice,
  updateInterviewMetadata,
} from "@/features/interviews/queries/queries_sql";
import { expireInterviewIfDue } from "@/features/interviews/server/expire";
import {
  clampMessageIntegritySnapshot,
  mergeInterviewIntegrity,
  messageIntegritySnapshotSchema,
} from "@/features/interviews/shared/integrity";
import {
  buildInterviewSystemPrompt,
  ensureInterviewRuntimeMetadata,
  type InterviewMetadata,
  loadInterviewRuntimeContext,
} from "@/features/interviews/shared/runtime";
import { isAnchoredTo } from "@/shared/ai-refine";
import { getDb } from "@/shared/db";
import { getModelChain } from "@/shared/openrouter";
import { type SessionData, sessionConfig } from "@/shared/session";

const requestSchema = z.object({
  interviewId: z.string().uuid(),
  messageIntegrity: messageIntegritySnapshotSchema.optional(),
});

const checkResumeGapDef = toolDefinition({
  name: "check_resume_gap",
  description:
    "Silently check whether a candidate claim appears in their resume or profile context before challenging or probing it.",
  inputSchema: z.object({
    claim: z.string().min(1),
  }),
  outputSchema: z.object({
    matched: z.boolean(),
  }),
});

const recordScreeningCoverageDef = toolDefinition({
  name: "record_screening_coverage",
  description:
    "Silently mark required company-question coverage. Use status='answered' when answered and status='skipped' when unanswered or refused.",
  inputSchema: z.object({
    questionIndex: z.number().int().min(1),
    status: z.enum(["answered", "skipped"]),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    error: z.string().optional(),
  }),
});

const endInterviewDef = toolDefinition({
  name: "end_interview",
  description:
    "Submit the text interview and move the candidate to the required voice step. Call this after you have already written a warm closing message to the candidate.",
  inputSchema: z.object({
    reason: z.string().min(1),
  }),
  outputSchema: z.object({
    completed: z.boolean(),
    reason: z.string(),
  }),
});

const readMessageText = (message: UIMessage | ModelMessage) => {
  if ("parts" in message && Array.isArray(message.parts)) {
    return message.parts
      .map((part) => {
        if (part.type === "text" && typeof part.content === "string") {
          return part.content;
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  if ("content" in message && typeof message.content === "string") {
    return message.content.trim();
  }

  return "";
};

export const Route = createFileRoute("/api/interview-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await useSession<SessionData>(sessionConfig);
        if (!session.data.userId) {
          return new Response("Not authenticated", { status: 401 });
        }

        const params = await chatParamsFromRequest(request);
        const parsedRequest = requestSchema.safeParse(params.forwardedProps);
        if (!parsedRequest.success) {
          return new Response("Invalid interview request", { status: 400 });
        }

        const db = getDb();
        const interviewId = parsedRequest.data.interviewId;
        const interview = await getInterviewForCandidateById(db, {
          id: interviewId,
          candidateId: session.data.userId,
        });

        if (!interview) {
          return new Response("Interview not found", { status: 404 });
        }

        const expired = await expireInterviewIfDue({
          db,
          interview,
        });
        if (expired.expiredNow) {
          return new Response("Interview has expired", { status: 400 });
        }

        if (interview.status === "pending") {
          return new Response("Interview has not been started", { status: 400 });
        }

        if (interview.status === "cancelled" || interview.status === "expired") {
          return new Response("Interview is no longer available", { status: 400 });
        }

        if (interview.status === "awaiting_voice") {
          return new Response(
            "Chat interview already submitted. Complete the voice assessment to finish.",
            { status: 400 },
          );
        }

        if (interview.status === "completed") {
          return new Response("Interview already completed", { status: 400 });
        }

        const latestCandidateMessage = [...params.messages]
          .reverse()
          .find((message) => message.role === "user");
        const candidateText = latestCandidateMessage ? readMessageText(latestCandidateMessage) : "";
        const turnId =
          latestCandidateMessage &&
          "id" in latestCandidateMessage &&
          typeof latestCandidateMessage.id === "string"
            ? latestCandidateMessage.id
            : params.runId;
        if (!turnId || turnId.length > 200 || candidateText.length === 0) {
          return new Response("Message content is required", { status: 400 });
        }

        const interviewContext = await getInterviewContextById(db, { id: interviewId });
        if (!interviewContext) {
          return new Response("Interview not found", { status: 404 });
        }

        let runtimeMetadata: InterviewMetadata = await ensureInterviewRuntimeMetadata(
          db,
          interviewContext,
        );
        const runtimeContext = await loadInterviewRuntimeContext(
          db,
          interviewContext,
          runtimeMetadata,
        );
        const savedCandidateMessage = await claimInterviewTurn(db, {
          interviewId,
          turnId,
          content: candidateText,
        });
        if (!savedCandidateMessage) {
          return new Response("An interview response is already being generated", { status: 409 });
        }

        let integrityMetadataDirty = false;

        const messageIntegrity = parsedRequest.data.messageIntegrity;
        if (messageIntegrity) {
          const clampedIntegrity = clampMessageIntegritySnapshot(messageIntegrity, candidateText);
          runtimeMetadata = {
            ...runtimeMetadata,
            integrity: mergeInterviewIntegrity(
              runtimeMetadata.integrity,
              savedCandidateMessage.id,
              clampedIntegrity,
            ),
          };
          integrityMetadataDirty = true;
        }

        const history = await getInterviewMessagesByInterviewId(db, { interviewId });
        const assistantTurnCount = history.filter((message) => message.role === "assistant").length;
        const userRequestedEnd =
          /\b(end|finish|submit|stop|done|wrap up|that's all|no more questions)\b/i.test(
            candidateText,
          );
        const getSystemPrompt = () => {
          const basePrompt = buildInterviewSystemPrompt({
            runtimeContext,
            screeningCoverage: runtimeMetadata.screeningCoverage ?? {},
            assistantTurnCount,
            maxQuestions: 5,
          });
          return userRequestedEnd
            ? `${basePrompt}\n\nThe candidate just explicitly asked to end. Close warmly in one short message and call end_interview this turn. Ask no further questions.`
            : basePrompt;
        };

        const flushIntegrityMetadata = async () => {
          if (!integrityMetadataDirty) {
            return;
          }

          await updateInterviewMetadata(db, {
            id: interviewId,
            metadata: runtimeMetadata,
          });
          integrityMetadataDirty = false;
        };

        const { model, fallbacks } = getModelChain("interview");
        const abortController = new AbortController();
        // The closing turn writes its farewell text *and* calls end_interview in
        // the same agent-loop iteration. The follow-up iteration that consumes the
        // tool result emits no text, so by `onFinish` the run's accumulated
        // `info.content` is empty and the farewell would be dropped — which made
        // the last assistant message vanish once the route reloaded from the DB.
        // Capture the last non-empty iteration text at each tool-phase boundary
        // (fires before the next iteration resets the accumulator) and fall back
        // to it when the terminal content is empty.
        let lastAssistantContent = "";
        let savedAssistantMessage: Awaited<ReturnType<typeof completeInterviewTurnWithAssistant>> =
          null;
        const stream = chat({
          adapter: createOpenRouterText(model, env.OPENROUTER_API_KEY, {
            httpReferer: env.APP_URL,
            appTitle: "RoundZero",
          }),
          messages: history
            .map(
              (message): ModelMessage => ({
                role: message.role === "assistant" ? "assistant" : "user",
                content: message.content,
              }),
            )
            .concat({ role: "user", content: savedCandidateMessage.content }),
          systemPrompts: [getSystemPrompt()],
          tools: [
            checkResumeGapDef.server(async ({ claim }) => ({
              matched: isAnchoredTo(claim, runtimeContext.candidateSummary, {
                minRun: 2,
                minOverlap: 0.3,
              }),
            })),
            recordScreeningCoverageDef.server(async ({ questionIndex, status }) => {
              const totalQuestions = runtimeContext.customQuestions.length;
              if (questionIndex > totalQuestions) {
                return {
                  ok: false,
                  error: `Invalid screening question index ${questionIndex}. There are only ${totalQuestions} required questions.`,
                };
              }

              runtimeMetadata = {
                ...runtimeMetadata,
                screeningCoverage: {
                  ...runtimeMetadata.screeningCoverage,
                  [String(questionIndex)]: status,
                },
              };

              await updateInterviewMetadata(db, {
                id: interviewId,
                metadata: runtimeMetadata,
              });
              integrityMetadataDirty = false;

              return { ok: true };
            }),
            endInterviewDef.server(async ({ reason }) => {
              await submitInterviewForVoice(db, { id: interviewId });

              return { completed: true, reason };
            }),
          ],
          abortController,
          threadId: params.threadId,
          runId: params.runId,
          parentRunId: params.parentRunId,
          agentLoopStrategy: maxIterations(5),
          modelOptions: {
            ...(fallbacks.length > 0 ? { models: fallbacks } : {}),
            parallelToolCalls: false,
            temperature: 0.3,
            maxCompletionTokens: 150,
          },
          middleware: [
            {
              name: "refresh-interview-prompt",
              onConfig: () => ({
                systemPrompts: [getSystemPrompt()],
              }),
            },
            {
              name: "finalize-interview-turn",
              onToolPhaseComplete: (context) => {
                const text = context.accumulatedContent.trim();
                if (text.length > 0) {
                  lastAssistantContent = text;
                }
              },
              onFinish: async (_context, info) => {
                try {
                  await flushIntegrityMetadata();

                  const content = info.content.trim() || lastAssistantContent;
                  if (content.length === 0) {
                    throw new Error("The interview assistant did not produce a response");
                  }

                  savedAssistantMessage = await completeInterviewTurnWithAssistant(db, {
                    interviewId,
                    turnId,
                    content,
                  });
                  if (!savedAssistantMessage) {
                    throw new Error("Could not persist the interview assistant response");
                  }
                } catch (error) {
                  await failInterviewTurn(db, { interviewId, turnId });
                  throw error;
                }
              },
              onAbort: async () => {
                try {
                  await flushIntegrityMetadata();
                } finally {
                  await failInterviewTurn(db, { interviewId, turnId });
                }
              },
              onError: async () => {
                try {
                  await flushIntegrityMetadata();
                } finally {
                  await failInterviewTurn(db, { interviewId, turnId });
                }
              },
            },
          ],
        });

        const bufferedResponse = async function* (): AsyncGenerator<StreamChunk> {
          let finishReason: Extract<StreamChunk, { type: EventType.RUN_FINISHED }>["finishReason"] =
            null;
          yield {
            type: EventType.RUN_STARTED,
            threadId: params.threadId,
            runId: params.runId,
            parentRunId: params.parentRunId,
            timestamp: Date.now(),
          };

          for await (const chunk of stream) {
            // Tool-loop iterations are private. Only the finalized response below
            // is allowed to become a candidate-visible transcript message.
            if (chunk.type === EventType.RUN_FINISHED) {
              finishReason = chunk.finishReason;
            }
          }

          if (!savedAssistantMessage) {
            throw new Error("The interview assistant did not produce a response");
          }

          const timestamp = Date.now();
          yield {
            type: EventType.TEXT_MESSAGE_START,
            messageId: savedAssistantMessage.id,
            role: "assistant",
            timestamp,
          };
          yield {
            type: EventType.TEXT_MESSAGE_CONTENT,
            messageId: savedAssistantMessage.id,
            delta: savedAssistantMessage.content,
            timestamp,
          };
          yield {
            type: EventType.TEXT_MESSAGE_END,
            messageId: savedAssistantMessage.id,
            timestamp,
          };
          yield {
            type: EventType.RUN_FINISHED,
            threadId: params.threadId,
            runId: params.runId,
            finishReason,
            timestamp,
          };
        };

        return toServerSentEventsResponse(bufferedResponse(), { abortController });
      },
    },
  },
});
