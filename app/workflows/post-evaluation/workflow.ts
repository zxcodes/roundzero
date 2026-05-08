import { env, WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { isBatchFullyResolved } from "@/features/batches/server/functions";
import { updateApplicationStatus } from "@/queries/applications/queries_sql";
import { getInterviewContextById } from "@/queries/interviews/queries_sql";
import { getDb } from "@/shared/db";
import { createWorkflowLogger } from "@/shared/logger";
import {
  generateReport,
  loadExistingReport,
  markApplicationEvaluated,
  markApplicationEvaluatedExisting,
  notifyReportReady,
  type PostEvaluationPayload,
  persistReport,
  readInterviewData,
  sendReportReadyEmail,
} from "./steps";

export class PostEvaluationWorkflow extends WorkflowEntrypoint<Env, PostEvaluationPayload> {
  async run(event: WorkflowEvent<PostEvaluationPayload>, step: WorkflowStep) {
    const { interviewId } = event.payload;
    const log = createWorkflowLogger("post-evaluation", interviewId);
    const db = getDb();
    let applicationId: string | null = null;

    try {
      const existingReport = await step.do(
        "load_existing_report",
        loadExistingReport(interviewId, db, log),
      );

      if (existingReport) {
        await step.do(
          "mark_application_evaluated_existing_report",
          markApplicationEvaluatedExisting(interviewId, db),
        );

        log.info(`Report already exists, skipping: ${existingReport.id}`);
        return { interviewId, reportId: existingReport.id, status: "already_exists" as const };
      }

      const interviewData = await step.do(
        "read_interview_data",
        readInterviewData(interviewId, db, log),
      );
      applicationId = interviewData.interview.applicationId;

      const reportDraft = await step.do("generate_report", generateReport(interviewData, log));

      const report = await step.do(
        "persist_report",
        persistReport(interviewId, interviewData, reportDraft, db, log),
      );

      await step.do("mark_application_evaluated_held", markApplicationEvaluated(interviewData, db));

      // Check if this interview belongs to a batch and if the batch is fully resolved
      const batchId = await step.do("check_batch_completion", async () => {
        const interview = await getInterviewContextById(db, { id: interviewId });
        return interview?.batchId ?? null;
      });

      if (batchId) {
        const fullyResolved = await step.do("check_batch_fully_resolved", async () => {
          return isBatchFullyResolved(db, batchId);
        });

        if (fullyResolved) {
          await step.do("signal_batch_complete", async () => {
            const instance = await env.BATCH_ORCHESTRATION.get(batchId);
            await instance.sendEvent({
              type: "batch-reports-complete",
              payload: { batchId },
            });
            log.info(`Sent early completion signal to batch ${batchId}`);
          });
        } else {
          log.info(`Report held in batch ${batchId}, waiting for remaining candidates`);
        }
      } else {
        // No batch — this is a non-batched report (legacy or manual). Send individual notification.
        const notification = await step.do(
          "notify_report_ready",
          notifyReportReady(interviewData, reportDraft, db, log),
        );

        await step.do(
          "send_report_ready_email",
          sendReportReadyEmail(interviewData, notification, reportDraft, db, log),
        );
      }

      log.info(`Post-evaluation complete: ${report.id}`);

      return { interviewId, reportId: report.id, status: "created" as const };
    } catch (error) {
      log.error("Workflow failed, marking application as evaluation_failed", error);
      await step.do(
        "mark_evaluation_failed",
        { retries: { limit: 5, delay: "5 seconds", backoff: "exponential" } },
        async () => {
          const targetApplicationId =
            applicationId ??
            (await getInterviewContextById(db, { id: interviewId }))?.applicationId;
          if (targetApplicationId) {
            await updateApplicationStatus(db, {
              id: targetApplicationId,
              status: "evaluation_failed",
            });
          }
        },
      );
      throw error;
    }
  }
}
