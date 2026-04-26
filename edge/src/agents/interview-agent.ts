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

const stripToolLeakText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) {
    return value;
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
    return value;
  }

  return value;
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

  private buildSystemPrompt(): string {
    const ctx = this.state.context;
    const reqs = ctx.jobRequirements.length > 0 ? ctx.jobRequirements.join("\n- ") : "Not provided";
    const customQs =
      ctx.customQuestions.length > 0
        ? ctx.customQuestions.map((q, i) => `  ${i + 1}. ${q}`).join("\n")
        : "  (none — interviewer's discretion)";
    const missing =
      ctx.preEvaluation.missingRequirements.length > 0
        ? ctx.preEvaluation.missingRequirements.join(", ")
        : "none flagged";
    const score = ctx.preEvaluation.score == null ? "n/a" : `${ctx.preEvaluation.score}/100`;
    const candidateName = ctx.candidateName || "the candidate";
    const interviewLength =
      ctx.type === "quick_eval"
        ? "This is a SHORT clarifying session. Aim for 2–3 sharp questions and end the interview."
        : `This is a FULL interview. Aim for ${this.state.maxQuestions} substantive questions before ending.`;

    return [
      "# Identity",
      "You are Zero, RoundZero's senior AI interviewer. You sound like a thoughtful, warm human hiring manager — not a chatbot, not a survey, not a robot.",
      "",
      "# Mission",
      `Conduct a real interview with ${candidateName} for the ${ctx.jobTitle} role at ${ctx.companyName}. Probe for genuine signal: depth of experience, problem solving, judgment, and fit.`,
      "",
      "# Output rules (CRITICAL — break these and the interview fails)",
      "- Speak ONLY in plain natural English prose.",
      "- NEVER output JSON, code blocks, XML, markdown headers, bullet lists, or tool-call syntax in your visible reply.",
      "- Avoid using em dashes; prefer commas or periods. Maintain clear, grammatically correct sentences.",
      "- NEVER say 'tool', 'function', 'evaluate_answer', 'check_resume_gap', or 'end_interview' in the visible reply. Tools are silent — the user must never see them.",
      "- One question per turn. Acknowledge the candidate's previous answer in 1 sentence, then ask the next question.",
      "- Keep each turn under ~80 words. Conversational, not formal.",
      "",
      "# Conversational style",
      "- Reference specific details from their resume and the role in every question.",
      "- React to what they actually said. If they mention a project, dig into it. If they're vague, push for a concrete example.",
      "- Vary phrasing. Don't start every message with 'Great' or 'Thanks'.",
      "- Probe tradeoffs, not just facts. Ask 'why' and 'what would you do differently'.",
      "- If a claim doesn't appear in their resume context, silently call check_resume_gap before challenging it.",
      "",
      "# Pacing",
      `- ${interviewLength}`,
      "- After each candidate answer, silently call evaluate_answer with relevance/depth/clarity scores (0–100). Then write your next message.",
      "- Once you have enough signal (or you hit the question target), close warmly in plain prose ('This has been great — I'll send your responses to the team. Best of luck.') and silently call end_interview with a one-sentence reason.",
      "",
      "# Job context",
      `- Title: ${ctx.jobTitle}`,
      `- Company: ${ctx.companyName}`,
      `- Description:\n${ctx.jobDescription || "(not provided)"}`,
      `- Requirements:\n- ${reqs}`,
      "",
      "# Company-supplied questions to weave in naturally",
      customQs,
      "",
      "# Candidate snapshot",
      `- Name: ${candidateName}`,
      `- Resume / profile:\n${ctx.candidateSummary || "(not provided)"}`,
      "",
      "# Pre-evaluation signal (private context — do not quote)",
      `- Fit score: ${score}`,
      `- Missing requirements to probe: ${missing}`,
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
    });

    await this.schedule(48 * 60 * 60, "expireInterview", undefined, { idempotent: true });
    return true;
  }

  async onStart() {
    if (!this.state.interviewId && this.name) {
      await this.hydrateContextFromDb(this.name);
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

    await this.schedule(48 * 60 * 60, "expireInterview", undefined, { idempotent: true });
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
  async markStarted(): Promise<{ started: boolean }> {
    if (!this.state.interviewId && this.name) {
      await this.hydrateContextFromDb(this.name);
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
  async kickoff(): Promise<{ greeted: boolean }> {
    if (!this.state.interviewId && this.name) {
      await this.hydrateContextFromDb(this.name);
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
  async getInterviewState(): Promise<InterviewStateResponse> {
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

  async expireInterview() {
    if (
      this.state.status === "completed" ||
      this.state.status === "cancelled" ||
      this.state.status === "expired"
    ) {
      return;
    }

    this.setState({
      ...this.state,
      status: "expired",
      updatedAt: toNow(),
    });

    const db = getDb();
    await updateInterviewStatus(db, {
      id: this.state.interviewId,
      status: "expired",
    });
  }

  async onChatMessage(onFinish: StreamTextOnFinishCallback<ToolSet>) {
    if (this.name) {
      await this.hydrateContextFromDb(this.name);
    }

    if (!this.state.interviewId) {
      return new Response("Interview session not initialized", { status: 400 });
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

    const result = streamText({
      model: workersai(MODEL),
      system: this.buildSystemPrompt(),
      messages: await convertToModelMessages(this.messages),
      onFinish,
      stopWhen: [stepCountIs(6), hasToolCall("end_interview")],
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

              const db = getDb();
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
              text: stripToolLeakText(part.text),
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
