import { z } from "zod";
import { applicationStatusSchema, notificationTypeSchema } from "@/shared/enums";

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

export const notificationPayloadSchemas = {
  application_status_changed: applicationStatusChangedPayloadSchema,
  new_applicant: newApplicantPayloadSchema,
} satisfies Record<z.infer<typeof notificationTypeSchema>, z.ZodTypeAny>;

const notificationTone = {
  application_status_changed: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  new_applicant: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
} as const;

const formatStatusLabel = (status: z.infer<typeof applicationStatusSchema>) => {
  switch (status) {
    case "interviewing":
      return "Interviewing";
    case "evaluated":
      return "Evaluated";
    case "rejected":
      return "Closed";
    default:
      return "Applied";
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
      body: `${payload.data.jobTitle} is now ${formatStatusLabel(payload.data.status).toLowerCase()}.`,
      to: "/dashboard/application/$applicationId" as const,
      params: { applicationId: payload.data.applicationId },
    };
  }

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
};
