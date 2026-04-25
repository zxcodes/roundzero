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
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

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

/** Valid status transitions for applications.
 *
 * System auto-advances: applied -> pre_screening -> interview_invited -> interview_in_progress -> evaluated
 * Companies can reject at any pre-evaluation stage and can move evaluated -> shortlisted | rejected
 * Candidates can withdraw from any non-terminal state.
 */
export const APPLICATION_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ["pre_screening", "rejected", "withdrawn"],
  pre_screening: ["interview_invited", "rejected", "withdrawn"],
  interview_invited: ["interview_in_progress", "rejected", "withdrawn"],
  interview_in_progress: ["evaluated", "rejected", "withdrawn"],
  evaluated: ["shortlisted", "rejected"],
  shortlisted: ["rejected"],
  rejected: [],
  withdrawn: [],
};

/** Candidate-visible status labels. Internal pre-evaluation stages are hidden. */
export const applicationStatusCandidateLabelMap: Record<ApplicationStatus, string> = {
  applied: "Application Received",
  pre_screening: "Application Received",
  interview_invited: "Interview Ready",
  interview_in_progress: "Interview in Progress",
  evaluated: "Under Review",
  shortlisted: "Shortlisted",
  rejected: "Not Moving Forward",
  withdrawn: "Withdrawn",
};

/** Map internal status to the candidate-visible status. */
export function getVisibleApplicationStatus(status: ApplicationStatus): ApplicationStatus {
  if (status === "pre_screening") return "applied";
  return status;
}

/** Returns true if the transition from `current` to `next` is valid. */
export const isValidTransition = (current: ApplicationStatus, next: ApplicationStatus): boolean =>
  (APPLICATION_STATUS_TRANSITIONS[current] ?? []).includes(next);

export const companySizeSchema = z.enum([
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
]);
export type CompanySize = z.infer<typeof companySizeSchema>;

export const industrySchema = z.enum([
  "technology",
  "finance",
  "healthcare",
  "education",
  "ecommerce",
  "media",
  "gaming",
  "saas",
  "consulting",
  "other",
]);
export type Industry = z.infer<typeof industrySchema>;

export const salaryCurrencySchema = z.enum(["USD", "EUR", "GBP", "CAD", "AUD", "INR"]);
export type SalaryCurrency = z.infer<typeof salaryCurrencySchema>;

// Display label helpers

export const companySizeLabels: Record<CompanySize, string> = {
  "1-10": "1–10 employees",
  "11-50": "11–50 employees",
  "51-200": "51–200 employees",
  "201-500": "201–500 employees",
  "501-1000": "501–1,000 employees",
  "1000+": "1,000+ employees",
};

export const industryLabels: Record<Industry, string> = {
  technology: "Technology",
  finance: "Finance",
  healthcare: "Healthcare",
  education: "Education",
  ecommerce: "E-commerce",
  media: "Media & Entertainment",
  gaming: "Gaming",
  saas: "SaaS",
  consulting: "Consulting",
  other: "Other",
};

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

export const salaryCurrencyLabels: Record<SalaryCurrency, string> = {
  USD: "USD ($)",
  EUR: "EUR (€)",
  GBP: "GBP (£)",
  CAD: "CAD (C$)",
  AUD: "AUD (A$)",
  INR: "INR (₹)",
};

export const MAX_COMPANY_DESCRIPTION_LENGTH = 5000;
