import { DurableObject } from "cloudflare:workers";

type InterviewSessionStatus = "pending" | "in_progress" | "completed" | "cancelled" | "expired";

type InterviewSession = {
  interviewId: string;
  applicationId: string;
  type: "full" | "quick_eval";
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
  status: InterviewSessionStatus;
  maxQuestions: number;
  askedQuestions: number;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  updatedAt: string;
};

type InterviewMessage = {
  role: "assistant" | "candidate";
  content: string;
  createdAt: string;
};

const SESSION_KEY = "session";
const MESSAGES_KEY = "messages";
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const toNow = () => new Date().toISOString();

const createFirstQuestion = (session: InterviewSession) => {
  if (session.type === "quick_eval") {
    return `Hi, I am Zero. In 2-3 questions, I will quickly evaluate your fit for ${session.jobTitle}. First: what is the most relevant result you delivered recently for this kind of role?`;
  }

  return `Hi, I am Zero. We will run a focused interview for ${session.jobTitle}. First question: walk me through your most relevant project and your specific ownership.`;
};

const createGreeting = (session: InterviewSession) => {
  return `Hi, I am Zero. Thanks for joining this interview for ${session.jobTitle} at ${session.companyName}. I will ask focused questions and keep this concise.`;
};

const createFollowUpQuestion = (session: InterviewSession, answeredCount: number) => {
  const questionNumber = answeredCount + 1;
  if (session.type === "quick_eval") {
    if (questionNumber === 2) {
      return "What was the hardest trade-off in that work, and how did you decide?";
    }
    return "Last question: if you joined this role next week, what would your 30-day plan be?";
  }

  if (questionNumber === 2) {
    return "Describe a difficult decision you made under ambiguity. What alternatives did you consider?";
  }
  if (questionNumber === 3) {
    return "Tell me about a failure or miss. What changed in your approach afterward?";
  }
  if (questionNumber === 4) {
    return "How do you prioritize when multiple stakeholders want different outcomes?";
  }
  return "Final question: what kind of team environment helps you do your best work, and why?";
};

const FOLLOW_UP_SCHEMA = {
  type: "object",
  properties: {
    question: { type: "string" },
  },
  required: ["question"],
} as const;

const getResponsePayload = (response: unknown): { response: unknown } => {
  if (typeof response !== "object" || response === null) {
    throw new Error(`AI response is not an object: ${typeof response}`);
  }

  if ("response" in response) {
    return response as { response: unknown };
  }

  return { response };
};

const parseQuestionPayload = (payload: unknown): string | null => {
  if (typeof payload === "object" && payload !== null) {
    const question = (payload as { question?: unknown }).question;
    if (typeof question === "string" && question.trim()) {
      return question.trim();
    }
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    try {
      const parsed = JSON.parse(trimmed) as { question?: unknown };
      if (typeof parsed.question === "string" && parsed.question.trim()) {
        return parsed.question.trim();
      }
    } catch {
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return null;
};

const hasContext = (session: InterviewSession) => {
  if (!session.jobDescription.trim()) {
    return false;
  }

  if (!session.candidateSummary.trim()) {
    return false;
  }

  if (session.jobRequirements.length === 0 && session.customQuestions.length === 0) {
    return false;
  }

  return true;
};

const cleanStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export class InterviewAgent extends DurableObject<Env> {
  private async getSession() {
    const session = await this.ctx.storage.get<InterviewSession>(SESSION_KEY);
    return session ?? null;
  }

  private async getMessages() {
    const messages = await this.ctx.storage.get<InterviewMessage[]>(MESSAGES_KEY);
    return messages ?? [];
  }

  private async setSession(session: InterviewSession) {
    await this.ctx.storage.put(SESSION_KEY, session);
  }

  private async setMessages(messages: InterviewMessage[]) {
    await this.ctx.storage.put(MESSAGES_KEY, messages);
  }

  private async generateDynamicQuestion(session: InterviewSession, messages: InterviewMessage[]) {
    const transcript = messages.map((message) => `${message.role}: ${message.content}`).join("\n");

    const response = await this.env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content: [
            "You are Zero, an interview agent.",
            "Ask exactly one concise interview question.",
            "Do not repeat prior questions.",
            "Focus on role-fit evidence and decision quality.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Role: ${session.jobTitle}`,
            `Company: ${session.companyName}`,
            `Interview type: ${session.type}`,
            `Job description: ${session.jobDescription}`,
            `Job requirements: ${session.jobRequirements.join(" | ") || "Not provided"}`,
            `Candidate summary: ${session.candidateSummary || "Not provided"}`,
            `Pre-evaluation score: ${session.preEvaluation.score ?? "unknown"}`,
            `Missing requirements: ${session.preEvaluation.missingRequirements.join(" | ") || "none"}`,
            `Consistency score: ${session.preEvaluation.consistencyScore ?? "unknown"}`,
            `Question index: ${session.askedQuestions + 1} of ${session.maxQuestions}`,
            `Transcript so far:\n${transcript || "(empty)"}`,
          ].join("\n\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "interview_follow_up",
          schema: FOLLOW_UP_SCHEMA,
        },
      },
    });

    const payload = getResponsePayload(response);
    const question = parseQuestionPayload(payload.response);
    if (!question) {
      return null;
    }

    return question;
  }

  private async nextQuestion(session: InterviewSession, messages: InterviewMessage[]) {
    const customQuestion = session.customQuestions[session.askedQuestions];
    if (customQuestion) {
      return customQuestion;
    }

    try {
      const dynamicQuestion = await this.generateDynamicQuestion(session, messages);
      if (dynamicQuestion) {
        return dynamicQuestion;
      }
    } catch {
      // fallback below
    }

    if (session.askedQuestions === 0) {
      return createFirstQuestion(session);
    }

    return createFollowUpQuestion(session, session.askedQuestions);
  }

  async init(payload: {
    interviewId: string;
    applicationId: string;
    interviewType: "full" | "quick_eval";
    jobTitle: string;
    companyName: string;
    jobDescription?: string;
    jobRequirements?: string[];
    candidateSummary?: string;
    customQuestions?: string[];
    preEvaluation?: {
      score?: number | null;
      missingRequirements?: string[];
      consistencyScore?: number | null;
    };
  }) {
    const existing = await this.getSession();
    if (existing) {
      existing.jobDescription = existing.jobDescription ?? "";
      existing.jobRequirements = cleanStringArray(existing.jobRequirements);
      existing.candidateSummary = existing.candidateSummary ?? "";
      existing.customQuestions = cleanStringArray(existing.customQuestions);
      existing.preEvaluation = existing.preEvaluation ?? {
        score: null,
        missingRequirements: [],
        consistencyScore: null,
      };
      existing.preEvaluation.missingRequirements = cleanStringArray(
        existing.preEvaluation.missingRequirements,
      );
      existing.askedQuestions =
        typeof existing.askedQuestions === "number" ? existing.askedQuestions : 0;

      existing.jobTitle = payload.jobTitle;
      existing.companyName = payload.companyName;
      if (typeof payload.jobDescription === "string" && payload.jobDescription.trim()) {
        existing.jobDescription = payload.jobDescription;
      }

      const payloadRequirements = cleanStringArray(payload.jobRequirements);
      if (payloadRequirements.length > 0) {
        existing.jobRequirements = payloadRequirements;
      }

      if (typeof payload.candidateSummary === "string" && payload.candidateSummary.trim()) {
        existing.candidateSummary = payload.candidateSummary;
      }

      const payloadCustomQuestions = cleanStringArray(payload.customQuestions);
      if (payloadCustomQuestions.length > 0) {
        existing.customQuestions = payloadCustomQuestions;
      }

      existing.preEvaluation = {
        score:
          typeof payload.preEvaluation?.score === "number"
            ? payload.preEvaluation.score
            : existing.preEvaluation.score,
        missingRequirements:
          cleanStringArray(payload.preEvaluation?.missingRequirements).length > 0
            ? cleanStringArray(payload.preEvaluation?.missingRequirements)
            : existing.preEvaluation.missingRequirements,
        consistencyScore:
          typeof payload.preEvaluation?.consistencyScore === "number"
            ? payload.preEvaluation.consistencyScore
            : existing.preEvaluation.consistencyScore,
      };
      existing.updatedAt = toNow();
      await this.setSession(existing);
      const messages = await this.getMessages();
      return { session: existing, messages };
    }

    const session: InterviewSession = {
      interviewId: payload.interviewId,
      applicationId: payload.applicationId,
      type: payload.interviewType,
      jobTitle: payload.jobTitle,
      companyName: payload.companyName,
      jobDescription: payload.jobDescription ?? "",
      jobRequirements: Array.isArray(payload.jobRequirements)
        ? payload.jobRequirements.filter((requirement) => typeof requirement === "string")
        : [],
      candidateSummary: payload.candidateSummary ?? "",
      customQuestions: Array.isArray(payload.customQuestions)
        ? payload.customQuestions.filter((question) => typeof question === "string")
        : [],
      preEvaluation: {
        score:
          typeof payload.preEvaluation?.score === "number" ? payload.preEvaluation.score : null,
        missingRequirements: Array.isArray(payload.preEvaluation?.missingRequirements)
          ? payload.preEvaluation.missingRequirements.filter(
              (requirement) => typeof requirement === "string",
            )
          : [],
        consistencyScore:
          typeof payload.preEvaluation?.consistencyScore === "number"
            ? payload.preEvaluation.consistencyScore
            : null,
      },
      status: "pending",
      maxQuestions: payload.interviewType === "quick_eval" ? 3 : 5,
      askedQuestions: 0,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      updatedAt: toNow(),
    };

    await this.setSession(session);
    await this.setMessages([]);
    return { session, messages: [] };
  }

  async state() {
    const session = await this.getSession();
    if (!session) {
      throw new Error("Interview session not initialized");
    }

    const messages = await this.getMessages();
    return { session, messages };
  }

  async start() {
    const session = await this.getSession();
    if (!session) {
      throw new Error("Interview session not initialized");
    }

    if (session.status === "cancelled" || session.status === "expired") {
      throw new Error("Interview is no longer available");
    }

    if (!hasContext(session)) {
      throw new Error(
        "Interview context is incomplete. Refresh context before starting the interview.",
      );
    }

    if (session.status !== "in_progress") {
      session.status = "in_progress";
      session.startedAt = session.startedAt ?? toNow();
      session.updatedAt = toNow();
      await this.setSession(session);
    }

    const messages = await this.getMessages();
    if (messages.length === 0) {
      messages.push({
        role: "assistant",
        content: createGreeting(session),
        createdAt: toNow(),
      });

      const question = await this.nextQuestion(session, messages);
      messages.push({
        role: "assistant",
        content: question,
        createdAt: toNow(),
      });
      session.askedQuestions += 1;
      session.updatedAt = toNow();
      await this.setSession(session);
      await this.setMessages(messages);
    }

    return { session, messages };
  }

  async message(payload: { content: string }) {
    const session = await this.getSession();
    if (!session) {
      throw new Error("Interview session not initialized");
    }

    if (session.status !== "in_progress") {
      throw new Error("Interview is not in progress");
    }

    if (!hasContext(session)) {
      throw new Error("Interview context is incomplete. Refresh context before sending messages.");
    }

    const content = typeof payload.content === "string" ? payload.content.trim() : "";
    if (!content) {
      throw new Error("Message content is required");
    }

    const messages = await this.getMessages();
    messages.push({ role: "candidate", content, createdAt: toNow() });

    const answerCount = messages.filter((message) => message.role === "candidate").length;
    if (answerCount >= session.maxQuestions) {
      session.status = "completed";
      session.completedAt = toNow();
      session.updatedAt = toNow();
      messages.push({
        role: "assistant",
        content:
          "Thanks. Your interview responses are captured. Zero is compiling your evaluation.",
        createdAt: toNow(),
      });
    } else {
      const question = await this.nextQuestion(session, messages);
      messages.push({
        role: "assistant",
        content: question,
        createdAt: toNow(),
      });
      session.askedQuestions += 1;
      session.updatedAt = toNow();
    }

    await this.setSession(session);
    await this.setMessages(messages);
    return { session, messages };
  }

  async complete() {
    const session = await this.getSession();
    if (!session) {
      throw new Error("Interview session not initialized");
    }

    if (session.status !== "completed") {
      session.status = "completed";
      session.completedAt = session.completedAt ?? toNow();
      session.updatedAt = toNow();
      await this.setSession(session);
    }

    const messages = await this.getMessages();
    return { session, messages };
  }

  async cancel() {
    const session = await this.getSession();
    if (!session) {
      throw new Error("Interview session not initialized");
    }

    if (session.status === "completed") {
      throw new Error("Completed interviews cannot be cancelled");
    }

    if (session.status !== "cancelled") {
      session.status = "cancelled";
      session.cancelledAt = toNow();
      session.updatedAt = toNow();
      await this.setSession(session);
    }

    const messages = await this.getMessages();
    return { session, messages };
  }
}
