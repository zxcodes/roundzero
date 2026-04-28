import { z } from "zod";

export const jobStatusSchema = z.enum(["draft", "open", "closed"]);

export const applicationStatusSchema = z.enum([
  "applied",
  "pre_screening",
  "interview_invited",
  "interview_in_progress",
  "evaluated",
  "shortlisted",
  "rejected",
  "withdrawn",
]);

export const notificationTypeSchema = z.enum([
  "application_status_changed",
  "application_withdrawn",
  "report_ready",
  "interview_invited",
  "interview_expired",
  "position_filled",
  "job_published",
  "job_archived",
  "job_closed",
]);
