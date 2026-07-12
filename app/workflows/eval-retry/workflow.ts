import { env, WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import { listStaleEvaluationFailedApplications } from "@/features/applications/queries/queries_sql";
import {
  EVAL_RETRY_AUTO_CAP,
  EVAL_RETRY_SWEEP_LIMIT,
  type RetryEvaluationResult,
  retryEvaluation,
} from "@/features/applications/services/retry";
import { getDb } from "@/shared/db";

type SweepEntry =
  | { applicationId: string; status: "ok"; result: RetryEvaluationResult }
  | { applicationId: string; status: "error"; message: string };

/**
 * Scheduled sweep that recovers applications stranded in `evaluation_failed`.
 * Picks up to {@link EVAL_RETRY_SWEEP_LIMIT} stale rows past the 15 min
 * cool-down (encoded in the SQL query) whose retry counter is below the
 * {@link EVAL_RETRY_AUTO_CAP}. Each retry runs in its own `step.do` so a
 * single failing application cannot block the rest of the sweep.
 */
export class EvalRetryWorkflow extends WorkflowEntrypoint<Env> {
  async run(_event: WorkflowEvent<unknown>, step: WorkflowStep) {
    const rows = await step.do(
      "list_stale_applications",
      { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" } },
      async () => {
        const sql = getDb();
        return await listStaleEvaluationFailedApplications(sql, {
          cap: EVAL_RETRY_AUTO_CAP,
          rowlimit: EVAL_RETRY_SWEEP_LIMIT,
        });
      },
    );

    if (rows.length === 0) {
      return { swept: 0 };
    }

    const results: SweepEntry[] = [];
    for (const row of rows) {
      const entry = await step.do(
        `retry-${row.id}`,
        {
          retries: { limit: 1, delay: "10 seconds", backoff: "exponential" },
        },
        async (): Promise<SweepEntry> => {
          try {
            const db = getDb();
            const result = await retryEvaluation(
              db,
              row.id,
              { preEvaluation: env.PRE_EVALUATION, postEvaluation: env.POST_EVALUATION },
              { cap: EVAL_RETRY_AUTO_CAP, source: "cron" },
            );
            return { applicationId: row.id, status: "ok", result };
          } catch (error) {
            return {
              applicationId: row.id,
              status: "error",
              message: error instanceof Error ? error.message : String(error),
            };
          }
        },
      );
      results.push(entry);
    }

    return { swept: rows.length, results };
  }
}
