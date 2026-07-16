import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

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
    let reportPersistenceCommitted = false;

    try {
      const existingReport = await step.do(
        "load_existing_report",
        loadExistingReport(interviewId, db, log),
      );

      if (existingReport) {
        const interview = await step.do("read_existing_report_interview", async () =>
          getInterviewContextById(db, { id: interviewId }),
        );
        if (!interview) throw new Error(`Interview not found: ${interviewId}`);
        applicationId = interview.applicationId;

        const persistence = await step.do(
          "reconcile_existing_report",
          persistReport(interviewId, { interview }, null, null, db, log),
        );
        reportPersistenceCommitted = true;

        if (persistence.kind === "held") {
          const batchId = persistence.batchId;
          const fullyResolved = await step.do("check_batch_fully_resolved_existing", () =>
            isBatchFullyResolved(db, batchId),
          );
          if (fullyResolved) {
            await step.do("signal_batch_complete_existing", async () => {
              const instance = await this.env.BATCH_ORCHESTRATION.get(batchId);
              try {
                await instance.sendEvent({
                  type: "batch-reports-complete",
                  payload: { batchId: persistence.batchId },
                });
              } finally {
                disposeRpcResource(instance);
              }
            });
          }
        }

        if (persistence.kind !== "held") {
          await step.do(
            "send_existing_report_ready_email",
            sendReportReadyEmail(
              { interview },
              persistence.notificationDeliveries,
              persistence.report,
              db,
              log,
            ),
          );
        }

        log.info(`Existing report reconciled: ${existingReport.id}`);
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
      reportPersistenceCommitted = true;

      // Check if this interview belongs to a batch and if the batch is fully resolved
      const batchId = report.batchId;

      if (batchId && report.kind === "held") {
        const fullyResolved = await step.do("check_batch_fully_resolved", async () => {
          return isBatchFullyResolved(db, batchId);
        });

        if (fullyResolved) {
          await step.do("signal_batch_complete", async () => {
            const instance = await this.env.BATCH_ORCHESTRATION.get(batchId);
            try {
              await instance.sendEvent({
                type: "batch-reports-complete",
                payload: { batchId },
              });
              log.info(`Sent early completion signal to batch ${batchId}`);
            } finally {
              disposeRpcResource(instance);
            }
          });
        } else {
          log.info(`Report held in batch ${batchId}, waiting for remaining candidates`);
        }
      }

      if (report.kind !== "held") {
        await step.do(
          "send_report_ready_email",
          sendReportReadyEmail(interviewData, report.notificationDeliveries, finalReport, db, log),
        );
      }

      log.info(`Post-evaluation complete: ${report.report.id}`);

      return { interviewId, reportId: report.report.id, status: "created" as const };
    } catch (error) {
      if (reportPersistenceCommitted) {
        log.error("Post-persistence side effect failed; preserving evaluated status", error);
        throw error;
      }
      log.error(
        "Workflow failed before report persistence, marking application as evaluation_failed",
        error,
      );
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
