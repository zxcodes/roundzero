import { MATCHING_CONFIG } from "./config";
import type { CandidateMatchingProfile, JobMatchingProfile } from "./schemas";

type RetrievalJob<T> = T & { id: string; createdAt: Date; profile: JobMatchingProfile };

const COMPATIBLE_FAMILIES: Partial<Record<string, string[]>> = {
  software_engineering: ["data_ai"],
  data_ai: ["software_engineering"],
  product_design: ["product_management"],
  product_management: ["product_design", "software_engineering"],
};

const candidateFamilies = (candidate: CandidateMatchingProfile) =>
  new Set([
    candidate.primaryFunctionalFamily,
    ...(COMPATIBLE_FAMILIES[candidate.primaryFunctionalFamily] ?? []),
  ]);

export const hasCompatibleFunction = (
  candidate: CandidateMatchingProfile,
  job: JobMatchingProfile,
): boolean => {
  const families = candidateFamilies(candidate);
  return job.functionalFamilies.some((family) => family !== "other" && families.has(family));
};

export function retrieveJobs<T>(
  candidate: CandidateMatchingProfile,
  jobs: Array<RetrievalJob<T>>,
): Array<RetrievalJob<T> & { retrievalScore: number }> {
  const ranked = jobs
    .filter((job) => hasCompatibleFunction(candidate, job.profile))
    .map((job) => ({
      ...job,
      retrievalScore: job.profile.functionalFamilies.includes(candidate.primaryFunctionalFamily)
        ? 100
        : 70,
    }))
    .sort((left, right) => {
      if (right.retrievalScore !== left.retrievalScore)
        return right.retrievalScore - left.retrievalScore;
      const createdDifference = right.createdAt.getTime() - left.createdAt.getTime();
      return createdDifference || left.id.localeCompare(right.id);
    });
  const primary = ranked.filter((job) => job.retrievalScore === 100);
  const adjacent = ranked.filter((job) => job.retrievalScore !== 100);
  const adjacentQuota = Math.ceil(MATCHING_CONFIG.retrievalLimit * 0.25);
  const selected = [
    ...primary.slice(0, MATCHING_CONFIG.retrievalLimit - adjacentQuota),
    ...adjacent.slice(0, adjacentQuota),
  ];
  const selectedIds = new Set(selected.map((job) => job.id));
  return [...selected, ...ranked.filter((job) => !selectedIds.has(job.id))].slice(
    0,
    MATCHING_CONFIG.retrievalLimit,
  );
}
