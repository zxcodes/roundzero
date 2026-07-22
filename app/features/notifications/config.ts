import {
  Alert02Icon,
  Archive01Icon,
  BubbleChatIcon,
  Briefcase01Icon,
  Cancel01Icon,
  InformationCircleIcon,
  Rocket01Icon,
  TickDouble01Icon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { z } from "zod";

import { type applicationStatusSchema, notificationTypeSchema } from "@/shared/enums";
import { notificationPayloadSchemas } from "@/shared/notifications-config";
import { EMAIL_PREVIEW } from "@/shared/seo";

export { notificationPayloadSchemas };

const notificationTone = {
  application_status_changed: "border-info/20 bg-info/10 text-info",
  application_withdrawn: "border-danger/20 bg-danger/10 text-danger",
  report_ready: "border-success/20 bg-success/10 text-success",
  interview_invited: "border-active/20 bg-active/10 text-active",
  position_filled: "border-warning/20 bg-warning/10 text-warning",
  job_published: "border-active/20 bg-active/10 text-active",
  job_archived: "border-warning/20 bg-warning/10 text-warning",
  job_closed: "border-danger/20 bg-danger/10 text-danger",
  job_match_digest: "border-active/20 bg-active/10 text-active",
} as const;

const statusChangedIcon = (status: z.infer<typeof applicationStatusSchema>): IconSvgElement => {
  switch (status) {
    case "shortlisted":
      return TickDouble01Icon;
    case "rejected":
      return Cancel01Icon;
    default:
      return InformationCircleIcon;
  }
};

const statusChangedTone = (status: z.infer<typeof applicationStatusSchema>): string => {
  switch (status) {
    case "shortlisted":
      return "border-success/20 bg-success/10 text-success";
    case "rejected":
      return "border-danger/20 bg-danger/10 text-danger";
    default:
      return notificationTone.application_status_changed;
  }
};

const formatApplicationStatusLabel = (status: z.infer<typeof applicationStatusSchema>) => {
  switch (status) {
    case "applied":
      return "Applied";
    case "pre_screening":
      return "Pre-screening";
    case "queued_for_batch":
      return "Queued for evaluation";
    case "interview_invited":
      return "Interview invited";
    case "interview_in_progress":
      return "Interview in progress";
    case "evaluated":
      return "Evaluated";
    case "evaluated_held":
      return "Evaluation complete";
    case "shortlisted":
      return "Shortlisted";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
    case "evaluation_failed":
      return "Evaluation failed";
  }
};

const statusToPastTense = (status: z.infer<typeof applicationStatusSchema>) => {
  switch (status) {
    case "shortlisted":
      return "shortlisted you";
    case "rejected":
      return "rejected your application";
    case "evaluated":
      return "completed your evaluation";
    case "evaluated_held":
      return "completed your evaluation";
    case "interview_invited":
      return "invited you to interview";
    case "interview_in_progress":
      return "marked your interview in progress";
    case "queued_for_batch":
      return "queued you for evaluation";
    case "pre_screening":
      return "moved you to pre-screening";
    case "applied":
      return "received your application";
    case "withdrawn":
      return "noted your withdrawal";
    case "evaluation_failed":
      return "evaluation could not be completed";
  }
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value));
  }

  return {};
};

export const getNotificationPresentation = (notification: { type: string; payload: unknown }) => {
  const normalized = notificationTypeSchema.safeParse(notification.type);
  if (!normalized.success) {
    return null;
  }

  const type = normalized.data;

  if (type === "application_status_changed") {
    const payload = notificationPayloadSchemas.application_status_changed.safeParse(
      toRecord(notification.payload),
    );
    if (!payload.success) {
      return null;
    }

    const { status, jobTitle, companyName, note, isShortlistUpdate } = payload.data;

    if (status === "shortlisted") {
      if (isShortlistUpdate) {
        const noteLine = note ? ` Updated note: "${note}"` : "";
        return {
          type,
          tone: statusChangedTone(status),
          icon: statusChangedIcon(status),
          title: `${companyName} updated your next steps`,
          body: `${companyName} updated the next steps for ${jobTitle}.${noteLine}`,
          to: "/dashboard/application/$applicationId" as const,
          params: { applicationId: payload.data.applicationId },
        };
      }

      const noteLine = note ? ` They left a note: "${note}"` : "";
      return {
        type,
        tone: statusChangedTone(status),
        icon: statusChangedIcon(status),
        title: `${companyName} shortlisted you`,
        body: `Great news — ${companyName} shortlisted you for ${jobTitle}.${noteLine}`,
        to: "/dashboard/application/$applicationId" as const,
        params: { applicationId: payload.data.applicationId },
      };
    }

    return {
      type,
      tone: statusChangedTone(status),
      icon: statusChangedIcon(status),
      title: `${companyName} ${statusToPastTense(status)}`,
      body: `Your application for ${jobTitle} at ${companyName} is now ${formatApplicationStatusLabel(status).toLowerCase()}.`,
      to: "/dashboard/application/$applicationId" as const,
      params: { applicationId: payload.data.applicationId },
    };
  }

  if (type === "batch_ready") {
    const payload = notificationPayloadSchemas.batch_ready.safeParse(
      toRecord(notification.payload),
    );
    if (!payload.success) {
      return null;
    }

    return {
      type,
      tone: "border-success/20 bg-success/10 text-success",
      icon: Rocket01Icon,
      title: `Batch ready: ${payload.data.jobTitle}`,
      body: `${payload.data.reportCount} candidate evaluation${payload.data.reportCount === 1 ? "" : "s"} ready for review.`,
      to: "/dashboard/job-batches/$batchId" as const,
      params: { batchId: payload.data.batchId },
    };
  }

  if (type === "report_ready") {
    const payload = notificationPayloadSchemas.report_ready.safeParse(
      toRecord(notification.payload),
    );
    if (!payload.success) {
      return null;
    }

    return {
      type,
      tone: notificationTone[type],
      icon: Rocket01Icon,
      title: `Evaluation ready for ${payload.data.candidateName}`,
      body: `The AI evaluation for ${payload.data.candidateName} on ${payload.data.jobTitle} is ready.`,
      to: "/dashboard/applicants/$applicationId" as const,
      params: { applicationId: payload.data.applicationId },
    };
  }

  if (type === "interview_invited") {
    const payload = notificationPayloadSchemas.interview_invited.safeParse(
      toRecord(notification.payload),
    );
    if (!payload.success) {
      return null;
    }

    return {
      type,
      tone: notificationTone[type],
      icon: BubbleChatIcon,
      title: `Zero invited you to an interview`,
      previewText: EMAIL_PREVIEW.interviewInvitation,
      body: `You have been invited to complete an interview for ${payload.data.jobTitle}. Complete it before the deadline to keep your evaluation slot.`,
      to: "/interview/$interviewId" as const,
      params: { interviewId: payload.data.interviewId },
      meta: {
        ctaLabel: "Start Interview",
        deadline: payload.data.expiresAt,
      },
    };
  }

  if (type === "position_filled") {
    const payload = notificationPayloadSchemas.position_filled.safeParse(
      toRecord(notification.payload),
    );
    if (!payload.success) {
      return null;
    }

    return {
      type,
      tone: notificationTone[type],
      icon: Alert02Icon,
      title: `Position filled`,
      body: `The position for ${payload.data.jobTitle} has been filled. Your application will remain on file, but no further evaluation slots are available.`,
      to: "/dashboard/application/$applicationId" as const,
      params: { applicationId: payload.data.applicationId },
    };
  }

  if (type === "application_withdrawn") {
    const payload = notificationPayloadSchemas.application_withdrawn.safeParse(
      toRecord(notification.payload),
    );
    if (!payload.success) {
      return null;
    }

    return {
      type,
      tone: notificationTone[type],
      icon: UserRemove01Icon,
      title: `${payload.data.candidateName} withdrew their application`,
      body: `${payload.data.candidateName} has withdrawn their application for ${payload.data.jobTitle}.`,
      to: "/dashboard/job-applicants/$jobId" as const,
      params: { jobId: payload.data.jobId },
    };
  }

  if (type === "job_match_digest") {
    const payload = notificationPayloadSchemas.job_match_digest.safeParse(
      toRecord(notification.payload),
    );
    if (!payload.success) return null;

    const first = payload.data.jobs[0];
    const remaining = payload.data.jobs.length - 1;
    return {
      type,
      tone: notificationTone[type],
      icon: Briefcase01Icon,
      title: `${payload.data.jobs.length} strong job ${payload.data.jobs.length === 1 ? "match" : "matches"}`,
      previewText: `New roles selected for you on RoundZero`,
      body: first
        ? `${first.title} at ${first.companyName}${remaining > 0 ? ` and ${remaining} more` : ""}.`
        : "New strong matches are ready.",
      to: "/dashboard/jobs" as const,
      params: {},
      meta: { ctaLabel: "View matches" },
    };
  }

  // Job lifecycle notifications
  const jobPayload = z
    .union([
      notificationPayloadSchemas.job_published,
      notificationPayloadSchemas.job_archived,
      notificationPayloadSchemas.job_closed,
    ])
    .safeParse(toRecord(notification.payload));

  if (!jobPayload.success) {
    return null;
  }

  const messages = {
    job_published: {
      title: `${jobPayload.data.jobTitle} is now live`,
      body: `Your job posting for ${jobPayload.data.jobTitle} is now live and accepting applications.`,
      icon: Rocket01Icon,
    },
    job_archived: {
      title: `${jobPayload.data.jobTitle} has been archived`,
      body: `Your job posting for ${jobPayload.data.jobTitle} has been archived and is no longer accepting applications.`,
      icon: Archive01Icon,
    },
    job_closed: {
      title: `${jobPayload.data.jobTitle} has closed`,
      body: `Your job posting for ${jobPayload.data.jobTitle} has expired and is now closed.`,
      icon: Cancel01Icon,
    },
  };

  return {
    type,
    tone: notificationTone[type],
    ...messages[type],
    to: "/dashboard/jobs/$jobId" as const,
    params: { jobId: jobPayload.data.jobId },
  };
};
