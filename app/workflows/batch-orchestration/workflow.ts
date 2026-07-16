import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import {
  dispatchBatchDigest,
  maybeLaunchNextBatch,
  reconcileBatchRelease,
} from "@/features/batches/server/orchestration";
import { createWorkflowLogger } from "@/shared/logger";

type BatchPayload = {
  batchId: string;
  jobId: string;
};

export class BatchOrchestrationWorkflow extends WorkflowEntrypoint<Env, BatchPayload> {
  async run(event: WorkflowEvent<BatchPayload>, step: WorkflowStep) {
    const { batchId, jobId } = event.payload;
    const log = createWorkflowLogger("batch-orchestration", batchId);

    log.info(`Batch orchestration started for batch ${batchId}, job ${jobId}`);

    let timedOut = false;
    try {
      // Wait for either:
      // 1. All reports ready (early signal from post-evaluation)
      // 2. Interview expiry timeout (12 hours)
      await step.waitForEvent("wait-for-batch-completion", {
        type: "batch-reports-complete",
        timeout: "12 hours",
      });

      log.info("Batch completion signaled early");
    } catch {
      timedOut = true;
      log.info("Batch timeout reached, releasing anyway");
    }

    // Reconcile durable DB state separately from retryable provider delivery.
    await step.do("release-batch", async () => {
      const result = await reconcileBatchRelease(batchId, {
        expireDueInterviews: timedOut,
      });
      if (result.released) {
        log.info(`Batch ${batchId} released with ${result.reportCount} report(s)`);
      } else {
        log.info(`Batch release skipped: ${result.reason}`);
      }
    });

    await step.do("dispatch-batch-digest", async () => {
      await dispatchBatchDigest(batchId);
    });

    // Check for backfill
    await step.do("check-backfill", async () => {
      const result = await maybeLaunchNextBatch(jobId);
      if (result.launched) {
        log.info(
          `Backfill launched: batch ${result.batchId} with ${result.candidateCount} candidates`,
        );
      }
    });

    log.info(`Batch orchestration complete: ${batchId}`);

    return { batchId, status: "released" as const };
  }
}
