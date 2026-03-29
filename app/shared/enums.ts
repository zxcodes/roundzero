import { z } from "zod";

export const userRoleSchema = z.enum(["company", "candidate"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const jobStatusSchema = z.enum(["draft", "open", "closed"]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const workplaceTypeSchema = z.enum(["remote", "hybrid", "onsite"]);
export type WorkplaceType = z.infer<typeof workplaceTypeSchema>;

export const employmentTypeSchema = z.enum(["full_time", "part_time", "contract", "internship"]);
export type EmploymentType = z.infer<typeof employmentTypeSchema>;

export const experienceLevelSchema = z.enum([
  "junior",
  "mid",
  "senior",
  "staff",
  "lead",
  "principal",
]);
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;

export const applicationStatusSchema = z.enum(["applied", "interviewing", "evaluated", "rejected"]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

/** Valid status transitions for applications. */
export const APPLICATION_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ["interviewing", "rejected"],
  interviewing: ["evaluated", "rejected"],
  evaluated: ["rejected"],
  rejected: [],
};

/** Returns the list of statuses an application can transition to from the current status. */
export const getValidTransitions = (current: ApplicationStatus): ApplicationStatus[] =>
  APPLICATION_STATUS_TRANSITIONS[current] ?? [];

/** Returns true if the transition from `current` to `next` is valid. */
export const isValidTransition = (current: ApplicationStatus, next: ApplicationStatus): boolean =>
  getValidTransitions(current).includes(next);

export const interviewStatusSchema = z.enum(["pending", "in_progress", "completed", "expired"]);
export type InterviewStatus = z.infer<typeof interviewStatusSchema>;

export const recommendationSchema = z.enum(["strong_hire", "consider", "not_recommended"]);
export type Recommendation = z.infer<typeof recommendationSchema>;

// Display label helpers
export const workplaceTypeLabels: Record<WorkplaceType, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export const employmentTypeLabels: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

export const experienceLevelLabels: Record<ExperienceLevel, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  staff: "Staff",
  lead: "Lead",
  principal: "Principal",
};
