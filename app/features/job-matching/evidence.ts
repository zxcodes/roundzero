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

const renderEvidenceText = (
  candidateFact: CandidateMatchingProfile["facts"][number],
  jobFact: JobMatchingProfile["facts"][number],
): string => {
  switch (candidateFact.category) {
    case "role_family":
      return `Your ${candidateFact.label.toLowerCase()} background aligns with this role.`;
    case "skill":
      return `Your ${candidateFact.label} experience matches a ${jobFact.category === "required_skill" ? "required" : "preferred"} skill.`;
    case "seniority":
      return `Your ${candidateFact.label.toLowerCase()} experience aligns with this role's level.`;
    case "domain":
      return `Your ${candidateFact.label.toLowerCase()} background is relevant to this role.`;
    case "responsibility":
      return `Your experience with ${candidateFact.label.toLowerCase()} aligns with this role's responsibilities.`;
    case "education":
      return `Your ${candidateFact.label.toLowerCase()} background aligns with this role's education needs.`;
    case "certification":
      return `Your ${candidateFact.label} certification is relevant to this role.`;
  }
};

export function validateAndRenderEvidence(
  candidate: CandidateMatchingProfile,
  job: JobMatchingProfile,
  pairs: EvidencePair[],
): MatchReason[] {
  const candidateFacts = new Map(candidate.facts.map((fact) => [fact.id, fact]));
  const jobFacts = new Map(job.facts.map((fact) => [fact.id, fact]));
  const pairKeys = new Set<string>();

  const renderPair = (pair: EvidencePair): MatchReason[] => {
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
        text: renderEvidenceText(candidateFact, jobFact),
      },
    ];
  };

  const selected = pairs.flatMap(renderPair);
  if (selected.length >= 3) return selected;

  for (const candidateFact of candidate.facts) {
    for (const jobFact of job.facts) {
      if (selected.length >= 3) return selected;
      selected.push(...renderPair({ candidateFactId: candidateFact.id, jobFactId: jobFact.id }));
    }
  }

  return selected;
}

export const capScoreForEvidence = (score: number, evidenceCount: number): number | null => {
  if (evidenceCount === 0) return null;
  return evidenceCount >= 2 ? score : Math.min(score, MATCHING_CONFIG.bands.good - 1);
};
