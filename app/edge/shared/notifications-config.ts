import { z } from "zod";
import {
  applicationStatusSchema,
  jobStatusSchema,
  type notificationTypeSchema,
} from "@/shared/enums";

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
