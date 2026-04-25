import { updateApplicationStatus } from "../queries/applications/queries_sql";
import {
  countActiveInterviewSlotsByJob,
  createInterview,
  getBestBackfillCandidateByJob,
  getInterviewsPastDeadline,
  updateInterviewStatus,
} from "../queries/interviews/queries_sql";
import { getJobById } from "../queries/jobs/queries_sql";
import { createNotification } from "../queries/notifications/queries_sql";
import { countReportsByJob } from "../queries/reports-by-job/queries_sql";
import { getDb } from "./db";
import { cancelInterviewAgentSession, initializeInterviewAgent } from "./interview-agent-client";
import { createWorkflowLogger } from "./logger";
import { notificationPayloadSchemas } from "./notifications-config";

const getReportTarget = (job: { finalReportTarget: number | null }) => {
  return typeof job.finalReportTarget === "number" && job.finalReportTarget > 0
    ? job.finalReportTarget
    : 5;
};

async function fillInterviewSlotsForJob(env: Env, jobId: string) {
  const db = getDb();
  const job = await getJobById(db, { id: jobId });
  if (!job) {
    return { invitedCount: 0 };
  }

  const completedReports = (await countReportsByJob(db, { jobId }))?.count ?? 0;
  const reportTarget = getReportTarget(job);
  const remainingReports = reportTarget - completedReports;

  if (remainingReports <= 0) {
    return { invitedCount: 0 };
  }

  const activeSlots = (await countActiveInterviewSlotsByJob(db, { jobId }))?.count ?? 0;
  let availableSlots = remainingReports - activeSlots;
  if (availableSlots <= 0) {
    return { invitedCount: 0 };
  }

  let invitedCount = 0;

  while (availableSlots > 0) {
    const candidate = await getBestBackfillCandidateByJob(db, { jobId });
    if (!candidate) {
      break;
    }

    const interviewType = candidate.nextStep === "interview_invited" ? "full" : "quick_eval";
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const interview = await createInterview(db, {
      applicationId: candidate.applicationId,
      agentId: null,
      type: interviewType,
      metadata: {
        preEvaluationScore: candidate.score,
        expiresAt,
        backfill: true,
      },
      status: "pending",
      startedAt: null,
      completedAt: null,
    });

    if (!interview) {
      break;
    }

    await initializeInterviewAgent(env, {
      interviewId: interview.id,
      applicationId: candidate.applicationId,
      interviewType,
      jobTitle: job.title,
      companyName: job.companyName,
    });

    await updateApplicationStatus(db, {
      id: candidate.applicationId,
      status: "interview_invited",
    });

    const invitePayload = notificationPayloadSchemas.interview_invited.parse({
      applicationId: candidate.applicationId,
      interviewId: interview.id,
      jobId,
      jobTitle: job.title,
      interviewType,
      expiresAt,
    });

    await createNotification(db, {
      userId: candidate.candidateId,
      type: "interview_invited",
      payload: invitePayload,
    });

    invitedCount += 1;
    availableSlots -= 1;
  }

  return { invitedCount };
}

export async function expireOverdueInterviews(env: Env) {
  const db = getDb();
  const overdueInterviews = await getInterviewsPastDeadline(db);

  if (overdueInterviews.length === 0) {
    return { expiredCount: 0 };
  }

  const affectedJobs = new Set<string>();

  for (const interview of overdueInterviews) {
    const log = createWorkflowLogger("interview-expiry", interview.id);
    log.info(`Expiring overdue interview ${interview.id}`);
    affectedJobs.add(interview.jobId);

    await updateInterviewStatus(db, {
      id: interview.id,
      status: "expired",
    });

    await updateApplicationStatus(db, {
      id: interview.applicationId,
      status: "pre_screening",
    });

    await cancelInterviewAgentSession(env, interview.id);

    const payload = notificationPayloadSchemas.interview_expired.parse({
      applicationId: interview.applicationId,
      interviewId: interview.id,
      jobId: interview.jobId,
      jobTitle: interview.jobTitle,
    });

    await createNotification(db, {
      userId: interview.candidateId,
      type: "interview_expired",
      payload,
    });
  }

  let invitedCount = 0;
  for (const jobId of affectedJobs) {
    const result = await fillInterviewSlotsForJob(env, jobId);
    invitedCount += result.invitedCount;
  }

  return { expiredCount: overdueInterviews.length, invitedCount };
}
