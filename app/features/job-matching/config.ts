export const MATCHING_CONFIG = {
  candidateProfileVersion: "candidate-profile-v6-semantic",
  jobProfileVersion: "job-profile-v4-markdown",
  algorithmVersion: "semantic-fit-v5",
  thresholdVersion: "semantic-bands-v3",
  rerankerPromptVersion: "job-reranker-v3-semantic",
  feedStaleMs: 24 * 60 * 60 * 1000,
  resumeStaleMs: 180 * 24 * 60 * 60 * 1000,
  refreshLeaseMs: 30 * 60 * 1000,
  retrievalLimit: 25,
  reconciliationCandidateLimit: 250,
  reconciliationJobLimit: 100,
  workflowDispatchBatchSize: 3,
  workflowDispatchIntervalMs: 10_000,
  digestJobLimit: 10,
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
