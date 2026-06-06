import { env } from "cloudflare:workers";
import {
  chat,
  chatParamsFromRequest,
  type ModelMessage,
  maxIterations,
  toolDefinition,
  toServerSentEventsResponse,
  type UIMessage,
} from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  completeInterview,
  createCommunicationAssessment,
  createInterviewMessage,
  getCommunicationAssessmentByInterviewId,
  getInterviewContextById,
  getInterviewForCandidateById,
  getInterviewMessagesByInterviewId,
  updateInterviewMetadata,
} from "@/features/interviews/queries/queries_sql";
import { expireInterviewIfDue } from "@/features/interviews/server/expire";
import {
  buildInterviewSystemPrompt,
  ensureInterviewRuntimeMetadata,
  type InterviewMetadata,
} from "@/features/interviews/shared/runtime";
import { getReportByApplicationId } from "@/features/reports/queries/queries_sql";
import { isAnchoredTo } from "@/shared/ai-refine";
import { getDb } from "@/shared/db";
import { getModelChain } from "@/shared/openrouter";
import { type SessionData, sessionConfig } from "@/shared/session";

const requestSchema = z.object({
  interviewId: z.string().uuid(),
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
    "Mark the interview complete and trigger post-evaluation. Call this after you have already written a warm closing message to the candidate.",
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
          postEvaluation: env.POST_EVALUATION,
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

        if (interview.status === "completed") {
          return new Response("Interview already completed", { status: 400 });
        }

        const latestCandidateMessage = [...params.messages]
          .reverse()
          .find((message) => message.role === "user");
        const candidateText = latestCandidateMessage ? readMessageText(latestCandidateMessage) : "";
        if (candidateText.length === 0) {
          return new Response("Message content is required", { status: 400 });
        }

        const savedCandidateMessage = await createInterviewMessage(db, {
          interviewId,
          role: "candidate",
          content: candidateText,
        });
        if (!savedCandidateMessage) {
          return new Response("Could not persist the message", { status: 500 });
        }

        const interviewContext = await getInterviewContextById(db, { id: interviewId });
        if (!interviewContext) {
          return new Response("Interview not found", { status: 404 });
        }

        let runtimeMetadata: InterviewMetadata = await ensureInterviewRuntimeMetadata(
          db,
          interviewContext,
        );
        const contextState = runtimeMetadata.contextState;
        if (!contextState) {
          return new Response("Interview context is unavailable", { status: 500 });
        }

        const history = await getInterviewMessagesByInterviewId(db, { interviewId });
        const assistantTurnCount = history.filter((message) => message.role === "assistant").length;
        const userRequestedEnd =
          /\b(end|finish|submit|stop|done|wrap up|that's all|no more questions)\b/i.test(
            candidateText,
          );
        const basePrompt = buildInterviewSystemPrompt({
          contextState,
          screeningCoverage: runtimeMetadata.screeningCoverage ?? {},
          assistantTurnCount,
          maxQuestions: 5,
        });
        const systemPrompt = userRequestedEnd
          ? `${basePrompt}\n\nThe candidate just explicitly asked to end. Close warmly in one short message and call end_interview this turn. Ask no further questions.`
          : basePrompt;

        const { model, fallbacks } = getModelChain("interview");
        const abortController = new AbortController();
        const stream = chat({
          adapter: createOpenRouterText(model, env.OPENROUTER_API_KEY, {
            httpReferer: env.APP_URL,
            appTitle: "RoundZero",
          }),
          messages: history.map(
            (message): ModelMessage => ({
              role: message.role === "assistant" ? "assistant" : "user",
              content: message.content,
            }),
          ),
          systemPrompts: [systemPrompt],
          tools: [
            checkResumeGapDef.server(async ({ claim }) => ({
              matched: isAnchoredTo(claim, contextState.candidateSummary, {
                minRun: 2,
                minOverlap: 0.3,
              }),
            })),
            recordScreeningCoverageDef.server(async ({ questionIndex, status }) => {
              const totalQuestions = contextState.customQuestions.length;
              if (questionIndex > totalQuestions) {
                return {
                  ok: false,
                  error: `Invalid screening question index ${questionIndex}. There are only ${totalQuestions} required questions.`,
                };
              }

              runtimeMetadata = {
                ...runtimeMetadata,
                screeningCoverage: {
                  ...(runtimeMetadata.screeningCoverage ?? {}),
                  [String(questionIndex)]: status,
                },
              };

              await updateInterviewMetadata(db, {
                id: interviewId,
                metadata: runtimeMetadata,
              });

              return { ok: true };
            }),
            endInterviewDef.server(async ({ reason }) => {
              await completeInterview(db, { id: interviewId });

              const existingReport = await getReportByApplicationId(db, {
                applicationId: interview.applicationId,
              });

              if (!existingReport) {
                const existingAssessment = await getCommunicationAssessmentByInterviewId(db, {
                  interviewId,
                });

                if (!existingAssessment) {
                  await createCommunicationAssessment(db, {
                    interviewId,
                    applicationId: interview.applicationId,
                    status: "pending",
                  });
                }

                try {
                  await env.POST_EVALUATION.create({
                    id: interviewId,
                    params: { interviewId },
                  });
                } catch (error) {
                  console.error("[interview-chat] failed to trigger post-evaluation", error);
                }
              }

              return { completed: true, reason };
            }),
          ],
          abortController,
          agentLoopStrategy: maxIterations(5),
          modelOptions: {
            ...(fallbacks.length > 0 ? { models: fallbacks } : {}),
            parallelToolCalls: false,
            temperature: 0.3,
            maxCompletionTokens: 150,
          },
          middleware: [
            {
              name: "persist-assistant-message",
              onFinish: async (_context, info) => {
                const content = info.content.trim();
                if (content.length === 0) {
                  return;
                }

                await createInterviewMessage(db, {
                  interviewId,
                  role: "assistant",
                  content,
                });
              },
            },
          ],
        });

        return toServerSentEventsResponse(stream, { abortController });
      },
    },
  },
});
