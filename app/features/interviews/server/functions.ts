import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  getApplicationById,
  updateApplicationStatus,
} from "@/features/applications/queries/queries_sql";
import {
  completeInterview,
  getInterviewByApplicationId,
  getInterviewForCandidateById,
  updateInterviewStatus,
} from "@/features/interviews/queries/queries_sql";
import { getDb } from "@/shared/db";
import { serverEnv } from "@/shared/env.server";
import { authMiddleware } from "@/shared/middleware";

const interviewIdSchema = z.object({
  interviewId: z.string().uuid(),
});

const interviewMessageSchema = z.object({
  interviewId: z.string().uuid(),
  content: z.string().trim().min(1),
});

type InterviewAgentMessage = {
  role: "assistant" | "candidate";
  content: string;
  createdAt: string;
};

type InterviewAgentSession = {
  interviewId: string;
  applicationId: string;
  type: "full" | "quick_eval";
  jobTitle: string;
  companyName: string;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "expired";
  maxQuestions: number;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  updatedAt: string;
};

type InterviewAgentState = {
  session: InterviewAgentSession;
  messages: InterviewAgentMessage[];
};

const postInterviewAgent = async <TBody extends object>(
  interviewId: string,
  path: string,
  body: TBody,
  candidateId: string,
): Promise<InterviewAgentState> => {
  const response = await fetch(`${serverEnv.EDGE_WORKER_URL}/interviews/${interviewId}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverEnv.EDGE_WORKER_SECRET}`,
    },
    body: JSON.stringify({ ...body, candidateId }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Interview agent request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as InterviewAgentState;
};

const ensureInterviewAgentContext = async (interviewId: string, candidateId: string) => {
  const response = await fetch(
    `${serverEnv.EDGE_WORKER_URL}/interviews/${interviewId}/refresh-context`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverEnv.EDGE_WORKER_SECRET}`,
      },
      body: JSON.stringify({ candidateId }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Interview context refresh failed (${response.status}): ${text}`);
  }
};

export const getMyInterview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view interviews");
    }

    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });

    return interview;
  });

export const getMyInterviewState = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewIdSchema))
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

    return await postInterviewAgent(data.interviewId, "/state", {}, context.userId);
  });

export const startMyInterview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewIdSchema))
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

    await ensureInterviewAgentContext(data.interviewId, context.userId);

    if (interview.status === "completed") {
      return interview;
    }

    if (interview.status === "cancelled" || interview.status === "expired") {
      throw new Error("Interview is no longer available");
    }

    const updated = await updateInterviewStatus(db, {
      id: data.interviewId,
      status: "in_progress",
    });
    if (!updated) {
      return null;
    }

    await updateApplicationStatus(db, {
      id: interview.applicationId,
      status: "interview_in_progress",
    });

    await postInterviewAgent(data.interviewId, "/start", {}, context.userId);

    return updated;
  });

export const submitInterviewMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewMessageSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can message interviews");
    }

    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
    if (!interview) {
      return null;
    }

    if (interview.status === "cancelled" || interview.status === "expired") {
      throw new Error("Interview is no longer available");
    }

    if (interview.status === "pending") {
      await ensureInterviewAgentContext(data.interviewId, context.userId);

      await updateInterviewStatus(db, {
        id: data.interviewId,
        status: "in_progress",
      });
      await updateApplicationStatus(db, {
        id: interview.applicationId,
        status: "interview_in_progress",
      });
      await postInterviewAgent(data.interviewId, "/start", {}, context.userId);
    }

    return await postInterviewAgent(
      data.interviewId,
      "/messages",
      { content: data.content },
      context.userId,
    );
  });

export const cancelMyInterview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewIdSchema))
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

    if (interview.status === "completed") {
      throw new Error("Completed interviews cannot be cancelled");
    }

    if (interview.status === "cancelled" || interview.status === "expired") {
      return interview;
    }

    const updated = await updateInterviewStatus(db, {
      id: data.interviewId,
      status: "cancelled",
    });
    if (!updated) {
      return null;
    }

    await updateApplicationStatus(db, {
      id: interview.applicationId,
      status: "withdrawn",
    });

    await postInterviewAgent(data.interviewId, "/cancel", {}, context.userId);

    return updated;
  });

export const completeMyInterview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewIdSchema))
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

    if (interview.status === "completed") {
      return interview;
    }

    if (interview.status === "cancelled" || interview.status === "expired") {
      throw new Error("Interview is no longer available");
    }

    const updated = await completeInterview(db, { id: data.interviewId });
    if (!updated) {
      return null;
    }

    await updateApplicationStatus(db, {
      id: interview.applicationId,
      status: "evaluated",
    });

    try {
      await postInterviewAgent(data.interviewId, "/complete", {}, context.userId);
    } catch {
      console.error(`Failed to sync interview completion for ${data.interviewId}`);
    }

    try {
      const response = await fetch(`${serverEnv.EDGE_WORKER_URL}/post-evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serverEnv.EDGE_WORKER_SECRET}`,
        },
        body: JSON.stringify({ interviewId: data.interviewId }),
      });

      if (!response.ok) {
        console.error(
          `Failed to trigger report generation for ${data.interviewId}: ${response.status}`,
        );
      }
    } catch {
      console.error(`Failed to trigger report generation for ${data.interviewId}`);
    }

    return updated;
  });

export const getInterviewForApplication = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
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

    const application = await getApplicationById(db, { id: data.applicationId });
    if (!application) {
      return null;
    }

    if (application.candidateId !== context.userId) {
      throw new Error("Not authorized to view this interview");
    }

    const interview = await getInterviewByApplicationId(db, { applicationId: data.applicationId });
    if (!interview) {
      return null;
    }

    return interview;
  });
