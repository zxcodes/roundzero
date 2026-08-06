import { MATCHING_CONFIG } from "./config";
import type { CandidateMatchingProfile, JobMatchingProfile, MatchReason } from "./schemas";

type EvidencePair = { candidateItemId: string; jobItemId: string };
type Item = { id: string; label: string; context?: string };

const candidateItems = (profile: CandidateMatchingProfile): Item[] => [
  ...profile.roleIdentities,
  ...profile.capabilities,
  ...profile.technologies,
  ...profile.domains,
];
const jobItems = (profile: JobMatchingProfile): Item[] => [
  profile.roleIdentity,
  ...profile.responsibilities,
  ...profile.requiredCapabilities,
  ...profile.preferredCapabilities,
  ...profile.requiredTechnologies,
  ...profile.preferredTechnologies,
  ...profile.domains,
];

export function validateAndRenderEvidence(
  candidate: CandidateMatchingProfile,
  job: JobMatchingProfile,
  pairs: EvidencePair[],
): MatchReason[] {
  const candidates = new Map(candidateItems(candidate).map((item) => [item.id, item]));
  const jobs = new Map(jobItems(job).map((item) => [item.id, item]));
  const used = new Set<string>();
  return pairs.flatMap((pair) => {
    const candidateItem = candidates.get(pair.candidateItemId);
    const jobItem = jobs.get(pair.jobItemId);
    const key = `${pair.candidateItemId}:${pair.jobItemId}`;
    if (!candidateItem || !jobItem || used.has(key)) return [];
    used.add(key);
    return [
      {
        candidateFactId: candidateItem.id,
        jobFactId: jobItem.id,
        text: `${candidateItem.label} aligns with ${jobItem.label.toLowerCase()}.`.slice(0, 240),
      },
    ];
  });
}

export const capScoreForEvidence = (
  score: number,
  reasons: MatchReason[],
  roleFunctionScore: number,
): number | null => {
  if (reasons.length === 0 || roleFunctionScore < 50) return null;
  const candidateItems = new Set(reasons.map((reason) => reason.candidateFactId)).size;
  const jobItems = new Set(reasons.map((reason) => reason.jobFactId)).size;
  if (candidateItems < 2 || jobItems < 2) {
    return Math.min(score, MATCHING_CONFIG.bands.good - 1);
  }
  return score;
};

export const scoreMatchDimensions = (dimensions: {
  roleFunction: number;
  capabilitiesResponsibilities: number;
  technologies: number;
  seniority: number;
  domain: number;
}): number =>
  Math.round(
    dimensions.roleFunction * 0.35 +
      dimensions.capabilitiesResponsibilities * 0.3 +
      dimensions.technologies * 0.15 +
      dimensions.seniority * 0.15 +
      dimensions.domain * 0.05,
  );
