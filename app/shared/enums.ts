import { z } from "zod";

export const userRoleSchema = z.enum(["company", "candidate"]);
export type UserRole = z.infer<typeof userRoleSchema>;

/** Roles assignable via invitation — `owner` is never invitable. */
export const companyInvitationRoleSchema = z.enum(["admin", "member"]);
export type CompanyInvitationRole = z.infer<typeof companyInvitationRoleSchema>;

export const companyMemberRoleSchema = z.enum(["owner", "admin", "member"]);
export type CompanyMemberRole = z.infer<typeof companyMemberRoleSchema>;

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
  "queued_for_batch",
  "interview_invited",
  "interview_in_progress",
  "evaluated",
  "evaluated_held",
  "shortlisted",
  "rejected",
  "withdrawn",
  "evaluation_failed",
]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const notificationTypeSchema = z.enum([
  "application_status_changed",
  "application_withdrawn",
  "batch_ready",
  "report_ready",
  "interview_invited",
  "position_filled",
  "job_published",
  "job_archived",
  "job_closed",
]);

/** Valid status transitions for applications.
 *
 * System auto-advances: applied -> pre_screening -> queued_for_batch -> interview_invited -> interview_in_progress -> evaluated_held -> evaluated
 * Companies can reject at any pre-evaluation stage and can move evaluated -> shortlisted | rejected
 * Candidates can withdraw from any non-terminal state.
 */
export const APPLICATION_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ["pre_screening", "rejected", "withdrawn"],
  pre_screening: ["queued_for_batch", "interview_invited", "rejected", "withdrawn"],
  queued_for_batch: ["interview_invited", "rejected", "withdrawn"],
  interview_invited: ["interview_in_progress", "rejected", "withdrawn"],
  interview_in_progress: ["evaluated_held", "rejected", "withdrawn"],
  evaluated_held: ["evaluated", "rejected"],
  evaluated: ["shortlisted", "rejected"],
  shortlisted: ["rejected"],
  rejected: [],
  withdrawn: [],
  // AI evaluation crashed (pre- or post-eval). Companies can manually push
  // the application forward to interview_invited as a recovery path so a
  // failed automated screen does not strand the candidate.
  evaluation_failed: ["interview_invited", "rejected", "withdrawn"],
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

export const MAX_COMPANY_DESCRIPTION_LENGTH = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// Application status — single source of truth for labels & tone classes.
// Used across dashboard, applicants list, applicant detail, batches, and
// candidate side. Do NOT redefine these in components.

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  applied: "Applied",
  pre_screening: "Screening",
  queued_for_batch: "Queued",
  interview_invited: "Invited",
  interview_in_progress: "Interviewing",
  evaluated_held: "Held",
  evaluated: "Awaiting decision",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  evaluation_failed: "Eval failed",
};

/** Contextual label for UI — e.g. pre_screening + score → "Screened". */
export function getApplicationStatusLabel(
  status: ApplicationStatus,
  options?: { preEvaluationScore?: number | null },
): string {
  if (status === "pre_screening" && options?.preEvaluationScore != null) {
    return "Screened";
  }
  return applicationStatusLabels[status];
}

export type ApplicationStatusTone = {
  /** Tailwind classes for a Badge background + border + text. */
  badge: string;
  /** Tailwind classes for a small status dot. */
  dot: string;
};

export const applicationStatusMeta: Record<ApplicationStatus, ApplicationStatusTone> = {
  applied: {
    badge: "border-info/20 bg-info/10 text-info",
    dot: "bg-info",
  },
  pre_screening: {
    badge: "border-warning/20 bg-warning/10 text-warning",
    dot: "bg-warning",
  },
  queued_for_batch: {
    badge: "border-pending/20 bg-pending/10 text-pending",
    dot: "bg-pending",
  },
  interview_invited: {
    badge: "border-active/20 bg-active/10 text-active",
    dot: "bg-active",
  },
  interview_in_progress: {
    badge: "border-warning/20 bg-warning/10 text-warning",
    dot: "bg-warning",
  },
  evaluated_held: {
    badge: "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
  evaluated: {
    badge: "border-success/20 bg-success/10 text-success",
    dot: "bg-success",
  },
  shortlisted: {
    badge: "border-progress/20 bg-progress/10 text-progress",
    dot: "bg-progress",
  },
  rejected: {
    badge: "border-danger/20 bg-danger/10 text-danger",
    dot: "bg-danger",
  },
  withdrawn: {
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
  evaluation_failed: {
    badge: "border-danger/20 bg-danger/10 text-danger",
    dot: "bg-danger",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation (output of evaluation reports) — labels & tone.

export const recommendationSchema = z.enum(["strong_yes", "yes", "lean_no", "no"]);
export type Recommendation = z.infer<typeof recommendationSchema>;

export const recommendationLabels: Record<Recommendation, string> = {
  strong_yes: "Strong shortlist",
  yes: "Shortlist",
  lean_no: "Borderline",
  no: "Reject",
};

export const recommendationBadgeTone: Record<Recommendation, string> = {
  strong_yes: "border-success/20 bg-success/10 text-success",
  yes: "border-info/20 bg-info/10 text-info",
  lean_no: "border-warning/20 bg-warning/10 text-warning",
  no: "border-danger/20 bg-danger/10 text-danger",
};
