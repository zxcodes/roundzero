export type JobApplicantsFilter =
  | "all"
  | "screening"
  | "queued"
  | "active_interview"
  | "awaiting_decision"
  | "shortlisted"
  | "rejected"
  | "withdrawn"
  | "evaluation_failed";

export type JobApplicantListItem = {
  status: string;
  reportReleasedAt: Date | null;
};

/** True when a released report is waiting on a shortlist/reject decision. */
export function isAwaitingCompanyDecision(applicant: JobApplicantListItem): boolean {
  if (applicant.reportReleasedAt === null) {
    return false;
  }

  return applicant.status === "evaluated" || applicant.status === "evaluated_held";
}

export function matchesJobApplicantsFilter(
  applicant: JobApplicantListItem,
  filter: JobApplicantsFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "screening") return applicant.status === "pre_screening";
  if (filter === "queued") return applicant.status === "queued_for_batch";
  if (filter === "active_interview") {
    return (
      applicant.status === "interview_invited" ||
      applicant.status === "interview_in_progress" ||
      applicant.status === "evaluated_held"
    );
  }
  if (filter === "awaiting_decision") return isAwaitingCompanyDecision(applicant);
  if (filter === "shortlisted") return applicant.status === "shortlisted";
  if (filter === "rejected") return applicant.status === "rejected";
  if (filter === "withdrawn") return applicant.status === "withdrawn";
  return applicant.status === "evaluation_failed";
}
