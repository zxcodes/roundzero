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
  createCommunicationAssessment,
  expireInterview,
  getCommunicationAssessmentByInterviewId,
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
import {
  getVoiceAssessmentTranscript,
  initializeVoiceAssessmentAgent,
  markVoiceAssessmentEndIntent,
  skipVoiceAssessmentAgent,
} from "@/shared/voice-agent-client";

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
      await markInterviewAgentStarted(data.interviewId);
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
        // Pre-create the voice communication assessment row so the post-eval
        // workflow knows to wait for the candidate's optional voice call.
        const existingAssessment = await getCommunicationAssessmentByInterviewId(db, {
          interviewId: data.interviewId,
        });
        if (!existingAssessment) {
          await createCommunicationAssessment(db, {
            interviewId: data.interviewId,
            applicationId: effectiveInterview.applicationId,
            status: "pending",
          });
        }
      } catch (error) {
        console.error(
          `[completeMyInterview] Failed to seed communication assessment row for ${data.interviewId}`,
          error,
        );
      }

      try {
        await env.POST_EVALUATION.create({
          // Stable id so VoiceAssessmentAgent can resolve this workflow later.
          id: data.interviewId,
          params: { interviewId: data.interviewId },
        });
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

export const getMyVoiceAssessment = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view voice assessments");
    }

    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });

    if (!interview) {
      return null;
    }

    const assessment = await getCommunicationAssessmentByInterviewId(db, {
      interviewId: data.interviewId,
    });

    return {
      interviewId: interview.id,
      jobTitle: interview.jobTitle,
      companyName: interview.companyName,
      interviewStatus: interview.status,
      assessment: assessment
        ? {
            status: assessment.status,
            startedAt: assessment.startedAt?.toISOString() ?? null,
            completedAt: assessment.completedAt?.toISOString() ?? null,
          }
        : null,
    };
  });

export const initializeMyVoiceAssessment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can initialize voice assessments");
    }

    const db = getDb();
    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
    if (!interview) {
      return { ok: false, status: "error" as const };
    }

    const result = await initializeVoiceAssessmentAgent(data.interviewId);
    return { ok: result.ok, status: result.status };
  });

export const markMyVoiceAssessmentEndIntent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can end voice assessments");
    }

    const db = getDb();
    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
    if (!interview) {
      return { ok: false };
    }

    await markVoiceAssessmentEndIntent(data.interviewId);
    return { ok: true };
  });

export const getMyVoiceAssessmentTranscript = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view voice assessment transcripts");
    }

    const db = getDb();
    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
    if (!interview) {
      return { messages: [] as Array<{ role: string; content: string }> };
    }

    const result = await getVoiceAssessmentTranscript(data.interviewId);
    return { messages: result.messages };
  });

export const skipMyVoiceAssessment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(interviewIdSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can skip voice assessments");
    }

    const db = getDb();
    const interview = await getInterviewForCandidateById(db, {
      id: data.interviewId,
      candidateId: context.userId,
    });
    if (!interview) {
      return { ok: false };
    }

    await skipVoiceAssessmentAgent(data.interviewId);
    return { ok: true };
  });
