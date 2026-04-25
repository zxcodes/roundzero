import { DurableObject } from "cloudflare:workers";

type InterviewSessionStatus = "pending" | "in_progress" | "completed" | "cancelled" | "expired";

type InterviewSession = {
  interviewId: string;
  applicationId: string;
  type: "full" | "quick_eval";
  jobTitle: string;
  companyName: string;
  status: InterviewSessionStatus;
  maxQuestions: number;
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

const toNow = () => new Date().toISOString();

const createFirstQuestion = (session: InterviewSession) => {
  if (session.type === "quick_eval") {
    return `Hi, I am Zero. In 2-3 questions, I will quickly evaluate your fit for ${session.jobTitle}. First: what is the most relevant result you delivered recently for this kind of role?`;
  }

  return `Hi, I am Zero. We will run a focused interview for ${session.jobTitle}. First question: walk me through your most relevant project and your specific ownership.`;
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

  private async respondState(status = 200) {
    const session = await this.getSession();
    if (!session) {
      return Response.json({ error: "Interview session not initialized" }, { status: 404 });
    }

    const messages = await this.getMessages();
    return Response.json({ session, messages }, { status });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/init") {
      const payload = (await request.json()) as {
        interviewId: string;
        applicationId: string;
        interviewType: "full" | "quick_eval";
        jobTitle: string;
        companyName: string;
      };

      const existing = await this.getSession();
      if (existing) {
        return await this.respondState();
      }

      const session: InterviewSession = {
        interviewId: payload.interviewId,
        applicationId: payload.applicationId,
        type: payload.interviewType,
        jobTitle: payload.jobTitle,
        companyName: payload.companyName,
        status: "pending",
        maxQuestions: payload.interviewType === "quick_eval" ? 3 : 5,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        updatedAt: toNow(),
      };

      await this.setSession(session);
      await this.setMessages([]);
      return await this.respondState(201);
    }

    if (request.method === "GET" && url.pathname === "/state") {
      return await this.respondState();
    }

    if (request.method === "POST" && url.pathname === "/start") {
      const session = await this.getSession();
      if (!session) {
        return Response.json({ error: "Interview session not initialized" }, { status: 404 });
      }

      if (session.status === "cancelled" || session.status === "expired") {
        return Response.json({ error: "Interview is no longer available" }, { status: 409 });
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
          content: createFirstQuestion(session),
          createdAt: toNow(),
        });
        await this.setMessages(messages);
      }

      return await this.respondState();
    }

    if (request.method === "POST" && url.pathname === "/message") {
      const session = await this.getSession();
      if (!session) {
        return Response.json({ error: "Interview session not initialized" }, { status: 404 });
      }

      if (session.status !== "in_progress") {
        return Response.json({ error: "Interview is not in progress" }, { status: 409 });
      }

      const payload = (await request.json()) as { content: string };
      const content = typeof payload.content === "string" ? payload.content.trim() : "";
      if (!content) {
        return Response.json({ error: "Message content is required" }, { status: 400 });
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
        messages.push({
          role: "assistant",
          content: createFollowUpQuestion(session, answerCount),
          createdAt: toNow(),
        });
        session.updatedAt = toNow();
      }

      await this.setSession(session);
      await this.setMessages(messages);
      return await this.respondState();
    }

    if (request.method === "POST" && url.pathname === "/complete") {
      const session = await this.getSession();
      if (!session) {
        return Response.json({ error: "Interview session not initialized" }, { status: 404 });
      }

      if (session.status !== "completed") {
        session.status = "completed";
        session.completedAt = session.completedAt ?? toNow();
        session.updatedAt = toNow();
        await this.setSession(session);
      }

      return await this.respondState();
    }

    if (request.method === "POST" && url.pathname === "/cancel") {
      const session = await this.getSession();
      if (!session) {
        return Response.json({ error: "Interview session not initialized" }, { status: 404 });
      }

      if (session.status === "completed") {
        return Response.json(
          { error: "Completed interviews cannot be cancelled" },
          { status: 409 },
        );
      }

      if (session.status !== "cancelled") {
        session.status = "cancelled";
        session.cancelledAt = toNow();
        session.updatedAt = toNow();
        await this.setSession(session);
      }

      return await this.respondState();
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
