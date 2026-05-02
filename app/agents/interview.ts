import { AIChatAgent } from "@cloudflare/ai-chat";
import { callable } from "agents";
import {
  convertToModelMessages,
  generateText,
  hasToolCall,
  type StreamTextOnFinishCallback,
  stepCountIs,
  streamText,
  type ToolSet,
  tool,
  type UIMessage,
} from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { z } from "zod";
import { shouldAutoExpireInterview } from "@/features/interviews/shared/expiry";
import { getInterviewContextById, updateInterviewStatus } from "../queries/interviews/queries_sql";
import { getDb } from "../shared/db";

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
  kickoffGeneratedAt: string | null;
  screeningCoverage: Record<number, "answered" | "skipped">;
};

type LegacyInterviewMessage = {
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
  messages: LegacyInterviewMessage[];
};

const MODEL = "@cf/zai-org/glm-4.7-flash";

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
  kickoffGeneratedAt: null,
  screeningCoverage: {},
});

const readUiMessageText = (message: UIMessage) => {
  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .map((part) => {
      if (part.type === "text" && typeof part.text === "string") {
        return sanitizeVisibleText(part.text);
      }
      return "";
    })
    .join("\n")
    .trim();
};

const stripInternalReasoningText = (value: string) => {
  const withoutThinkBlocks = value
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/??think\b[^>]*>/gi, "");

  return withoutThinkBlocks;
};

const sanitizeVisibleText = (value: string) => {
  const cleaned = stripInternalReasoningText(value);
  const trimmed = cleaned.trim();
  if (!trimmed.startsWith("{")) {
    return cleaned;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      type?: unknown;
      name?: unknown;
      parameters?: unknown;
    };

    if (
      parsed.type === "function" &&
      typeof parsed.name === "string" &&
      Object.hasOwn(parsed, "parameters")
    ) {
      return "";
    }
  } catch {
    return cleaned;
  }

  return cleaned;
};

const toLegacyTranscript = (messages: UIMessage[]): LegacyInterviewMessage[] => {
  const result: LegacyInterviewMessage[] = [];
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
  messageConcurrency = "queue" as const;

  private buildSystemPrompt(): string {
    const ctx = this.state.context;
    const reqs =
      ctx.jobRequirements.length > 0
        ? ctx.jobRequirements.map((r) => `  - ${r}`).join("\n")
        : "  (not provided)";
    const customQs =
      ctx.customQuestions.length > 0
        ? ctx.customQuestions.map((q, i) => `  Q${i + 1}. ${q}`).join("\n")
        : "  (none — use your own judgment)";
    const missing =
      ctx.preEvaluation.missingRequirements.length > 0
        ? ctx.preEvaluation.missingRequirements.map((r) => `  - ${r}`).join("\n")
        : "  (none flagged)";
    const score = ctx.preEvaluation.score == null ? "n/a" : `${ctx.preEvaluation.score}/100`;
    const candidateName = ctx.candidateName || "the candidate";
    const customQuestionCount = ctx.customQuestions.length;
    const substantiveTarget = ctx.type === "quick_eval" ? 2 : this.state.maxQuestions;
    const totalTarget = customQuestionCount + substantiveTarget;
    const lengthGuidance =
      ctx.type === "quick_eval"
        ? `This is a SHORT clarifying interview. Cover ALL ${customQuestionCount} company-supplied question(s), plus ~${substantiveTarget} short probing follow-ups, then end. Aim for ~${totalTarget} total turns.`
        : `This is a FULL interview. Cover ALL ${customQuestionCount} company-supplied question(s) AND conduct ~${substantiveTarget} additional substantive probing questions. Aim for ~${totalTarget} total turns. Do not end early just because you hit ${substantiveTarget} substantive questions — every company-supplied question must be addressed.`;

    return [
      "# Identity",
      "You are Zero, RoundZero's senior AI interviewer. You behave like a thoughtful, experienced human hiring manager conducting a structured 1:1 screening interview. You are warm, professional, attentive, and direct. You are NOT a chatbot, a survey form, or a robot.",
      "",
      "# Mission",
      `Conduct a real, structured screening interview with ${candidateName} for the ${ctx.jobTitle} role at ${ctx.companyName}. Your two jobs are:`,
      `  (1) Cover every company-supplied question, in order, getting a clear answer to each one. These are screening questions the company needs answers to (e.g. salary expectations, notice period, work authorization, visa sponsorship, relocation, motivation, role-specific deep-dives). They are NON-NEGOTIABLE.`,
      `  (1) Cover company-supplied questions with clear answers whenever possible. If the candidate asks to end the interview, withdraws, or declines to continue, user intent wins immediately and you should close the interview without asking more questions.`,
      `  (2) Probe for real signal on depth of experience, problem solving, judgment, and role fit, beyond the script.`,
      "",
      "# Output rules (CRITICAL — break these and the interview fails)",
      "- Speak ONLY in plain natural English prose, like a human in a Zoom interview.",
      "- NEVER output JSON, code blocks, XML, markdown headers, bullet lists, or tool-call syntax in your visible reply.",
      "- Avoid using em dashes. Prefer commas or periods. Use clear, grammatically correct sentences.",
      "- NEVER say 'tool', 'function', 'evaluate_answer', 'check_resume_gap', or 'end_interview' out loud. Tools are silent. The candidate must never see them.",
      "- One question per turn. Briefly acknowledge the candidate's previous answer in one sentence, then ask the next question.",
      "- Keep each turn under ~80 words. Conversational, not formal. No HR boilerplate.",
      "",
      "# Conversational style",
      "- Reference specific details from their resume and the role when probing — show that you read it.",
      "- React to what they actually said. If they mention a project, dig into it. If they're vague, push for a concrete example, a number, a person, or a tradeoff.",
      "- Vary your transitions. Do not start every message with 'Great' or 'Thanks'.",
      "- Probe tradeoffs and judgment, not just facts. Ask 'why', 'what would you do differently', 'what was the constraint that forced that choice'.",
      "- If they make a claim that doesn't appear in their resume / profile context, silently call check_resume_gap before deciding whether to challenge it.",
      "",
      "# Required coverage of company-supplied questions",
      "These are the questions the company explicitly asked us to put to every candidate. Cover as many as you reasonably can, in roughly the order given. You may rephrase them to sound natural and combine two if they're closely related.",
      "Treat short factual screening questions (salary, notice period, visa, relocation, etc.) as quick conversational asks — get the answer, briefly acknowledge, and move on. Do NOT spend multiple turns drilling into them unless the answer is unclear or potentially a dealbreaker.",
      "Treat role-specific company-supplied questions (e.g. 'walk me through a system you designed') as substantive probing questions — push for depth.",
      "If the candidate gives a vague or non-answer to a screening question, ask once for clarification, then accept their answer (or noted refusal) and move on.",
      "After each company-supplied question is resolved, silently call record_screening_coverage with the 1-based questionIndex and status='answered' when answered, or status='skipped' when unresolved.",
      "",
      "Company-supplied questions (REQUIRED COVERAGE, in order):",
      customQs,
      "",
      "# Pacing",
      `- ${lengthGuidance}`,
      "- After each candidate answer, silently call evaluate_answer with relevance/depth/clarity scores (0–100). Then write your next message.",
      "- If the candidate explicitly asks to end or submit now, immediately close warmly in plain prose and silently call end_interview in the same turn. Do not ask any additional questions.",
      "- Otherwise, when you have gathered enough signal, close warmly in plain prose (e.g. 'Thanks, this has been really helpful. I'll share your responses with the team and they'll be in touch with next steps. Best of luck.') and silently call end_interview with a one-sentence reason.",
      "",
      "# Job context",
      `- Title: ${ctx.jobTitle}`,
      `- Company: ${ctx.companyName}`,
      "- Description:",
      ctx.jobDescription || "  (not provided)",
      "- Requirements:",
      reqs,
      "",
      "# Candidate snapshot",
      `- Name: ${candidateName}`,
      "- Resume / profile:",
      ctx.candidateSummary || "  (not provided)",
      "",
      "# Pre-evaluation signal (private context — DO NOT quote or reveal to the candidate)",
      `- Fit score: ${score}`,
      "- Missing requirements to probe (use these to inform your follow-ups, do not read them aloud):",
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

    if (!this.state.interviewId) {
      return;
    }

    if (
      this.state.status === "completed" ||
      this.state.status === "cancelled" ||
      this.state.status === "expired"
    ) {
      return;
    }
  }

  async initializeContext(input: {
    interviewId: string;
    applicationId: string;
    interviewType: "full" | "quick_eval";
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    jobRequirements: string[];
    candidateSummary: string;
    customQuestions: string[];
    preEvaluation: {
      score: number | null;
      missingRequirements: string[];
      consistencyScore: number | null;
    };
  }) {
    // Always re-hydrate from DB so candidate name, latest pre-eval data, and
    // requirements stay in sync with the source of truth, regardless of what
    // the workflow happens to pass in.
    await this.hydrateContextFromDb(input.interviewId);
    return toStateResponse(this.state, toLegacyTranscript(this.messages));
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

    if (this.state.kickoffGeneratedAt) {
      return { greeted: false };
    }

    if (this.messages.some((message) => message.role === "assistant")) {
      this.setState({
        ...this.state,
        kickoffGeneratedAt: this.state.kickoffGeneratedAt ?? toNow(),
        updatedAt: toNow(),
      });
      return { greeted: false };
    }

    const stable = await this.waitUntilStable({ timeout: 10_000 });
    if (!stable) {
      return { greeted: false };
    }

    this.setState({
      ...this.state,
      kickoffGeneratedAt: toNow(),
      updatedAt: toNow(),
    });

    const workersai = createWorkersAI({ binding: this.env.AI });
    const result = await generateText({
      model: workersai(MODEL),
      system: this.buildSystemPrompt(),
      prompt: [
        `Open the interview. Greet ${this.state.context.candidateName || "the candidate"} warmly by name.`,
        "Reference one specific detail from their resume that connects to this role.",
        "Then ask your first focused interview question.",
        "Plain natural English prose only. No JSON, no markdown, no tool calls.",
      ].join(" "),
    });

    const greeting = result.text.trim();
    if (!greeting) {
      this.setState({
        ...this.state,
        kickoffGeneratedAt: null,
        updatedAt: toNow(),
      });
      return { greeted: false };
    }

    await this.waitUntilStable();
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

    return toStateResponse(this.state, toLegacyTranscript(this.messages));
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

    return toStateResponse(this.state, toLegacyTranscript(this.messages));
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
      await updateInterviewStatus(db, {
        id: this.state.interviewId,
        status: "expired",
      });
      return new Response("Interview has expired", { status: 400 });
    }

    if (interview.status === "pending") {
      return new Response("Interview has not been started", { status: 400 });
    }

    if (interview.status === "cancelled") {
      return new Response("Interview is no longer available", { status: 400 });
    }

    if (interview.status === "expired") {
      return new Response("Interview has expired", { status: 400 });
    }

    if (interview.status === "completed") {
      return new Response("Interview already completed", { status: 400 });
    }

    if (this.state.status === "pending") {
      return new Response("Interview has not been started", { status: 400 });
    }

    if (this.state.status === "cancelled" || this.state.status === "expired") {
      return new Response("Interview is no longer available", { status: 400 });
    }

    if (this.state.status === "completed") {
      return new Response("Interview already completed", { status: 400 });
    }

    const workersai = createWorkersAI({ binding: this.env.AI });

    const latestCandidateMessage = [...this.messages]
      .reverse()
      .find((message) => message.role === "user");
    const latestCandidateText = latestCandidateMessage
      ? readUiMessageText(latestCandidateMessage)
      : "";
    const userRequestedEnd =
      /\b(end|finish|submit|stop|done|wrap up|that's all|no more questions)\b/i.test(
        latestCandidateText,
      );

    const systemPrompt = userRequestedEnd
      ? [
          this.buildSystemPrompt(),
          "",
          "# Immediate instruction override",
          "The candidate just explicitly requested to end now. You MUST close immediately, ask no further questions, and call end_interview in this turn.",
        ].join("\n")
      : this.buildSystemPrompt();

    const result = streamText({
      model: workersai(MODEL),
      system: systemPrompt,
      messages: await convertToModelMessages(this.messages),
      onFinish,
      stopWhen: [stepCountIs(3), hasToolCall("end_interview")],
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
            const nextScores = {
              relevance: scores.relevance + relevance,
              depth: scores.depth + depth,
              clarity: scores.clarity + clarity,
              count: nextCount,
            };
            this.setState({
              ...this.state,
              scores: nextScores,
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
            const matched = haystack.includes(claim.toLowerCase());
            return { matched };
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

              await updateInterviewStatus(db, {
                id: this.state.interviewId,
                status: "completed",
              });
            }

            if (!this.state.postEvaluationTriggered) {
              try {
                await this.runWorkflow("POST_EVALUATION", {
                  interviewId: this.state.interviewId,
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

  protected override sanitizeMessageForPersistence(message: UIMessage): UIMessage {
    const sanitized = super.sanitizeMessageForPersistence(message);
    if (!Array.isArray(sanitized.parts)) {
      return sanitized;
    }

    return {
      ...sanitized,
      parts: sanitized.parts
        .map((part) => {
          if (part.type === "text" && typeof part.text === "string") {
            return {
              ...part,
              text: sanitizeVisibleText(part.text),
            };
          }

          return part;
        })
        .filter((part) => {
          if (part.type === "text") {
            return part.text.trim().length > 0;
          }

          return true;
        }),
    };
  }
}

const toStateResponse = (
  state: InterviewAgentState,
  messages: LegacyInterviewMessage[],
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
