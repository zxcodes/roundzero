import { MATCHING_CONFIG } from "./config";
import type { CandidateMatchingProfile, JobMatchingProfile } from "./schemas";

type RetrievalJob<T> = T & {
  id: string;
  createdAt: Date;
  profile: JobMatchingProfile;
};

const candidateIds = (profile: CandidateMatchingProfile, category: string): Set<string> =>
  new Set(
    profile.facts.filter((fact) => fact.category === category).map((fact) => fact.canonicalId),
  );

const overlapRatio = (candidate: Set<string>, job: JobMatchingProfile, categories: string[]) => {
  const jobIds = job.facts
    .filter((fact) => categories.includes(fact.category))
    .map((fact) => fact.canonicalId);
  if (jobIds.length === 0) return 0;
  return jobIds.filter((id) => candidate.has(id)).length / jobIds.length;
};

export function scoreRetrievalJob(
  candidate: CandidateMatchingProfile,
  job: JobMatchingProfile,
): number {
  const roles = candidateIds(candidate, "role_family");
  const skills = candidateIds(candidate, "skill");
  const seniority = candidateIds(candidate, "seniority");
  const domains = candidateIds(candidate, "domain");
  const responsibilities = candidateIds(candidate, "responsibility");

  const roleAlignment = Math.max(
    overlapRatio(roles, job, ["role_family"]),
    overlapRatio(responsibilities, job, ["responsibility"]),
  );

  return (
    roleAlignment * MATCHING_CONFIG.weights.roleFamily +
    overlapRatio(skills, job, ["required_skill"]) * MATCHING_CONFIG.weights.requiredSkill +
    overlapRatio(seniority, job, ["seniority"]) * MATCHING_CONFIG.weights.seniority +
    overlapRatio(domains, job, ["domain"]) * MATCHING_CONFIG.weights.domain +
    overlapRatio(skills, job, ["preferred_skill"]) * MATCHING_CONFIG.weights.preferredSkill
  );
}

export function retrieveJobs<T>(
  candidate: CandidateMatchingProfile,
  jobs: Array<RetrievalJob<T>>,
): Array<RetrievalJob<T> & { retrievalScore: number }> {
  const scored = jobs
    .map((job) => ({ ...job, retrievalScore: scoreRetrievalJob(candidate, job.profile) }))
    .sort((left, right) => {
      if (right.retrievalScore !== left.retrievalScore) {
        return right.retrievalScore - left.retrievalScore;
      }
      const createdDifference = right.createdAt.getTime() - left.createdAt.getTime();
      if (createdDifference !== 0) return createdDifference;
      return left.id.localeCompare(right.id);
    });

  const positive = scored.filter((job) => job.retrievalScore > 0);
  const selected = positive.slice(0, MATCHING_CONFIG.retrievalLimit);
  if (selected.length >= MATCHING_CONFIG.retrievalMinimum) return selected;

  const selectedIds = new Set(selected.map((job) => job.id));
  const fallback = scored
    .filter((job) => !selectedIds.has(job.id))
    .sort((left, right) => {
      const createdDifference = right.createdAt.getTime() - left.createdAt.getTime();
      if (createdDifference !== 0) return createdDifference;
      return left.id.localeCompare(right.id);
    });

  return [...selected, ...fallback].slice(
    0,
    Math.min(MATCHING_CONFIG.retrievalMinimum, MATCHING_CONFIG.retrievalLimit),
  );
}
