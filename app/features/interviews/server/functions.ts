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
  getInterviewsByCandidate,
  updateInterviewStatus,
} from "@/features/interviews/queries/queries_sql";
import { getDb } from "@/shared/db";
import { serverEnv } from "@/shared/env.server";
import { authMiddleware } from "@/shared/middleware";

const interviewIdSchema = z.object({
  interviewId: z.string().uuid(),
});

export const getMyInterview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view interviews");
    }

    return await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
  });

export const getMyInterviews = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view interviews");
    }

    return await getInterviewsByCandidate(db, {
      candidateId: context.userId,
    });
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

    try {
      await fetch(`${serverEnv.EDGE_WORKER_URL}/internal/interviews/${data.interviewId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serverEnv.EDGE_WORKER_SECRET}`,
        },
      });
    } catch (error) {
      console.error(
        `[startMyInterview] Failed to sync agent start state for ${data.interviewId}`,
        error,
      );
    }

    return updated;
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

    return await getInterviewByApplicationId(db, {
      applicationId: data.applicationId,
    });
  });
