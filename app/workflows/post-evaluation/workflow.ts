import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { updateApplicationStatus } from "../../queries/applications/queries_sql";
import { getInterviewContextById } from "../../queries/interviews/queries_sql";
import { getDb } from "../../shared/db";
import { createWorkflowLogger } from "../../shared/logger";
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
        readInterviewData(interviewId, this.env, db, log),
      );
      applicationId = interviewData.interview.applicationId;

      const reportDraft = await step.do(
        "generate_report",
        generateReport(interviewData, this.env, log),
      );

      const report = await step.do(
        "persist_report",
        persistReport(interviewId, interviewData, reportDraft, db, log),
      );

      await step.do("mark_application_evaluated", markApplicationEvaluated(interviewData, db));

      const notification = await step.do(
        "notify_report_ready",
        notifyReportReady(interviewData, reportDraft, db, log),
      );

      await step.do(
        "send_report_ready_email",
        sendReportReadyEmail(interviewData, notification, reportDraft, this.env, db, log),
      );

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
