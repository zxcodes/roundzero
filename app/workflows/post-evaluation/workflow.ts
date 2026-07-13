import { env, WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import { updateApplicationStatus } from "@/features/applications/queries/queries_sql";
import { isBatchFullyResolved } from "@/features/batches/server/release";
import {
  getCommunicationAssessmentByInterviewId,
  getInterviewContextById,
} from "@/features/interviews/queries/queries_sql";
import { getDb } from "@/shared/db";
import { createWorkflowLogger } from "@/shared/logger";
import { disposeRpcResource } from "@/shared/workflow-rpc";

import { refineReport } from "./refine";
import {
  applyVoiceAssessmentToReport,
  assessAnswerAuthenticity,
  generateReport,
  loadExistingReport,
  loadVoiceAssessment,
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
      if (interviewData.kind === "insufficient_signal") {
        applicationId = interviewData.interview?.applicationId ?? null;
        log.warn(
          `Post-evaluation skipped due to insufficient interview signal: ${interviewData.reason}`,
        );
        await step.do(
          "mark_application_evaluation_failed_insufficient_signal",
          { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" } },
          async () => {
            if (!applicationId) return;
            await updateApplicationStatus(db, {
              id: applicationId,
              status: "evaluation_failed",
            });
          },
        );
        return { interviewId, status: "insufficient_signal" as const };
      }
      applicationId = interviewData.interview.applicationId;

      // Post-evaluation only starts after voice is finished. Reject immediately
      // if the required communication assessment is missing or incomplete.
      const voiceAssessmentStatus = await step.do("check_voice_assessment_status", async () => {
        const row = await getCommunicationAssessmentByInterviewId(db, { interviewId });
        return row?.status ?? null;
      });

      const voiceCompleted = voiceAssessmentStatus === "completed";

      if (!voiceCompleted) {
        log.warn(
          `Voice assessment not completed (status=${voiceAssessmentStatus ?? "missing"}), report withheld`,
        );
        await step.do(
          "mark_application_evaluation_failed_voice_not_completed",
          { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" } },
          async () => {
            if (!applicationId) return;
            await updateApplicationStatus(db, {
              id: applicationId,
              status: "evaluation_failed",
            });
          },
        );
        return { interviewId, status: "voice_assessment_incomplete" as const };
      }

      // This step may run the communication-scoring LLM call (when the
      // transcript was persisted but not yet scored). Give it more time than
      // the analysis's internal retry budget (~3 × 45s + backoff ≈ 138s).
      const voiceAssessment = await step.do(
        "load_voice_assessment",
        {
          timeout: "5 minutes",
          retries: { limit: 3, delay: "10 seconds", backoff: "exponential" },
        },
        loadVoiceAssessment(interviewId, db, log),
      );

      const answerAuthenticity = await step.do(
        "assess_answer_authenticity",
        { timeout: "2 minutes" },
        assessAnswerAuthenticity(
          {
            interview: interviewData.interview,
            transcript: interviewData.transcript,
          },
          log,
        ),
      );

      const { report: reportDraft, model } = await step.do(
        "generate_report",
        generateReport({ ...interviewData, voiceAssessment, answerAuthenticity }, log),
      );

      const refinedDraft = await step.do("refine_report", async () =>
        refineReport({
          draft: reportDraft,
          transcript: interviewData.transcript,
          messages: interviewData.messages,
          screeningCoverage: interviewData.screeningCoverage,
          integrity: interviewData.integrity,
          customQuestions: interviewData.runtimeContext.customQuestions,
          log,
        }),
      );

      const finalReport = applyVoiceAssessmentToReport(refinedDraft, voiceAssessment);

      const report = await step.do(
        "persist_report",
        persistReport(interviewId, interviewData, finalReport, model, db, log),
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
            try {
              const instance = await env.BATCH_ORCHESTRATION.get(batchId);
              try {
                await instance.sendEvent({
                  type: "batch-reports-complete",
                  payload: { batchId },
                });
                log.info(`Sent early completion signal to batch ${batchId}`);
              } finally {
                disposeRpcResource(instance);
              }
            } catch {
              // Batch may have already timed out and released, this is fine
              log.info(`Batch ${batchId} already released, no signal needed`);
            }
          });
        } else {
          log.info(`Report held in batch ${batchId}, waiting for remaining candidates`);
        }
      } else {
        // No batch, this is a non-batched report (legacy or manual). Send individual notification.
        const deliveries = await step.do(
          "notify_report_ready",
          notifyReportReady(interviewData, finalReport, db, log),
        );

        await step.do(
          "send_report_ready_email",
          sendReportReadyEmail(interviewData, deliveries, finalReport, db, log),
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
