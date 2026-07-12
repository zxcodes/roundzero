import type { Sql } from "postgres";

import { getUserById } from "@/features/auth/queries/queries_sql";
import { getCandidateProfileByUserId } from "@/features/candidates/queries/queries_sql";
import { getCompanyByMemberUserId } from "@/features/companies/queries/membership-queries_sql";
import { getCompanyById } from "@/features/companies/queries/queries_sql";
import { notifyCompanyTeam } from "@/features/companies/services/company-team-notifications";
import {
  createInterview,
  deleteInterviewMessagesByInterviewId,
  getInterviewByApplicationId,
  getInterviewContextById,
  resetInterviewInvite,
} from "@/features/interviews/queries/queries_sql";
import { ensureInterviewRuntimeMetadata } from "@/features/interviews/shared/runtime";
import { closeExpiredJobsQuery, getJobById } from "@/features/jobs/queries/queries_sql";
import { notificationPayloadSchemas } from "@/features/notifications/config";
import { createNotification } from "@/features/notifications/queries/queries_sql";
import {
  deliverNotificationEmail,
  type NotificationEmailSender,
  sendNotificationEmail,
} from "@/features/notifications/services/email";
import { type ApplicationStatus, applicationStatusSchema, isValidTransition } from "@/shared/enums";

import {
  createApplication as createApplicationQuery,
  getApplicationById,
  getApplicationByJobAndCandidate,
  setShortlistDetails,
  updateApplicationStatus as updateApplicationStatusQuery,
} from "../queries/queries_sql";
import type { ShortlistDetails } from "../shortlist";

interface PreEvaluationTriggerResult {
  workflowInstanceId: string;
}

function isPreEvaluationTriggerResult(value: unknown): value is PreEvaluationTriggerResult {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.workflowInstanceId === "string";
}

export const applyToJobWorkflow = async (
  db: Sql,
  input: {
    userId: string;
    jobId: string;
  },
  options?: {
    triggerPreEvaluation?: (
      applicationId: string,
    ) => Promise<PreEvaluationTriggerResult | undefined>;
  },
) => {
  await db.unsafe(closeExpiredJobsQuery);

  const user = await getUserById(db, { id: input.userId });
  if (user?.role !== "candidate") {
    throw new Error("Only candidates can apply to jobs");
  }

  const job = await getJobById(db, { id: input.jobId });
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.status !== "open") {
    throw new Error("This job is not accepting applications");
  }
  if (job.expiresAt && job.expiresAt <= new Date()) {
    throw new Error("This job has expired and is no longer accepting applications");
  }

  const existing = await getApplicationByJobAndCandidate(db, {
    jobId: input.jobId,
    candidateId: input.userId,
  });
  if (existing) {
    throw new Error("You have already applied to this job");
  }

  const profile = await getCandidateProfileByUserId(db, { userId: input.userId });
  if (!profile?.resumeKey) {
    throw new Error("Add your resume to your profile before applying");
  }

  const application = await createApplicationQuery(db, {
    jobId: input.jobId,
    candidateId: input.userId,
    resumeKey: profile.resumeKey,
    metadata: {},
    status: "applied",
  });

  if (!application) {
    throw new Error("Failed to submit application");
  }

  // Note: companies no longer receive "new_applicant" notifications.
  // Pre-evaluation runs asynchronously and companies are notified via
  // "report_ready" when the AI evaluation completes.

  let workflowInstanceId: string | null = null;
  if (options?.triggerPreEvaluation) {
    const result = await options.triggerPreEvaluation(application.id);
    if (result && isPreEvaluationTriggerResult(result)) {
      workflowInstanceId = result.workflowInstanceId;
    }
  }

  return { application, workflowInstanceId };
};

export const updateApplicationStatusWorkflow = async (
  db: Sql,
  input: {
    userId: string;
    applicationId: string;
    status: ApplicationStatus;
  },
  options?: {
    sendNotificationEmail?: NotificationEmailSender;
  },
) => {
  const application = await getApplicationById(db, {
    id: input.applicationId,
  });
  if (!application) {
    throw new Error("Application not found");
  }

  const company = await getCompanyByMemberUserId(db, { userId: input.userId });
  if (!company) {
    throw new Error("Not authorized");
  }

  const job = await getJobById(db, { id: application.jobId });
  if (!job || job.companyId !== company.id) {
    throw new Error("Not authorized");
  }

  const currentStatus = applicationStatusSchema.parse(application.status);
  if (!isValidTransition(currentStatus, input.status)) {
    throw new Error(`Cannot transition from "${currentStatus}" to "${input.status}"`);
  }

  const updated = await updateApplicationStatusQuery(db, {
    status: input.status,
    id: input.applicationId,
  });

  if (!updated) {
    throw new Error("Failed to update application status");
  }

  if (currentStatus !== input.status && input.status === "interview_invited") {
    const existingInterview = await getInterviewByApplicationId(db, {
      applicationId: application.id,
    });

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    const inviteMetadata = { expiresAt };
    const invitedAt = new Date();
    const isReinvite =
      existingInterview !== null &&
      (existingInterview.status === "pending" || existingInterview.status === "in_progress");

    const interview = isReinvite
      ? await resetInterviewInvite(db, {
          id: existingInterview.id,
          metadata: inviteMetadata,
          invitedAt,
        })
      : await createInterview(db, {
          applicationId: application.id,
          agentId: null,
          type: "full",
          metadata: inviteMetadata,
          status: "pending",
          invitedAt,
          startedAt: null,
          completedAt: null,
        });

    if (!interview) {
      throw new Error("Failed to create interview invite");
    }

    if (isReinvite) {
      await deleteInterviewMessagesByInterviewId(db, { interviewId: interview.id });
    }

    const interviewContext = await getInterviewContextById(db, { id: interview.id });
    if (!interviewContext) {
      throw new Error("Failed to load interview context");
    }

    await ensureInterviewRuntimeMetadata(db, interviewContext, {
      forceJobSnapshotRefresh: isReinvite,
    });

    const expiresAtValue = expiresAt;

    const payload = notificationPayloadSchemas.interview_invited.parse({
      applicationId: application.id,
      interviewId: interview.id,
      jobId: application.jobId,
      jobTitle: application.jobTitle,
      interviewType: interview.type,
      expiresAt: expiresAtValue,
    });

    const notification = await createNotification(db, {
      userId: application.candidateId,
      type: "interview_invited",
      payload,
    });

    if (notification) {
      const candidate = await getUserById(db, { id: application.candidateId });
      await deliverNotificationEmail(db, {
        notification,
        recipient: candidate ? { email: candidate.email } : null,
        sendEmail: options?.sendNotificationEmail ?? sendNotificationEmail,
      });
    }

    return { application: updated };
  }

  const shouldNotifyCandidateOnStatusChange =
    input.status === "shortlisted" || input.status === "rejected";

  if (currentStatus !== input.status && shouldNotifyCandidateOnStatusChange) {
    const payload = notificationPayloadSchemas.application_status_changed.parse({
      applicationId: application.id,
      jobId: application.jobId,
      jobTitle: application.jobTitle,
      companyName: application.companyName,
      status: input.status,
    });

    const notification = await createNotification(db, {
      userId: application.candidateId,
      type: "application_status_changed",
      payload,
    });

    if (notification) {
      const candidate = await getUserById(db, { id: application.candidateId });
      await deliverNotificationEmail(db, {
        notification,
        recipient: candidate ? { email: candidate.email } : null,
        sendEmail: options?.sendNotificationEmail ?? sendNotificationEmail,
      });
    }
  }

  return { application: updated };
};

export const shortlistApplicantWorkflow = async (
  db: Sql,
  input: {
    userId: string;
    applicationId: string;
    note: string | null;
    /** Re-notify the candidate. Ignored (forced on) for the first shortlist. */
    notify: boolean;
  },
  options?: {
    sendNotificationEmail?: NotificationEmailSender;
  },
) => {
  const application = await getApplicationById(db, { id: input.applicationId });
  if (!application) {
    throw new Error("Application not found");
  }

  const company = await getCompanyByMemberUserId(db, { userId: input.userId });
  if (!company) {
    throw new Error("Not authorized");
  }

  const job = await getJobById(db, { id: application.jobId });
  if (!job || job.companyId !== company.id) {
    throw new Error("Not authorized");
  }

  const currentStatus = applicationStatusSchema.parse(application.status);
  const alreadyShortlisted = currentStatus === "shortlisted";
  if (!alreadyShortlisted && !isValidTransition(currentStatus, "shortlisted")) {
    throw new Error(`Cannot shortlist an application with status "${currentStatus}"`);
  }

  const shortlist: ShortlistDetails = {
    note: input.note,
    updatedAt: new Date().toISOString(),
  };

  const updated = await setShortlistDetails(db, {
    id: input.applicationId,
    shortlist,
    status: alreadyShortlisted ? null : "shortlisted",
  });

  if (!updated) {
    throw new Error("Failed to shortlist applicant");
  }

  // First shortlist always notifies; edits only when explicitly requested.
  const shouldNotify = !alreadyShortlisted || input.notify;
  if (shouldNotify) {
    const payload = notificationPayloadSchemas.application_status_changed.parse({
      applicationId: application.id,
      jobId: application.jobId,
      jobTitle: application.jobTitle,
      companyName: application.companyName,
      status: "shortlisted",
      note: shortlist.note,
      isShortlistUpdate: alreadyShortlisted,
    });

    const notification = await createNotification(db, {
      userId: application.candidateId,
      type: "application_status_changed",
      payload,
    });

    if (notification) {
      const candidate = await getUserById(db, { id: application.candidateId });
      await deliverNotificationEmail(db, {
        notification,
        recipient: candidate ? { email: candidate.email } : null,
        sendEmail: options?.sendNotificationEmail ?? sendNotificationEmail,
      });
    }
  }

  return { application: updated };
};

export const withdrawApplicationWorkflow = async (
  db: Sql,
  input: {
    userId: string;
    applicationId: string;
  },
  options?: {
    sendNotificationEmail?: NotificationEmailSender;
  },
) => {
  const user = await getUserById(db, { id: input.userId });
  if (user?.role !== "candidate") {
    throw new Error("Only candidates can withdraw applications");
  }

  const application = await getApplicationById(db, { id: input.applicationId });
  if (!application) {
    throw new Error("Application not found");
  }

  if (application.candidateId !== input.userId) {
    throw new Error("Not authorized");
  }

  const currentStatus = applicationStatusSchema.parse(application.status);
  if (!isValidTransition(currentStatus, "withdrawn")) {
    throw new Error(`Cannot withdraw an application with status "${currentStatus}"`);
  }

  const updated = await updateApplicationStatusQuery(db, {
    status: "withdrawn",
    id: input.applicationId,
  });

  if (!updated) {
    throw new Error("Failed to withdraw application");
  }

  const job = await getJobById(db, { id: application.jobId });
  if (job) {
    const company = await getCompanyById(db, { id: job.companyId });
    if (company) {
      const payload = notificationPayloadSchemas.application_withdrawn.parse({
        applicationId: application.id,
        jobId: application.jobId,
        jobTitle: application.jobTitle,
        candidateName: user.name,
      });

      const deliveries = await notifyCompanyTeam(db, {
        companyId: company.id,
        type: "application_withdrawn",
        payload,
      });

      for (const delivery of deliveries) {
        await deliverNotificationEmail(db, {
          notification: delivery.notification,
          recipient: { email: delivery.email },
          sendEmail: options?.sendNotificationEmail ?? sendNotificationEmail,
        });
      }
    }
  }

  return { application: updated };
};
