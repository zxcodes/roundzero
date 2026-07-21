import { MATCHING_CONFIG } from "./config";
import type { CandidateMatchingProfile, JobMatchingProfile, MatchReason } from "./schemas";

type EvidencePair = { candidateFactId: string; jobFactId: string };

const compatibleJobCategories: Record<
  CandidateMatchingProfile["facts"][number]["category"],
  Set<JobMatchingProfile["facts"][number]["category"]>
> = {
  role_family: new Set(["role_family"]),
  skill: new Set(["required_skill", "preferred_skill"]),
  seniority: new Set(["seniority"]),
  domain: new Set(["domain"]),
  responsibility: new Set(["responsibility"]),
  education: new Set(["education"]),
  certification: new Set(["certification"]),
};

export function validateAndRenderEvidence(
  candidate: CandidateMatchingProfile,
  job: JobMatchingProfile,
  pairs: EvidencePair[],
): MatchReason[] {
  const candidateFacts = new Map(candidate.facts.map((fact) => [fact.id, fact]));
  const jobFacts = new Map(job.facts.map((fact) => [fact.id, fact]));
  const pairKeys = new Set<string>();

  return pairs.flatMap((pair) => {
    const candidateFact = candidateFacts.get(pair.candidateFactId);
    const jobFact = jobFacts.get(pair.jobFactId);
    if (!candidateFact || !jobFact) return [];

    const key = `${pair.candidateFactId}:${pair.jobFactId}`;
    if (pairKeys.has(key)) return [];
    pairKeys.add(key);

    if (
      candidateFact.canonicalId !== jobFact.canonicalId ||
      !compatibleJobCategories[candidateFact.category].has(jobFact.category)
    ) {
      return [];
    }

    return [
      {
        candidateFactId: pair.candidateFactId,
        jobFactId: pair.jobFactId,
        text: `${candidateFact.label} aligns with ${jobFact.label}.`,
      },
    ];
  });
}

export const capScoreForEvidence = (score: number, evidenceCount: number): number =>
  evidenceCount >= 2 ? score : Math.min(score, MATCHING_CONFIG.bands.good - 1);
