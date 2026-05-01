import { env } from "cloudflare:workers";
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
import { shouldAutoExpireInterview } from "@/features/interviews/shared/expiry";
import { getReportByApplicationId } from "@/features/reports/queries/queries_sql";
import { getDb } from "@/shared/db";
import { serverEnv } from "@/shared/env.server";
import { markInterviewAgentStarted } from "@/shared/interview-agent-client";
import { createInterviewAgentAccessToken } from "@/shared/interview-agent-token";
import { authMiddleware } from "@/shared/middleware";

const interviewIdSchema = z.object({
  interviewId: z.string().uuid(),
});

const withAgentToken = async <T extends { id: string; candidateId: string }>(interview: T) => {
  const token = await createInterviewAgentAccessToken({
    interviewId: interview.id,
    candidateId: interview.candidateId,
    secret: serverEnv.EDGE_WORKER_SECRET,
  });

  return {
    ...interview,
    agentToken: token,
  };
};

type ExpirableInterview = {
  id: string;
  applicationId: string;
  status: string;
  metadata: unknown;
  candidateId: string;
  jobId: string;
  jobTitle: string;
};

const expireInterviewIfNeeded = async <T extends ExpirableInterview>(input: {
  db: ReturnType<typeof getDb>;
  interview: T;
}) => {
  if (!shouldAutoExpireInterview(input.interview.status, input.interview.metadata)) {
    return { interview: input.interview, expiredNow: false };
  }

  await updateInterviewStatus(input.db, {
    id: input.interview.id,
    status: "expired",
  });

  return {
    interview: { ...input.interview, status: "expired" as const },
    expiredNow: true,
  };
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

    if (!interview) {
      return null;
    }

    const expired = await expireInterviewIfNeeded({ db, interview });
    if (expired.expiredNow) {
      return await withAgentToken(expired.interview);
    }

    return await withAgentToken(interview);
  });

export const getMyInterviews = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view interviews");
    }

    const interviews = await getInterviewsByCandidate(db, {
      candidateId: context.userId,
    });

    return await Promise.all(
      interviews.map(async (interview) => {
        if (!shouldAutoExpireInterview(interview.status, interview.metadata)) {
          return interview;
        }

        const expired = await expireInterviewIfNeeded({
          db,
          interview,
        });
        return expired.interview;
      }),
    );
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

    const expired = await expireInterviewIfNeeded({ db, interview });
    const effectiveInterview = expired.interview;

    if (effectiveInterview.status === "expired") {
      throw new Error("Interview has expired");
    }

    if (effectiveInterview.status === "completed") {
      return await withAgentToken(effectiveInterview);
    }

    if (effectiveInterview.status === "cancelled") {
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
      id: effectiveInterview.applicationId,
      status: "interview_in_progress",
    });

    try {
      await markInterviewAgentStarted(env, data.interviewId);
    } catch (error) {
      console.error(
        `[startMyInterview] Failed to sync agent start state for ${data.interviewId}`,
        error,
      );
    }

    return await withAgentToken({
      ...updated,
      candidateId: effectiveInterview.candidateId,
    });
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

    const expired = await expireInterviewIfNeeded({ db, interview });
    const effectiveInterview = expired.interview;

    if (effectiveInterview.status === "expired") {
      return await withAgentToken(effectiveInterview);
    }

    if (effectiveInterview.status === "completed") {
      throw new Error("Completed interviews cannot be cancelled");
    }

    if (effectiveInterview.status === "cancelled") {
      return await withAgentToken(effectiveInterview);
    }

    const updated = await updateInterviewStatus(db, {
      id: data.interviewId,
      status: "cancelled",
    });

    if (!updated) {
      return null;
    }

    await updateApplicationStatus(db, {
      id: effectiveInterview.applicationId,
      status: "withdrawn",
    });

    return await withAgentToken({
      ...updated,
      candidateId: effectiveInterview.candidateId,
    });
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

    const expired = await expireInterviewIfNeeded({ db, interview });
    const effectiveInterview = expired.interview;

    if (effectiveInterview.status === "expired") {
      throw new Error("Interview has expired");
    }

    if (effectiveInterview.status === "completed") {
      return await withAgentToken(effectiveInterview);
    }

    if (effectiveInterview.status === "cancelled") {
      throw new Error("Interview is no longer available");
    }

    const updated = await completeInterview(db, { id: data.interviewId });
    if (!updated) {
      return null;
    }

    await updateApplicationStatus(db, {
      id: effectiveInterview.applicationId,
      status: "evaluated",
    });

    const existingReport = await getReportByApplicationId(db, {
      applicationId: effectiveInterview.applicationId,
    });

    if (!existingReport) {
      try {
        await env.POST_EVALUATION.create({ params: { interviewId: data.interviewId } });
      } catch (error) {
        console.error(
          `[completeMyInterview] Failed to trigger post-evaluation for ${data.interviewId}`,
          error,
        );
      }
    }

    return await withAgentToken({
      ...updated,
      candidateId: effectiveInterview.candidateId,
    });
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

    const interview = await getInterviewByApplicationId(db, {
      applicationId: data.applicationId,
    });

    if (!interview) {
      return null;
    }

    const expired = await expireInterviewIfNeeded({
      db,
      interview: {
        ...interview,
        candidateId: context.userId,
        applicationStatus: application.status,
        jobId: application.jobId,
        jobTitle: application.jobTitle,
        companyName: application.companyName,
      },
    });
    if (expired.expiredNow) {
      return expired.interview;
    }

    return interview;
  });
