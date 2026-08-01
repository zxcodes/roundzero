import type { Sql } from "postgres";

import { getUserById } from "@/features/auth/queries/queries_sql";
import {
  getJobCapacityCounts,
  getJobCapacityForUpdate,
} from "@/features/batches/queries/queries_sql";
import { checkAndLaunchBatch } from "@/features/batches/server/orchestration";
import { getCandidateProfileByUserId } from "@/features/candidates/queries/queries_sql";
import { getCompanyByMemberUserId } from "@/features/companies/queries/membership-queries_sql";
import { getCompanyById } from "@/features/companies/queries/queries_sql";
import { notifyCompanyTeam } from "@/features/companies/services/company-team-notifications";
import {
  cancelInterview,
  createInterview,
  deleteCommunicationAssessmentByInterviewId,
  deleteInterviewMessagesByInterviewId,
  getInterviewByApplicationId,
  getInterviewContextById,
  resetInterviewInvite,
} from "@/features/interviews/queries/queries_sql";
import { ensureInterviewRuntimeMetadata } from "@/features/interviews/shared/runtime";
import { closeExpiredJobsQuery, getJobById } from "@/features/jobs/queries/queries_sql";
import { notificationPayloadSchemas } from "@/features/notifications/config";
import {
  createDedupedNotification,
  createNotification,
} from "@/features/notifications/queries/queries_sql";
import {
  deliverNotificationEmail,
  type NotificationEmailSender,
  sendNotificationEmail,
} from "@/features/notifications/services/email";
import { getReportByApplicationId } from "@/features/reports/queries/queries_sql";
import { type ApplicationStatus, applicationStatusSchema, isValidTransition } from "@/shared/enums";
import { ExpectedError } from "@/shared/expected-error";
import { isUniqueViolation } from "@/shared/postgres-errors";

import {
  createApplication as createApplicationQuery,
  getApplicationById,
  getApplicationByJobAndCandidate,
  setShortlistDetails,
  updateApplicationStatus as updateApplicationStatusQuery,
  updateApplicationStatusIfCurrent,
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
    throw new ExpectedError("forbidden", "Only candidates can apply to jobs");
  }

  const job = await getJobById(db, { id: input.jobId });
  if (!job) {
    throw new ExpectedError("not_found", "Job not found");
  }
  if (job.status !== "open") {
    throw new ExpectedError("invalid_state", "This job is not accepting applications");
  }
  if (job.expiresAt && job.expiresAt <= new Date()) {
    throw new ExpectedError(
      "expired",
      "This job has expired and is no longer accepting applications",
    );
  }

  const existing = await getApplicationByJobAndCandidate(db, {
    jobId: input.jobId,
    candidateId: input.userId,
  });
  if (existing) {
    throw new ExpectedError("already_exists", "You have already applied to this job");
  }

  const profile = await getCandidateProfileByUserId(db, { userId: input.userId });
  if (!profile?.resumeKey) {
    throw new ExpectedError("setup_required", "Add your resume to your profile before applying");
  }

  let application;
  try {
    application = await createApplicationQuery(db, {
      jobId: input.jobId,
      candidateId: input.userId,
      resumeKey: profile.resumeKey,
      metadata: {},
      status: "applied",
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ExpectedError("already_exists", "You have already applied to this job");
    }
    throw error;
  }

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
    throw new ExpectedError("not_found", "Application not found");
  }

  const company = await getCompanyByMemberUserId(db, { userId: input.userId });
  if (!company) {
    throw new ExpectedError("forbidden", "Not authorized");
  }

  const job = await getJobById(db, { id: application.jobId });
  if (!job || job.companyId !== company.id) {
    throw new ExpectedError("forbidden", "Not authorized");
  }

  const currentStatus = applicationStatusSchema.parse(application.status);
  if (!isValidTransition(currentStatus, input.status)) {
    throw new ExpectedError(
      "invalid_state",
      `Cannot transition from "${currentStatus}" to "${input.status}"`,
    );
  }

  if (currentStatus !== input.status && input.status === "interview_invited") {
    const invitation = await db.begin(async (tx) => {
      const transaction = tx as unknown as Sql;
      const lockedJob = await getJobCapacityForUpdate(transaction, { id: application.jobId });
      if (!lockedJob) throw new ExpectedError("not_found", "Job not found");

      const lockedRows = await tx`
        SELECT id FROM applications WHERE id = ${input.applicationId} FOR UPDATE
      `;
      if (!lockedRows[0]) throw new ExpectedError("not_found", "Application not found");
      const lockedApplication = await getApplicationById(transaction, { id: input.applicationId });
      if (!lockedApplication) {
        throw new Error(`Locked application ${input.applicationId} could not be loaded`);
      }
      const lockedStatus = applicationStatusSchema.parse(lockedApplication.status);
      if (!isValidTransition(lockedStatus, "interview_invited")) {
        throw new ExpectedError(
          "conflict",
          `Cannot transition from "${lockedStatus}" to "interview_invited"`,
        );
      }

      const existingInterview = await getInterviewByApplicationId(transaction, {
        applicationId: lockedApplication.id,
      });
      const report = await getReportByApplicationId(transaction, {
        applicationId: lockedApplication.id,
      });
      if (report) {
        throw new ExpectedError(
          "invalid_state",
          "This application already has a report and cannot be reinvited",
        );
      }
      if (existingInterview?.status === "completed") {
        throw new ExpectedError(
          "invalid_state",
          "Completed interviews must be recovered through post-evaluation, not reinvited",
        );
      }

      const activeInterview =
        existingInterview?.status === "pending" ||
        existingInterview?.status === "in_progress" ||
        existingInterview?.status === "awaiting_voice";
      if (activeInterview) {
        const updated = await updateApplicationStatusIfCurrent(transaction, {
          id: lockedApplication.id,
          currentStatus: lockedStatus,
          status: "interview_invited",
        });
        if (!updated) {
          throw new ExpectedError("conflict", "Application changed while inviting candidate");
        }
        return { application: updated, notification: null };
      }

      const capacity = await getJobCapacityCounts(transaction, { jobId: lockedApplication.jobId });
      if (!capacity) {
        throw new Error(`Capacity data missing for job ${lockedApplication.jobId}`);
      }
      if (capacity.deliveredCount + capacity.reservedCount >= lockedJob.finalReportTarget) {
        throw new ExpectedError("quota_exceeded", "No interview capacity remains for this job");
      }

      const invitedAt = new Date();
      const expiresAt = new Date(invitedAt.getTime() + 12 * 60 * 60 * 1000).toISOString();
      const isReinvite = existingInterview !== null;
      const interview = isReinvite
        ? await resetInterviewInvite(transaction, {
            id: existingInterview.id,
            metadata: { expiresAt },
            invitedAt,
          })
        : await createInterview(transaction, {
            applicationId: lockedApplication.id,
            agentId: null,
            type: "full",
            metadata: { expiresAt },
            status: "pending",
            invitedAt,
            startedAt: null,
            completedAt: null,
          });
      if (!interview) throw new Error("Failed to create interview invite");

      if (isReinvite) {
        await deleteInterviewMessagesByInterviewId(transaction, { interviewId: interview.id });
        await deleteCommunicationAssessmentByInterviewId(transaction, {
          interviewId: interview.id,
        });
      }
      const interviewContext = await getInterviewContextById(transaction, { id: interview.id });
      if (!interviewContext) throw new Error("Failed to load interview context");
      await ensureInterviewRuntimeMetadata(transaction, interviewContext, {
        forceJobSnapshotRefresh: isReinvite,
      });

      const updated = await updateApplicationStatusIfCurrent(transaction, {
        id: lockedApplication.id,
        currentStatus: lockedStatus,
        status: "interview_invited",
      });
      if (!updated) {
        throw new ExpectedError("conflict", "Application changed while inviting candidate");
      }

      const payload = notificationPayloadSchemas.interview_invited.parse({
        applicationId: lockedApplication.id,
        interviewId: interview.id,
        jobId: lockedApplication.jobId,
        jobTitle: lockedApplication.jobTitle,
        interviewType: interview.type,
        expiresAt,
      });
      const notification = await createDedupedNotification(transaction, {
        userId: lockedApplication.candidateId,
        type: "interview_invited",
        payload,
        dedupeKey: `interview-invite:${interview.id}:${invitedAt.toISOString()}`,
      });
      return { application: updated, notification };
    });

    if (invitation.notification) {
      const candidate = await getUserById(db, { id: invitation.application.candidateId });
      await deliverNotificationEmail(db, {
        notification: invitation.notification,
        recipient: candidate ? { email: candidate.email } : null,
        sendEmail: options?.sendNotificationEmail ?? sendNotificationEmail,
      });
    }
    return { application: invitation.application };
  }

  const transition =
    input.status === "rejected"
      ? await db.begin(async (tx) => {
          const transaction = tx as unknown as Sql;
          const lockedJob = await getJobCapacityForUpdate(transaction, {
            id: application.jobId,
          });
          if (!lockedJob) throw new ExpectedError("not_found", "Job not found");

          const rows = await tx`
            SELECT status
            FROM applications
            WHERE id = ${input.applicationId}
            FOR UPDATE
          `;
          if (!rows[0]) {
            throw new ExpectedError("not_found", "Application not found");
          }
          const lockedStatus = applicationStatusSchema.parse(rows[0]?.status);
          if (!isValidTransition(lockedStatus, "rejected")) {
            throw new ExpectedError(
              "conflict",
              `Cannot transition from "${lockedStatus}" to "rejected"`,
            );
          }

          const interview = await getInterviewByApplicationId(transaction, {
            applicationId: input.applicationId,
          });
          let capacityFreed = false;
          if (
            interview?.status === "pending" ||
            interview?.status === "in_progress" ||
            interview?.status === "awaiting_voice"
          ) {
            const cancelled = await cancelInterview(transaction, {
              id: interview.id,
              cancellationReason: "Company rejected application",
            });
            if (!cancelled) {
              throw new ExpectedError(
                "conflict",
                "The interview changed while the application was being rejected.",
              );
            }
            capacityFreed = true;
          }

          const updated = await updateApplicationStatusIfCurrent(transaction, {
            status: "rejected",
            currentStatus: lockedStatus,
            id: input.applicationId,
          });
          if (!updated) {
            throw new ExpectedError("conflict", "Application changed while being rejected");
          }
          return { updated, capacityFreed, jobId: lockedJob.id };
        })
      : {
          updated: await updateApplicationStatusQuery(db, {
            status: input.status,
            id: input.applicationId,
          }),
          capacityFreed: false,
          jobId: application.jobId,
        };

  const updated = transition.updated;

  if (!updated) {
    throw new ExpectedError("conflict", "Application changed while updating its status");
  }

  if (transition.capacityFreed) {
    await checkAndLaunchBatch(transition.jobId);
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
    throw new ExpectedError("not_found", "Application not found");
  }

  const company = await getCompanyByMemberUserId(db, { userId: input.userId });
  if (!company) {
    throw new ExpectedError("forbidden", "Not authorized");
  }

  const job = await getJobById(db, { id: application.jobId });
  if (!job || job.companyId !== company.id) {
    throw new ExpectedError("forbidden", "Not authorized");
  }

  const currentStatus = applicationStatusSchema.parse(application.status);
  const alreadyShortlisted = currentStatus === "shortlisted";
  if (!alreadyShortlisted && !isValidTransition(currentStatus, "shortlisted")) {
    throw new ExpectedError(
      "invalid_state",
      `Cannot shortlist an application with status "${currentStatus}"`,
    );
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
    throw new ExpectedError("conflict", "Application changed while shortlisting applicant");
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
    throw new ExpectedError("forbidden", "Only candidates can withdraw applications");
  }

  const application = await getApplicationById(db, { id: input.applicationId });
  if (!application) {
    throw new ExpectedError("not_found", "Application not found");
  }

  if (application.candidateId !== input.userId) {
    throw new ExpectedError("forbidden", "Not authorized");
  }

  const withdrawal = await db.begin(async (tx) => {
    const transaction = tx as unknown as Sql;
    const rows = await tx`
      SELECT status, job_id
      FROM applications
      WHERE id = ${input.applicationId} AND candidate_id = ${input.userId}
      FOR UPDATE
    `;
    const lockedApplication = rows[0];
    if (!lockedApplication) {
      throw new ExpectedError("not_found", "Application not found or not authorized");
    }

    const currentStatus = applicationStatusSchema.parse(lockedApplication.status);
    if (!isValidTransition(currentStatus, "withdrawn")) {
      throw new ExpectedError(
        "invalid_state",
        `Cannot withdraw an application with status "${currentStatus}"`,
      );
    }

    const interview = await getInterviewByApplicationId(transaction, {
      applicationId: input.applicationId,
    });
    let capacityFreed = false;
    if (interview?.status === "completed") {
      throw new ExpectedError(
        "invalid_state",
        "This interview is complete and its evaluation can no longer be withdrawn.",
      );
    }
    if (
      interview?.status === "pending" ||
      interview?.status === "in_progress" ||
      interview?.status === "awaiting_voice"
    ) {
      const cancelled = await cancelInterview(transaction, {
        id: interview.id,
        cancellationReason: "Candidate withdrew application",
      });
      if (!cancelled) {
        throw new ExpectedError(
          "conflict",
          "The interview changed while the application was being withdrawn.",
        );
      }
      capacityFreed = true;
    }

    const updated = await updateApplicationStatusIfCurrent(transaction, {
      status: "withdrawn",
      currentStatus,
      id: input.applicationId,
    });
    if (!updated) throw new ExpectedError("conflict", "Application changed while being withdrawn");
    return { updated, capacityFreed, jobId: lockedApplication.job_id as string };
  });

  if (withdrawal.capacityFreed) {
    await checkAndLaunchBatch(withdrawal.jobId);
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

  return { application: withdrawal.updated };
};
