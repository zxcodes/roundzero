import { AIChatAgent } from "@cloudflare/ai-chat";
import { callable } from "agents";
import {
  convertToModelMessages,
  generateText,
  hasToolCall,
  pruneMessages,
  type StreamTextOnFinishCallback,
  stepCountIs,
  streamText,
  type ToolSet,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { shouldAutoExpireInterview } from "@/features/interviews/shared/expiry";
import {
  completeInterview,
  expireInterview,
  getInterviewContextById,
} from "../queries/interviews/queries_sql";
import { getDb } from "../shared/db";
import { getInterviewModelChain, getOpenRouter } from "../shared/openrouter";

type InterviewSessionStatus = "pending" | "in_progress" | "completed" | "cancelled" | "expired";

type InterviewContextState = {
  interviewId: string;
  applicationId: string;
  type: "full" | "quick_eval";
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  jobRequirements: string[];
  candidateName: string;
  candidateSummary: string;
  customQuestions: string[];
  preEvaluation: {
    score: number | null;
    missingRequirements: string[];
    consistencyScore: number | null;
  };
};

type InterviewAgentState = {
  interviewId: string;
  applicationId: string;
  status: InterviewSessionStatus;
  maxQuestions: number;
  askedQuestions: number;
  scores: {
    relevance: number;
    depth: number;
    clarity: number;
    count: number;
  };
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  updatedAt: string;
  context: InterviewContextState;
  postEvaluationTriggered: boolean;
  screeningCoverage: Record<number, "answered" | "skipped">;
};

type InterviewTranscriptMessage = {
  role: "assistant" | "candidate";
  content: string;
  createdAt: string;
};

type InterviewStateResponse = {
  session: {
    interviewId: string;
    applicationId: string;
    type: "full" | "quick_eval";
    jobTitle: string;
    companyName: string;
    status: InterviewSessionStatus;
    maxQuestions: number;
    askedQuestions: number;
    startedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    updatedAt: string;
  };
  messages: InterviewTranscriptMessage[];
};

const toNow = () => new Date().toISOString();

const emptyContext = (): InterviewContextState => ({
  interviewId: "",
  applicationId: "",
  type: "full",
  jobTitle: "",
  companyName: "",
  jobDescription: "",
  jobRequirements: [],
  candidateName: "",
  candidateSummary: "",
  customQuestions: [],
  preEvaluation: { score: null, missingRequirements: [], consistencyScore: null },
});

const emptyState = (): InterviewAgentState => ({
  interviewId: "",
  applicationId: "",
  status: "pending",
  maxQuestions: 5,
  askedQuestions: 0,
  scores: { relevance: 0, depth: 0, clarity: 0, count: 0 },
  startedAt: null,
  completedAt: null,
  cancelledAt: null,
  updatedAt: toNow(),
  context: emptyContext(),
  postEvaluationTriggered: false,
  screeningCoverage: {},
});

const readUiMessageText = (message: UIMessage) => {
  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .map((part) => {
      if (part.type === "text" && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("\n")
    .trim();
};

const toTranscript = (messages: UIMessage[]): InterviewTranscriptMessage[] => {
  const result: InterviewTranscriptMessage[] = [];
  for (const message of messages) {
    if (message.role !== "assistant" && message.role !== "user") {
      continue;
    }
    const content = readUiMessageText(message);
    if (!content) {
      continue;
    }
    result.push({
      role: message.role === "assistant" ? "assistant" : "candidate",
      content,
      createdAt: toNow(),
    });
  }
  return result;
};

const normalizeInterviewType = (value: string): "full" | "quick_eval" => {
  return value === "quick_eval" ? "quick_eval" : "full";
};

const filterStrings = (input: unknown): string[] => {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

export class InterviewAgent extends AIChatAgent<Env, InterviewAgentState> {
  initialState = emptyState();

  private buildSystemPrompt(): string {
    const ctx = this.state.context;
    const reqs =
      ctx.jobRequirements.length > 0
        ? ctx.jobRequirements.map((r) => `- ${r}`).join("\n")
        : "(not provided)";
    const customQs =
      ctx.customQuestions.length > 0
        ? ctx.customQuestions
            .map((q, i) => {
              const status = this.state.screeningCoverage[i + 1];
              const tag =
                status === "answered" ? " [answered]" : status === "skipped" ? " [skipped]" : "";
              return `${i + 1}. ${q}${tag}`;
            })
            .join("\n")
        : "(none — use your own judgment)";
    const missing =
      ctx.preEvaluation.missingRequirements.length > 0
        ? ctx.preEvaluation.missingRequirements.map((r) => `- ${r}`).join("\n")
        : "(none flagged)";
    const score = ctx.preEvaluation.score == null ? "n/a" : `${ctx.preEvaluation.score}/100`;
    const candidateName = ctx.candidateName || "the candidate";
    const customQuestionCount = ctx.customQuestions.length;
    const substantiveTarget = ctx.type === "quick_eval" ? 2 : this.state.maxQuestions;
    const totalTarget = customQuestionCount + substantiveTarget;
    const pacing =
      ctx.type === "quick_eval"
        ? `Short clarifying interview. Cover every one of the ${customQuestionCount} company question(s), plus ~${substantiveTarget} short follow-ups. Aim for ~${totalTarget} total turns.`
        : `Full interview. Cover every one of the ${customQuestionCount} company question(s) AND ~${substantiveTarget} substantive probing question(s). Aim for ~${totalTarget} total turns.`;

    const uncoveredIndexes = ctx.customQuestions
      .map((_, i) => i + 1)
      .filter((i) => !(i in this.state.screeningCoverage));
    const assistantTurns = this.messages.filter((m) => m.role === "assistant").length;
    const remainingBudget = Math.max(totalTarget - assistantTurns, 0);
    const coverageDirective =
      uncoveredIndexes.length === 0
        ? "All company questions have been covered. Probe for remaining signal or close out warmly."
        : remainingBudget <= uncoveredIndexes.length
          ? `URGENT: only ~${remainingBudget} turn(s) left and ${uncoveredIndexes.length} company question(s) are still uncovered (#${uncoveredIndexes.join(", #")}). Your NEXT message MUST ask one of them. Stop probing other topics until they are covered.`
          : `Still uncovered: question #${uncoveredIndexes.join(", #")}. Make sure you cover each before you call end_interview.`;

    return [
      `You are Zero, a senior interviewer at RoundZero. You are interviewing ${candidateName} for the ${ctx.jobTitle} role at ${ctx.companyName}.`,
      "",
      "Behave like a thoughtful, experienced human hiring manager on a Zoom screening call. Warm, professional, direct.",
      "",
      "Style:",
      "- Plain conversational English. No JSON, code, markdown, or lists.",
      "- One question per turn. Briefly acknowledge the previous answer, then ask the next.",
      "- Keep each turn under 80 words.",
      "- Vary transitions. Probe tradeoffs and judgment, not just facts.",
      "- Reference specific resume details when probing.",
      "",
      "Required coverage of company questions:",
      "- Every numbered company question below MUST be asked before the interview ends. Do not skip any.",
      "- Ask them in order. You may rephrase to sound natural and combine two if closely related.",
      "- Short factual screens (salary, notice period, visa, relocation, start date): get the answer in one or two turns and move on. Do not drill in unless the answer is unclear or a likely dealbreaker.",
      "- Role-specific company questions (e.g. design a system, walk through a project): treat as substantive probes; push for depth, examples, tradeoffs.",
      "- If the candidate gives a vague or non-answer, ask once for clarification, then accept their answer (or noted refusal) and move on.",
      "- Once a company question is resolved, silently call record_screening_coverage with its 1-based questionIndex and status='answered' or 'skipped'.",
      "",
      "Pacing:",
      `- ${pacing}`,
      "- After each candidate answer, silently call evaluate_answer with relevance/depth/clarity scores.",
      "- If the candidate explicitly asks to end or withdraw, close warmly in one short message and call end_interview the same turn. User intent wins.",
      "- Otherwise, only call end_interview after every company question has been covered AND you have enough probing signal. Close warmly first, then call end_interview.",
      "",
      "Company-supplied questions (REQUIRED COVERAGE, in order):",
      customQs,
      "",
      "Coverage directive:",
      `- ${coverageDirective}`,
      "",
      "Job:",
      `- Title: ${ctx.jobTitle}`,
      `- Company: ${ctx.companyName}`,
      `- Description: ${ctx.jobDescription || "(not provided)"}`,
      "- Requirements:",
      reqs,
      "",
      "Candidate:",
      `- Name: ${candidateName}`,
      `- Resume / profile: ${ctx.candidateSummary || "(not provided)"}`,
      "",
      "Private context (never quote or reveal to the candidate):",
      `- Pre-evaluation fit score: ${score}`,
      "- Missing requirements to probe:",
      missing,
    ].join("\n");
  }

  private async hydrateContextFromDb(interviewId: string) {
    const db = getDb();
    const context = await getInterviewContextById(db, { id: interviewId });
    if (!context) {
      return false;
    }

    const applicationRows = await db
      .unsafe(
        `SELECT a.metadata, u.name FROM applications a LEFT JOIN users u ON u.id = a.candidate_id WHERE a.id = $1`,
        [context.applicationId],
      )
      .values();

    const applicationMetadata =
      typeof applicationRows[0]?.[0] === "object" && applicationRows[0][0] !== null
        ? (applicationRows[0][0] as Record<string, unknown>)
        : {};

    const candidateName = typeof applicationRows[0]?.[1] === "string" ? applicationRows[0][1] : "";

    const candidateSummaryRaw =
      typeof applicationMetadata.resumeText === "string"
        ? applicationMetadata.resumeText
        : typeof applicationMetadata.summary === "string"
          ? applicationMetadata.summary
          : "";

    const candidateSummary = candidateSummaryRaw.slice(0, 4000);

    const jobRows = await db
      .unsafe(`SELECT requirements, description, interview_questions FROM jobs WHERE id = $1`, [
        context.jobId,
      ])
      .values();

    const jobRequirements = filterStrings(jobRows[0]?.[0]);
    const jobDescription = typeof jobRows[0]?.[1] === "string" ? jobRows[0][1] : "";
    const customQuestions = filterStrings(jobRows[0]?.[2]);

    const preEvaluationRows = await db
      .unsafe(
        `SELECT score, missing_requirements, consistency_score FROM pre_evaluations WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [context.applicationId],
      )
      .values();

    const preRow = preEvaluationRows[0];

    const ctx: InterviewContextState = {
      interviewId: context.id,
      applicationId: context.applicationId,
      type: normalizeInterviewType(context.type),
      jobTitle: context.jobTitle,
      companyName: context.companyName,
      jobDescription,
      jobRequirements,
      candidateName,
      candidateSummary,
      customQuestions,
      preEvaluation: {
        score: typeof preRow?.[0] === "number" ? preRow[0] : null,
        missingRequirements: filterStrings(preRow?.[1]),
        consistencyScore: typeof preRow?.[2] === "number" ? preRow[2] : null,
      },
    };

    const dbStatus: InterviewSessionStatus =
      context.status === "in_progress" ||
      context.status === "completed" ||
      context.status === "cancelled" ||
      context.status === "expired"
        ? context.status
        : "pending";

    // Preserve runtime counters (askedQuestions, scores, postEvaluationTriggered)
    // across hibernation. Only refresh context + lifecycle fields.
    const prev = this.state.interviewId ? this.state : emptyState();
    this.setState({
      ...prev,
      interviewId: ctx.interviewId,
      applicationId: ctx.applicationId,
      status: dbStatus,
      maxQuestions: ctx.type === "quick_eval" ? 3 : 5,
      startedAt: context.startedAt ? context.startedAt.toISOString() : prev.startedAt,
      completedAt: context.completedAt ? context.completedAt.toISOString() : prev.completedAt,
      updatedAt: toNow(),
      context: ctx,
      screeningCoverage: Object.fromEntries(
        Object.entries(prev.screeningCoverage ?? {}).filter(([key]) => {
          const questionIndex = Number.parseInt(key, 10);
          return (
            Number.isFinite(questionIndex) &&
            questionIndex >= 1 &&
            questionIndex <= ctx.customQuestions.length
          );
        }),
      ) as Record<number, "answered" | "skipped">,
    });

    return true;
  }

  async onStart() {
    if (this.state.interviewId) {
      await this.hydrateContextFromDb(this.state.interviewId);
    }
  }

  async initializeContext(input: { interviewId: string }) {
    // Hydrate from DB so candidate name, latest pre-eval data, and requirements
    // stay in sync with the source of truth.
    await this.hydrateContextFromDb(input.interviewId);
    return toStateResponse(this.state, toTranscript(this.messages));
  }

  @callable()
  async markStarted(input: { interviewId: string }): Promise<{ started: boolean }> {
    if (!this.state.interviewId) {
      await this.hydrateContextFromDb(input.interviewId);
    }

    if (!this.state.interviewId) {
      return { started: false };
    }

    if (this.state.status !== "pending") {
      return { started: this.state.status === "in_progress" || this.state.status === "completed" };
    }

    this.setState({
      ...this.state,
      status: "in_progress",
      startedAt: this.state.startedAt ?? toNow(),
      updatedAt: toNow(),
    });

    return { started: true };
  }

  @callable()
  async kickoff(input: { interviewId: string }): Promise<{ greeted: boolean }> {
    if (!this.state.interviewId) {
      await this.hydrateContextFromDb(input.interviewId);
    }

    if (!this.state.interviewId) {
      return { greeted: false };
    }

    if (this.state.status !== "in_progress") {
      return { greeted: false };
    }

    if (this.messages.some((message) => message.role === "assistant")) {
      return { greeted: false };
    }

    const openrouter = getOpenRouter();
    const { model, models } = getInterviewModelChain();
    const result = await generateText({
      model: openrouter.chat(model),
      temperature: 0.7,
      system: this.buildSystemPrompt(),
      prompt: `Open the interview. Greet ${this.state.context.candidateName || "the candidate"} warmly by name, reference one specific resume detail that connects to this role, then ask your first focused interview question. Plain conversational English only.`,
      providerOptions: { openrouter: { models } },
    });

    const greeting = result.text.trim();
    if (!greeting) {
      return { greeted: false };
    }

    await this.persistMessages([
      ...this.messages,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text: greeting }],
      } satisfies UIMessage,
    ]);

    return { greeted: true };
  }

  @callable()
  async getInterviewState(input: { interviewId: string }): Promise<InterviewStateResponse> {
    if (!this.state.interviewId) {
      await this.hydrateContextFromDb(input.interviewId);
    }

    return toStateResponse(this.state, toTranscript(this.messages));
  }

  @callable()
  async cancelInterview(): Promise<InterviewStateResponse> {
    if (this.state.status === "completed") {
      throw new Error("Completed interviews cannot be cancelled");
    }

    if (this.state.status !== "cancelled") {
      this.setState({
        ...this.state,
        status: "cancelled",
        cancelledAt: toNow(),
        updatedAt: toNow(),
      });
    }

    return toStateResponse(this.state, toTranscript(this.messages));
  }

  async onChatMessage(onFinish: StreamTextOnFinishCallback<ToolSet>) {
    if (this.state.interviewId) {
      await this.hydrateContextFromDb(this.state.interviewId);
    }

    if (!this.state.interviewId) {
      return new Response("Interview session not initialized", { status: 400 });
    }

    const db = getDb();
    const interview = await getInterviewContextById(db, { id: this.state.interviewId });
    if (!interview) {
      return new Response("Interview not found", { status: 404 });
    }

    if (shouldAutoExpireInterview(interview.status, interview.metadata)) {
      await expireInterview(db, { id: this.state.interviewId });
      return new Response("Interview has expired", { status: 400 });
    }

    if (interview.status === "pending" || this.state.status === "pending") {
      return new Response("Interview has not been started", { status: 400 });
    }

    if (
      interview.status === "cancelled" ||
      this.state.status === "cancelled" ||
      interview.status === "expired" ||
      this.state.status === "expired"
    ) {
      return new Response("Interview is no longer available", { status: 400 });
    }

    if (interview.status === "completed" || this.state.status === "completed") {
      return new Response("Interview already completed", { status: 400 });
    }

    const openrouter = getOpenRouter();
    const { model, models } = getInterviewModelChain();

    const latestCandidateMessage = [...this.messages].reverse().find((m) => m.role === "user");
    const latestCandidateText = latestCandidateMessage
      ? readUiMessageText(latestCandidateMessage)
      : "";
    const userRequestedEnd =
      /\b(end|finish|submit|stop|done|wrap up|that's all|no more questions)\b/i.test(
        latestCandidateText,
      );

    const systemPrompt = userRequestedEnd
      ? `${this.buildSystemPrompt()}\n\nThe candidate just explicitly asked to end. Close warmly in one short message and call end_interview this turn. Ask no further questions.`
      : this.buildSystemPrompt();

    const result = streamText({
      model: openrouter.chat(model),
      temperature: 0.7,
      system: systemPrompt,
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        reasoning: "before-last-message",
        toolCalls: "before-last-2-messages",
      }),
      onFinish,
      stopWhen: [stepCountIs(5), hasToolCall("end_interview")],
      providerOptions: { openrouter: { models } },
      tools: {
        evaluate_answer: tool({
          description:
            "Silently record the interviewer's scoring of the candidate's most recent answer. Never reveal these scores to the candidate.",
          inputSchema: z.object({
            relevance: z.number().min(0).max(100),
            depth: z.number().min(0).max(100),
            clarity: z.number().min(0).max(100),
          }),
          execute: async ({ relevance, depth, clarity }) => {
            const scores = this.state.scores;
            const nextCount = scores.count + 1;
            this.setState({
              ...this.state,
              scores: {
                relevance: scores.relevance + relevance,
                depth: scores.depth + depth,
                clarity: scores.clarity + clarity,
                count: nextCount,
              },
              askedQuestions: this.state.askedQuestions + 1,
              updatedAt: toNow(),
            });
            return { ok: true };
          },
        }),
        check_resume_gap: tool({
          description:
            "Silently check whether a candidate claim appears in their resume / profile context. Use before challenging or probing a vague claim.",
          inputSchema: z.object({
            claim: z.string().min(1),
          }),
          execute: async ({ claim }) => {
            const haystack = this.state.context.candidateSummary.toLowerCase();
            return { matched: haystack.includes(claim.toLowerCase()) };
          },
        }),
        record_screening_coverage: tool({
          description:
            "Silently mark required company-question coverage. Use status='answered' when answered and status='skipped' when unanswered/refused.",
          inputSchema: z.object({
            questionIndex: z.number().int().min(1),
            status: z.enum(["answered", "skipped"]),
          }),
          execute: async ({ questionIndex, status }) => {
            const totalQuestions = this.state.context.customQuestions.length;
            if (questionIndex > totalQuestions) {
              throw new Error(
                `Invalid screening question index ${questionIndex}. There are only ${totalQuestions} required questions.`,
              );
            }

            this.setState({
              ...this.state,
              screeningCoverage: {
                ...this.state.screeningCoverage,
                [questionIndex]: status,
              },
              updatedAt: toNow(),
            });

            return { ok: true };
          },
        }),
        end_interview: tool({
          description:
            "Mark the interview complete and trigger post-evaluation. Call this AFTER you have already written a warm closing message to the candidate in plain prose.",
          inputSchema: z.object({
            reason: z.string().min(1),
          }),
          execute: async ({ reason }) => {
            if (this.state.status !== "completed") {
              this.setState({
                ...this.state,
                status: "completed",
                completedAt: toNow(),
                updatedAt: toNow(),
              });

              await completeInterview(db, { id: this.state.interviewId });
            }

            if (!this.state.postEvaluationTriggered) {
              try {
                await this.env.POST_EVALUATION.create({
                  params: { interviewId: this.state.interviewId },
                });
                this.setState({
                  ...this.state,
                  postEvaluationTriggered: true,
                  updatedAt: toNow(),
                });
              } catch (error) {
                console.error("[interview-agent] failed to trigger post-evaluation", error);
              }
            }

            return { completed: true, reason };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  }
}

const toStateResponse = (
  state: InterviewAgentState,
  messages: InterviewTranscriptMessage[],
): InterviewStateResponse => ({
  session: {
    interviewId: state.interviewId,
    applicationId: state.applicationId,
    type: state.context.type,
    jobTitle: state.context.jobTitle,
    companyName: state.context.companyName,
    status: state.status,
    maxQuestions: state.maxQuestions,
    askedQuestions: state.askedQuestions,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    cancelledAt: state.cancelledAt,
    updatedAt: state.updatedAt,
  },
  messages,
});
