import type { Sql } from "postgres";
import { getUserById } from "@/features/auth/queries/queries_sql";
import {
  getCandidateProfileByUserId,
  getCandidateWorkHistoryByProfileId,
} from "@/features/candidates/queries/queries_sql";
import { getCompanyById, getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import {
  getApplicationFollowupByApplicationId,
  upsertApplicationFollowup,
} from "@/features/followups/queries/queries_sql";
import {
  createInterview,
  getInterviewByApplicationId,
} from "@/features/interviews/queries/queries_sql";
import { closeExpiredJobsQuery, getJobById } from "@/features/jobs/queries/queries_sql";
import { notificationPayloadSchemas } from "@/features/notifications/config";
import { createNotification } from "@/features/notifications/queries/queries_sql";
import {
  deliverNotificationEmail,
  type NotificationEmailSender,
  sendNotificationEmailViaResend,
} from "@/features/notifications/services/email";
import { getPreEvaluationByApplicationId } from "@/features/pre-evaluations/queries/queries_sql";
import { type ApplicationStatus, applicationStatusSchema, isValidTransition } from "@/shared/enums";
import {
  createApplication as createApplicationQuery,
  getApplicationById,
  getApplicationByJobAndCandidate,
  updateApplicationStatus as updateApplicationStatusQuery,
} from "../queries/queries_sql";

type ManualFollowupQuestion = {
  id: string;
  prompt: string;
  type: "single_choice" | "short_text" | "long_text";
  required: boolean;
  helpText?: string;
  placeholder?: string;
  options?: string[];
  maxLength?: number;
};

const toRequirementList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const buildManualFollowupQuestions = (input: {
  jobTitle: string;
  jobRequirements: unknown;
  missingRequirements: string[];
}): ManualFollowupQuestion[] => {
  const targetedRequirements =
    input.missingRequirements.length > 0
      ? input.missingRequirements
      : toRequirementList(input.jobRequirements).slice(0, 2);

  const questions: ManualFollowupQuestion[] = targetedRequirements
    .slice(0, 3)
    .map((requirement, index) => ({
      id: `gap_${index + 1}`,
      prompt: `Share one concrete example showing your experience with: ${requirement}.`,
      type: "long_text",
      required: true,
      helpText: "Include your exact contribution, scope, and measurable outcomes.",
      placeholder: "Context, what you owned, and the impact...",
      maxLength: 1200,
    }));

  if (questions.length < 2) {
    questions.push({
      id: "role_fit",
      prompt: `What makes you a strong fit for ${input.jobTitle}?`,
      type: "long_text",
      required: true,
      helpText: "Tie your answer to the responsibilities and requirements.",
      placeholder: "Use specific examples from recent work.",
      maxLength: 1000,
    });
  }

  questions.push({
    id: "ownership_scope",
    prompt: "How often do you lead workstreams or decisions end-to-end?",
    type: "single_choice",
    required: true,
    options: [
      "Frequently - I own goals, execution, and outcomes",
      "Sometimes - I co-own key decisions",
      "Rarely - mostly execution support",
      "Not yet in prior roles",
    ],
  });

  questions.push({
    id: "proof_links",
    prompt: "Optional: share links that validate your examples (portfolio, docs, case studies).",
    type: "short_text",
    required: false,
    placeholder: "https://...",
    maxLength: 500,
  });

  return questions.slice(0, 5);
};

export const applyToJobWorkflow = async (
  db: Sql,
  input: {
    userId: string;
    jobId: string;
  },
  options?: {
    sendNotificationEmail?: NotificationEmailSender;
    triggerPreEvaluation?: (applicationId: string) => Promise<void>;
  },
) => {
  await db.unsafe(closeExpiredJobsQuery);

  const user = await getUserById(db, { id: input.userId });
  if (!user || user.role !== "candidate") {
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

  const workHistory = await getCandidateWorkHistoryByProfileId(db, {
    candidateProfileId: profile.id,
  });

  const application = await createApplicationQuery(db, {
    jobId: input.jobId,
    candidateId: input.userId,
    resumeKey: profile.resumeKey,
    metadata: {
      headline: profile.headline,
      bio: profile.bio,
      skills: profile.skills,
      workHistory: workHistory.map((entry) => ({
        company: entry.company,
        title: entry.title,
        startMonth: entry.startMonth,
        endMonth: entry.endMonth,
        currentlyWorkingHere: entry.currentlyWorkingHere,
        description: entry.description,
      })),
      links: profile.links,
    },
    status: "applied",
  });

  if (!application) {
    throw new Error("Failed to submit application");
  }

  // Note: companies no longer receive "new_applicant" notifications.
  // Pre-evaluation runs asynchronously and companies are notified via
  // "report_ready" when the AI evaluation completes.

  if (options?.triggerPreEvaluation) {
    await options.triggerPreEvaluation(application.id);
  }

  return { application };
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

  const company = await getCompanyByOwnerId(db, { ownerId: input.userId });
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

    const latestPreEvaluation = await getPreEvaluationByApplicationId(db, {
      applicationId: application.id,
    });

    const interviewType =
      latestPreEvaluation?.nextStep === "interview_invited" ? "full" : "quick_eval";
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const interview =
      existingInterview ??
      (await createInterview(db, {
        applicationId: application.id,
        agentId: null,
        type: interviewType,
        metadata: { preEvaluationScore: latestPreEvaluation?.score ?? null, expiresAt },
        status: "pending",
        startedAt: null,
        completedAt: null,
      }));

    if (!interview) {
      throw new Error("Failed to create interview invite");
    }

    const metadata =
      typeof interview.metadata === "object" && interview.metadata !== null
        ? (interview.metadata as Record<string, unknown>)
        : {};

    const payload = notificationPayloadSchemas.interview_invited.parse({
      applicationId: application.id,
      interviewId: interview.id,
      jobId: application.jobId,
      jobTitle: application.jobTitle,
      interviewType: interview.type,
      expiresAt: typeof metadata.expiresAt === "string" ? metadata.expiresAt : expiresAt,
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
        sendEmail: options?.sendNotificationEmail ?? sendNotificationEmailViaResend,
      });
    }

    return { application: updated };
  }

  if (currentStatus !== input.status && input.status === "followups_requested") {
    const latestPreEvaluation = await getPreEvaluationByApplicationId(db, {
      applicationId: application.id,
    });
    const questions = buildManualFollowupQuestions({
      jobTitle: application.jobTitle,
      jobRequirements: job.requirements,
      missingRequirements: latestPreEvaluation?.missingRequirements ?? [],
    });
    const dueAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const existingFollowup = await getApplicationFollowupByApplicationId(db, {
      applicationId: application.id,
    });
    const followup =
      existingFollowup ??
      (await upsertApplicationFollowup(db, {
        applicationId: application.id,
        questions,
        answers: [],
        status: "pending",
        dueAt,
        submittedAt: null,
      }));

    if (!followup) {
      throw new Error("Failed to prepare follow-up questionnaire");
    }

    if (existingFollowup) {
      const refreshed = await upsertApplicationFollowup(db, {
        applicationId: application.id,
        questions,
        answers: existingFollowup.status === "submitted" ? [] : existingFollowup.answers,
        status: "pending",
        dueAt,
        submittedAt: null,
      });

      if (!refreshed) {
        throw new Error("Failed to refresh follow-up questionnaire");
      }
    }

    const payload = notificationPayloadSchemas.followups_requested.parse({
      applicationId: application.id,
      jobId: application.jobId,
      jobTitle: application.jobTitle,
      dueAt: dueAt.toISOString(),
      questionCount: questions.length,
    });

    const notification = await createNotification(db, {
      userId: application.candidateId,
      type: "followups_requested",
      payload,
    });

    if (notification) {
      const candidate = await getUserById(db, { id: application.candidateId });
      await deliverNotificationEmail(db, {
        notification,
        recipient: candidate ? { email: candidate.email } : null,
        sendEmail: options?.sendNotificationEmail ?? sendNotificationEmailViaResend,
      });
    }

    return { application: updated };
  }

  if (currentStatus !== input.status) {
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
        sendEmail: options?.sendNotificationEmail ?? sendNotificationEmailViaResend,
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
  if (!user || user.role !== "candidate") {
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

      const notification = await createNotification(db, {
        userId: company.ownerId,
        type: "application_withdrawn",
        payload,
      });

      if (notification) {
        const owner = await getUserById(db, { id: company.ownerId });
        await deliverNotificationEmail(db, {
          notification,
          recipient: owner ? { email: owner.email } : null,
          sendEmail: options?.sendNotificationEmail ?? sendNotificationEmailViaResend,
        });
      }
    }
  }

  return { application: updated };
};
