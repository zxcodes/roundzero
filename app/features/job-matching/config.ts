export const MATCHING_CONFIG = {
  candidateProfileVersion: "candidate-profile-v4",
  jobProfileVersion: "job-profile-v2",
  algorithmVersion: "qualification-overlap-v2",
  thresholdVersion: "bands-v2",
  rerankerPromptVersion: "job-reranker-v2",
  feedStaleMs: 24 * 60 * 60 * 1000,
  resumeStaleMs: 180 * 24 * 60 * 60 * 1000,
  refreshLeaseMs: 30 * 60 * 1000,
  retrievalLimit: 25,
  retrievalMinimum: 15,
  reconciliationCandidateLimit: 250,
  reconciliationJobLimit: 100,
  digestJobLimit: 10,
  weights: {
    roleFamily: 40,
    requiredSkill: 25,
    seniority: 15,
    domain: 10,
    preferredSkill: 10,
  },
  bands: {
    strong: 80,
    good: 60,
  },
} as const;

export type MatchBand = "strong" | "good" | "potential";

export const deriveMatchBand = (score: number): MatchBand => {
  if (score >= MATCHING_CONFIG.bands.strong) return "strong";
  if (score >= MATCHING_CONFIG.bands.good) return "good";
  return "potential";
};
