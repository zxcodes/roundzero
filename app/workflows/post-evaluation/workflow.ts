import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
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
  }
}
