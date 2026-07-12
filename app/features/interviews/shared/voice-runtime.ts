import type { Sql } from "postgres";

import { getApplicationById } from "@/features/applications/queries/queries_sql";
import type { getInterviewContextById } from "@/features/interviews/queries/queries_sql";
import { loadCandidateSummaryFromApplication } from "@/features/interviews/shared/runtime";

export type VoiceAssessmentContext = {
  interviewId: string;
  applicationId: string;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  candidateSummary: string;
};

export async function loadVoiceAssessmentContext(
  db: Sql,
  interview: NonNullable<Awaited<ReturnType<typeof getInterviewContextById>>>,
): Promise<VoiceAssessmentContext> {
  const application = await getApplicationById(db, { id: interview.applicationId });

  return {
    interviewId: interview.id,
    applicationId: interview.applicationId,
    jobTitle: interview.jobTitle,
    companyName: interview.companyName,
    candidateName: interview.candidateName,
    candidateSummary: loadCandidateSummaryFromApplication(application?.metadata),
  };
}
