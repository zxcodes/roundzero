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

export const notificationTypeSchema = z.enum([
  "application_status_changed",
  "new_applicant",
  "job_published",
  "job_archived",
  "job_closed",
]);

/** Valid status transitions for applications. */
export const APPLICATION_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ["interviewing", "rejected"],
  interviewing: ["evaluated", "rejected"],
  evaluated: ["rejected"],
  rejected: [],
};

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

export const jobStatusLabels: Record<JobStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
};

export const MAX_COMPANY_DESCRIPTION_LENGTH = 5000;
