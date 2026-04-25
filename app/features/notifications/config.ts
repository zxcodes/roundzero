import { z } from "zod";
import { applicationStatusSchema, jobStatusSchema, notificationTypeSchema } from "@/shared/enums";

const applicationStatusChangedPayloadSchema = z.object({
  applicationId: z.string().uuid(),
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
  companyName: z.string().min(1),
  status: applicationStatusSchema,
});

const applicationWithdrawnPayloadSchema = z.object({
  applicationId: z.string().uuid(),
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
  candidateName: z.string().min(1),
});

const reportReadyPayloadSchema = z.object({
  applicationId: z.string().uuid(),
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
  candidateName: z.string().min(1),
  score: z.number().optional(),
});

const interviewInvitedPayloadSchema = z.object({
  applicationId: z.string().uuid(),
  interviewId: z.string().uuid(),
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
  interviewType: z.string().min(1),
  expiresAt: z.string().datetime(),
});

const interviewExpiredPayloadSchema = z.object({
  applicationId: z.string().uuid(),
  interviewId: z.string().uuid(),
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
});

const positionFilledPayloadSchema = z.object({
  applicationId: z.string().uuid(),
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
});

const jobLifecyclePayloadSchema = z.object({
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
  status: jobStatusSchema,
});

export const notificationPayloadSchemas = {
  application_status_changed: applicationStatusChangedPayloadSchema,
  application_withdrawn: applicationWithdrawnPayloadSchema,
  report_ready: reportReadyPayloadSchema,
  interview_invited: interviewInvitedPayloadSchema,
  interview_expired: interviewExpiredPayloadSchema,
  position_filled: positionFilledPayloadSchema,
  job_published: jobLifecyclePayloadSchema,
  job_archived: jobLifecyclePayloadSchema,
  job_closed: jobLifecyclePayloadSchema,
} satisfies Record<z.infer<typeof notificationTypeSchema>, z.ZodTypeAny>;

const notificationTone = {
  application_status_changed: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  application_withdrawn: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  report_ready: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  interview_invited: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  interview_expired: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  position_filled: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  job_published: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  job_archived: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  job_closed: "bg-red-500/10 text-red-700 dark:text-red-300",
} as const;

const formatApplicationStatusLabel = (status: z.infer<typeof applicationStatusSchema>) => {
  switch (status) {
    case "applied":
      return "Applied";
    case "pre_screening":
      return "Pre-screening";
    case "interview_invited":
      return "Interview invited";
    case "interview_in_progress":
      return "Interview in progress";
    case "evaluated":
      return "Evaluated";
    case "shortlisted":
      return "Shortlisted";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
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

    return {
      type,
      tone: notificationTone[type],
      title: `${payload.data.companyName} updated your application`,
      body: `Your application for ${payload.data.jobTitle} at ${payload.data.companyName} is now ${formatApplicationStatusLabel(payload.data.status).toLowerCase()}.`,
      to: "/dashboard/application/$applicationId" as const,
      params: { applicationId: payload.data.applicationId },
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
      title: `Evaluation ready for ${payload.data.candidateName}`,
      body: `The AI evaluation for ${payload.data.candidateName} on ${payload.data.jobTitle} is ready.`,
      to: "/dashboard/applicant-reports/$applicationId" as const,
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
      title: `Zero invited you to an interview`,
      body: `You have been invited to complete a ${payload.data.interviewType === "quick_eval" ? "quick evaluation" : "full interview"} for ${payload.data.jobTitle}. Complete it before the deadline to keep your evaluation slot.`,
      to: "/dashboard/interview/$interviewId" as const,
      params: { interviewId: payload.data.interviewId },
      meta: {
        ctaLabel: "Start Interview",
        deadline: payload.data.expiresAt,
      },
    };
  }

  if (type === "interview_expired") {
    const payload = notificationPayloadSchemas.interview_expired.safeParse(
      toRecord(notification.payload),
    );
    if (!payload.success) {
      return null;
    }

    return {
      type,
      tone: notificationTone[type],
      title: `Interview window closed for ${payload.data.jobTitle}`,
      body: `The interview deadline has passed for ${payload.data.jobTitle}. If capacity allows, Zero may invite additional candidates from the pipeline.`,
      to: "/dashboard/application/$applicationId" as const,
      params: { applicationId: payload.data.applicationId },
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
      title: `${payload.data.jobTitle} has received enough evaluations`,
      body: `This position has reached its final report target. Your application is still on file and the company may review it directly.`,
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
      title: `${payload.data.candidateName} withdrew their application`,
      body: `${payload.data.candidateName} has withdrawn their application for ${payload.data.jobTitle}.`,
      to: "/dashboard/job-applicants/$jobId" as const,
      params: { jobId: payload.data.jobId },
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
    },
    job_archived: {
      title: `${jobPayload.data.jobTitle} has been archived`,
      body: `Your job posting for ${jobPayload.data.jobTitle} has been archived and is no longer accepting applications.`,
    },
    job_closed: {
      title: `${jobPayload.data.jobTitle} has closed`,
      body: `Your job posting for ${jobPayload.data.jobTitle} has expired and is now closed.`,
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
