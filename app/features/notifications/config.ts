import { z } from "zod";
import { applicationStatusSchema, jobStatusSchema, notificationTypeSchema } from "@/shared/enums";

const applicationStatusChangedPayloadSchema = z.object({
  applicationId: z.string().uuid(),
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
  companyName: z.string().min(1),
  status: applicationStatusSchema,
});

const newApplicantPayloadSchema = z.object({
  applicationId: z.string().uuid(),
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
  candidateName: z.string().min(1),
});

const jobLifecyclePayloadSchema = z.object({
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
  status: jobStatusSchema,
});

export const notificationPayloadSchemas = {
  application_status_changed: applicationStatusChangedPayloadSchema,
  new_applicant: newApplicantPayloadSchema,
  job_published: jobLifecyclePayloadSchema,
  job_archived: jobLifecyclePayloadSchema,
  job_closed: jobLifecyclePayloadSchema,
} satisfies Record<z.infer<typeof notificationTypeSchema>, z.ZodTypeAny>;

const notificationTone = {
  application_status_changed: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  new_applicant: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  job_published: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  job_archived: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  job_closed: "bg-red-500/10 text-red-700 dark:text-red-300",
} as const;

const formatApplicationStatusLabel = (status: z.infer<typeof applicationStatusSchema>) => {
  switch (status) {
    case "applied":
      return "Applied";
    case "interviewing":
      return "Interviewing";
    case "evaluated":
      return "Evaluated";
    case "rejected":
      return "Rejected";
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
      body: `${payload.data.jobTitle} is now ${formatApplicationStatusLabel(payload.data.status).toLowerCase()}.`,
      to: "/dashboard/application/$applicationId" as const,
      params: { applicationId: payload.data.applicationId },
    };
  }

  if (type === "new_applicant") {
    const payload = notificationPayloadSchemas.new_applicant.safeParse(
      toRecord(notification.payload),
    );
    if (!payload.success) {
      return null;
    }

    return {
      type,
      tone: notificationTone[type],
      title: `New applicant for ${payload.data.jobTitle}`,
      body: `${payload.data.candidateName} just applied.`,
      to: "/dashboard/applicants/$applicationId" as const,
      params: { applicationId: payload.data.applicationId },
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
      body: `Your job posting is now accepting applications.`,
    },
    job_archived: {
      title: `${jobPayload.data.jobTitle} has been archived`,
      body: `This job is no longer accepting applications.`,
    },
    job_closed: {
      title: `${jobPayload.data.jobTitle} has closed`,
      body: `This job posting has expired.`,
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
