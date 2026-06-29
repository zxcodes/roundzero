/** Days after soft-delete before irreversible erasure. Keep in sync with queries.sql interval. */
export const ACCOUNT_ERASURE_GRACE_DAYS = 30;

/**
 * Max accounts processed per scheduled cleanup sweep (daily cron).
 * Monitor pending-erasure queue depth in prod; raise or add runs if backlog grows.
 */
export const ACCOUNT_CLEANUP_SWEEP_LIMIT = 50;
