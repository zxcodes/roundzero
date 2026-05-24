import type { Sql } from "postgres";
import { z } from "zod";
import { getApplicationById } from "@/features/applications/queries/queries_sql";
import type { getInterviewContextById } from "@/features/interviews/queries/queries_sql";
import { buildCandidateProfileSummary } from "@/shared/ai-candidate-profile";
import { LIMITS, sanitizeUntrustedText } from "@/shared/ai-refine";

const applicationMetadataSchema = z
  .object({
    resumeText: z.string().optional(),
    summary: z.string().optional(),
  })
  .passthrough();

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
  const applicationMetadata =
    applicationMetadataSchema.safeParse(application?.metadata ?? {}).data ?? {};
  const candidateSummaryRaw =
    applicationMetadata.resumeText ??
    applicationMetadata.summary ??
    buildCandidateProfileSummary(application?.metadata ?? {});

  return {
    interviewId: interview.id,
    applicationId: interview.applicationId,
    jobTitle: interview.jobTitle,
    companyName: interview.companyName,
    candidateName: interview.candidateName,
    candidateSummary: sanitizeUntrustedText(candidateSummaryRaw, LIMITS.CANDIDATE_SUMMARY),
  };
}
