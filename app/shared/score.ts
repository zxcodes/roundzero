/** Candidate scores are stored and produced on a 0–10 scale (one decimal). */
export const CANDIDATE_SCORE_MAX = 10;
export const CANDIDATE_SCORE_MIN = 0;
export const CANDIDATE_SCORE_DEFAULT = 5;

export function clampCandidateScore(value: unknown, fallback = CANDIDATE_SCORE_DEFAULT): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const clamped = Math.max(CANDIDATE_SCORE_MIN, Math.min(CANDIDATE_SCORE_MAX, raw));
  return Math.round(clamped * 10) / 10;
}

export function formatCandidateScore(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) {
    return "—";
  }
  const normalized = clampCandidateScore(score);
  return normalized % 1 === 0 ? normalized.toFixed(0) : normalized.toFixed(1);
}

export function formatCandidateScoreWithScale(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) {
    return "—";
  }
  return `${formatCandidateScore(score)}/${CANDIDATE_SCORE_MAX}`;
}

/** Progress bar fill from a stored 0–10 score. */
export function candidateScoreProgressPercent(score: number): number {
  const normalized = clampCandidateScore(score);
  return Math.round(Math.max(0, Math.min(100, (normalized / CANDIDATE_SCORE_MAX) * 100)));
}
