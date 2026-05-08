/** Batch orchestration configuration.
 *
 * All timing and sizing constants live here so they can be tuned in one place.
 * Change values and redeploy — no env vars needed.
 */
export const BATCH_CONFIG = {
  /** How long a candidate has to complete their interview after batch launch. */
  INTERVIEW_EXPIRY_MS: 12 * 60 * 60 * 1000,

  /** Max time to pool candidates before launching a partial batch. */
  POOL_FORMATION_TIMEOUT_MS: 12 * 60 * 60 * 1000,

  /** Minimum candidates needed to launch before timeout. */
  MIN_BATCH_SIZE: 3,

  /** Default target batch size (capped by job.final_report_target). */
  DEFAULT_TARGET_SIZE: 5,

  /** How often to check pool formation (in addition to post-eval triggers). */
  POOL_CHECK_INTERVAL_MS: 6 * 60 * 60 * 1000,

  /** Pool size needed to auto-launch next batch after a release. */
  BACKFILL_THRESHOLD: 5,
} as const;

export type BatchStatus = "forming" | "active" | "released";

export const BATCH_STATUSES: BatchStatus[] = ["forming", "active", "released"];
