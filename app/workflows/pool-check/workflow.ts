import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { getJobsWithQueuedCandidates } from "@/features/batches/queries/queries_sql";
import type { PoolCheckResult } from "@/features/batches/server/orchestration";
import { checkAndLaunchBatch } from "@/features/batches/server/orchestration";
import { getDb } from "@/shared/db";

function formatResult(r: PoolCheckResult, jobId: string) {
  if (r.launched) {
    return { jobId, launched: true as const, batchId: r.batchId };
  }
  return { jobId, launched: false as const, reason: r.reason };
}

export class PoolCheckWorkflow extends WorkflowEntrypoint<Env> {
  async run(_event: WorkflowEvent<unknown>, step: WorkflowStep) {
    const sql = getDb();
    const jobs = await getJobsWithQueuedCandidates(sql);

    if (jobs.length === 0) {
      return { checked: 0 };
    }

    const results: Array<ReturnType<typeof formatResult>> = [];

    for (const job of jobs) {
      const result = await step.do(
        `check-batch-${job.id}`,
        {
          retries: {
            limit: 2,
            delay: "30 seconds",
            backoff: "exponential",
          },
        },
        async () => {
          const poolResult = await checkAndLaunchBatch(job.id);
          return formatResult(poolResult, job.id);
        },
      );
      results.push(result);
    }

    return { checked: jobs.length, results };
  }
}
