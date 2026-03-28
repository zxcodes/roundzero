import { z } from "zod";

export const userRoleSchema = z.enum(["company", "candidate"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const jobStatusSchema = z.enum(["draft", "open", "closed"]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const applicationStatusSchema = z.enum(["applied", "interviewing", "evaluated", "rejected"]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const interviewStatusSchema = z.enum(["pending", "in_progress", "completed", "expired"]);
export type InterviewStatus = z.infer<typeof interviewStatusSchema>;

export const recommendationSchema = z.enum(["strong_hire", "consider", "not_recommended"]);
export type Recommendation = z.infer<typeof recommendationSchema>;
