import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  getApplicationById,
  updateApplicationStatus,
} from "@/features/applications/queries/queries_sql";
import {
  cancelInterview,
  completeInterview,
  expireInterview,
  getInterviewByApplicationId,
  getInterviewForCandidateById,
  getInterviewsByCandidate,
  updateInterviewStatus,
} from "@/features/interviews/queries/queries_sql";
import { shouldAutoExpireInterview } from "@/features/interviews/shared/expiry";
import { getReportByApplicationId } from "@/features/reports/queries/queries_sql";
import { getDb } from "@/shared/db";
import { markInterviewAgentStarted } from "@/shared/interview-agent-client";
import { authMiddleware } from "@/shared/middleware";

const interviewIdSchema = z.object({
  interviewId: z.string().uuid(),
});

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

  await expireInterview(input.db, { id: input.interview.id });

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
      return expired.interview;
    }

    return interview;
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
      return effectiveInterview;
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

    return {
      ...updated,
      candidateId: effectiveInterview.candidateId,
    };
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
      return effectiveInterview;
    }

    if (effectiveInterview.status === "completed") {
      throw new Error("Completed interviews cannot be cancelled");
    }

    if (effectiveInterview.status === "cancelled") {
      return effectiveInterview;
    }

    const updated = await cancelInterview(db, {
      id: data.interviewId,
      cancellationReason: "Candidate cancelled via dashboard",
    });

    if (!updated) {
      return null;
    }

    await updateApplicationStatus(db, {
      id: effectiveInterview.applicationId,
      status: "withdrawn",
    });

    return {
      ...updated,
      candidateId: effectiveInterview.candidateId,
    };
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
      return effectiveInterview;
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

    return {
      ...updated,
      candidateId: effectiveInterview.candidateId,
    };
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
