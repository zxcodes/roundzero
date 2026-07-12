import { z } from "zod";

import {
  applicationStatusSchema,
  jobStatusSchema,
  type notificationTypeSchema,
} from "@/shared/enums";

const baseApplicationPayloadSchema = z.object({
  applicationId: z.string().uuid(),
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
});

const applicationStatusChangedPayloadSchema = baseApplicationPayloadSchema.extend({
  companyName: z.string().min(1),
  status: applicationStatusSchema,
  // Optional note attached on shortlist.
  note: z.string().nullish(),
  // True when the company updates an existing shortlist's note.
  isShortlistUpdate: z.boolean().optional(),
});

const applicationWithdrawnPayloadSchema = baseApplicationPayloadSchema.extend({
  candidateName: z.string().min(1),
});

const reportReadyPayloadSchema = baseApplicationPayloadSchema.extend({
  candidateName: z.string().min(1),
  score: z.number().optional(),
});

const batchReadyPayloadSchema = z.object({
  batchId: z.string().uuid(),
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
  reportCount: z.number().int().min(1),
  topScore: z.number().optional(),
  topCandidateName: z.string().optional(),
});

const interviewInvitedPayloadSchema = baseApplicationPayloadSchema.extend({
  interviewId: z.string().uuid(),
  interviewType: z.string().min(1),
  expiresAt: z.string().datetime(),
});

const positionFilledPayloadSchema = baseApplicationPayloadSchema;

const jobLifecyclePayloadSchema = z.object({
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1),
  status: jobStatusSchema,
});

export const notificationPayloadSchemas = {
  application_status_changed: applicationStatusChangedPayloadSchema,
  application_withdrawn: applicationWithdrawnPayloadSchema,
  batch_ready: batchReadyPayloadSchema,
  report_ready: reportReadyPayloadSchema,
  interview_invited: interviewInvitedPayloadSchema,
  position_filled: positionFilledPayloadSchema,
  job_published: jobLifecyclePayloadSchema,
  job_archived: jobLifecyclePayloadSchema,
  job_closed: jobLifecyclePayloadSchema,
} satisfies Record<z.infer<typeof notificationTypeSchema>, z.ZodTypeAny>;
