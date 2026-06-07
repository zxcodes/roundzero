import { isDev, isStaging } from "@/shared/env.app";

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

  /** Minimum candidates needed to launch before timeout. Local dev uses 1 for easier testing. */
  MIN_BATCH_SIZE: isDev || isStaging ? 1 : 3,

  /** Default target batch size (capped by job.final_report_target). Local dev uses 1. */
  DEFAULT_TARGET_SIZE: isDev || isStaging ? 1 : 5,

  /** How often to check pool formation (in addition to post-eval triggers). */
  POOL_CHECK_INTERVAL_MS: 6 * 60 * 60 * 1000,

  /** Pool size needed to auto-launch next batch after a release. Local dev uses 1. */
  BACKFILL_THRESHOLD: isDev || isStaging ? 1 : 5,
} as const;
