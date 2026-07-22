import { MATCHING_CONFIG } from "./config";
import { hashStableValue } from "./hash";

type FingerprintJob = {
  id: string;
  profileSourceHash: string;
  location: string | null;
  workplaceType: string | null;
};

export const candidateFeedInputHash = async (
  candidateSourceHash: string,
  jobs: FingerprintJob[],
): Promise<string> =>
  hashStableValue({
    candidateSourceHash,
    candidateProfileVersion: MATCHING_CONFIG.candidateProfileVersion,
    algorithmVersion: MATCHING_CONFIG.algorithmVersion,
    thresholdVersion: MATCHING_CONFIG.thresholdVersion,
    rerankerPromptVersion: MATCHING_CONFIG.rerankerPromptVersion,
    jobs: jobs
      .map((job) => ({
        id: job.id,
        profileSourceHash: job.profileSourceHash,
        location: job.location,
        workplaceType: job.workplaceType,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });
