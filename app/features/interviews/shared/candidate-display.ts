type InterviewAwareMeta = {
  badge: string;
  tone: string;
};

export const interviewExpiredCandidateMeta = {
  badge: "Interview expired",
  tone: "border-danger/20 bg-danger/10 text-danger",
  summary: "Your interview window closed before you finished.",
  nextStep: "The company may send a new invite if they want to continue your evaluation.",
  blurb: "Interview window expired before completion",
} as const;

export const interviewUnderReviewCandidateMeta = {
  badge: "Awaiting company decision",
  tone: "border-success/20 bg-success/10 text-success",
  summary: "Your interview is complete and the company is now reviewing your evaluation.",
  nextStep: "You are waiting on a decision after review.",
  blurb: "Interview completed. Awaiting company decision",
} as const;

export function resolveInterviewAwareCandidateMeta<T extends InterviewAwareMeta>(
  applicationStatus: string,
  interviewStatus: string | null,
  baseMeta: T,
): T {
  if (interviewStatus === "expired") {
    return { ...baseMeta, ...interviewExpiredCandidateMeta };
  }

  if (
    (applicationStatus === "interview_invited" || applicationStatus === "interview_in_progress") &&
    interviewStatus === "completed"
  ) {
    return { ...baseMeta, ...interviewUnderReviewCandidateMeta };
  }

  return baseMeta;
}

export function pickPreferredInterviewId(
  interviews: Array<{ id: string; status: string }>,
): string | null {
  if (interviews.length === 0) {
    return null;
  }

  const priority = ["in_progress", "pending", "completed", "expired", "cancelled"] as const;
  for (const status of priority) {
    const match = interviews.find((interview) => interview.status === status);
    if (match) {
      return match.id;
    }
  }

  return interviews[0]?.id ?? null;
}
