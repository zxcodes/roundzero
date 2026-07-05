import type { Sql } from "postgres";
import {
  getCommunicationAssessmentByInterviewId,
  getInterviewByApplicationId,
} from "@/features/interviews/queries/queries_sql";
import { getReportByInterviewId } from "@/features/reports/queries/queries_sql";
import { disposeRpcResource } from "@/shared/workflow-rpc";
import {
  claimApplicationForRetry,
  getApplicationById,
  updateApplicationStatus,
} from "../queries/queries_sql";

/** Maximum auto-retries enforced by the cron sweep. Manual retries pass null. */
export const EVAL_RETRY_AUTO_CAP = 3;
/** Maximum number of applications the cron will pick up per tick. */
export const EVAL_RETRY_SWEEP_LIMIT = 25;

export type EvalRetrySource = "cron" | "manual";

/**
 * Workflow bindings injected by the caller so the service is testable without
 * the Cloudflare Workers runtime. Production callers pass `env.PRE_EVALUATION`
 * / `env.POST_EVALUATION`; tests pass fakes.
 */
export type RetryEvaluationBindings = {
  preEvaluation: Workflow<{ applicationId: string }>;
  postEvaluation: Workflow<{ interviewId: string }>;
};

export type RetryEvaluationResult =
  | { kind: "pre_eval"; action: "created"; workflowInstanceId: string }
  | { kind: "post_eval"; action: "created" | "restarted"; workflowInstanceId: string }
  | { kind: "skipped"; reason: string };

export type EvaluationRetryPreview =
  | { actionable: true; kind: "pre_eval" | "post_eval" }
  | { actionable: false; reason: string; suggestedAction?: "reinvite" };

/**
 * Recover an application stuck in `evaluation_failed` by re-triggering the
 * appropriate workflow. Used by both the cron sweep and the manual "Retry
 * evaluation" button.
 *
 * Flow:
 *  1. Read the application + latest interview to decide whether pre- or
 *     post-evaluation should run.
 *  2. For post-evaluation, inspect the existing Workflow instance (if any) to
 *     avoid duplicate-create errors and decide between `create` and `restart`.
 *  3. Atomically claim the row (status check + cap check in one UPDATE). Loser
 *     of a race gets a "skipped" result.
 *  4. Trigger the workflow. If the trigger throws after the claim, revert the
 *     status to `evaluation_failed` so a later sweep can pick it up again.
 *     The retry counter stays incremented — it counts attempts, not successes,
 *     which prevents thrashing on a permanently broken application.
 */
/**
 * Read-only probe used by the applicant review UI to decide whether to show
 * "Retry evaluation" or a recovery action (e.g. re-invite after insufficient
 * signal). Does not claim the row or trigger workflows.
 */
export async function previewEvaluationRetry(
  db: Sql,
  applicationId: string,
  bindings: RetryEvaluationBindings,
): Promise<EvaluationRetryPreview | null> {
  const application = await getApplicationById(db, { id: applicationId });
  if (application?.status !== "evaluation_failed") {
    return null;
  }

  const interview = await getInterviewByApplicationId(db, { applicationId });

  if (!interview) {
    return { actionable: true, kind: "pre_eval" };
  }

  if (interview.status === "completed") {
    const existingReport = await getReportByInterviewId(db, { interviewId: interview.id });
    if (existingReport) {
      return { actionable: false, reason: "report_already_exists" };
    }

    const probe = await probePostEvaluationInstance(db, bindings.postEvaluation, interview.id);
    try {
      if (probe.action === "create" || probe.action === "restart") {
        return { actionable: true, kind: "post_eval" };
      }
      if (probe.reason === "post_eval_already_complete") {
        return { actionable: false, reason: probe.reason, suggestedAction: "reinvite" };
      }
      return { actionable: false, reason: probe.reason };
    } finally {
      if (probe.action === "restart") {
        disposeRpcResource(probe.instance);
      }
    }
  }

  return { actionable: false, reason: `interview_${interview.status}` };
}

export async function retryEvaluation(
  db: Sql,
  applicationId: string,
  bindings: RetryEvaluationBindings,
  options: { cap: number | null; source: EvalRetrySource },
): Promise<RetryEvaluationResult> {
  const application = await getApplicationById(db, { id: applicationId });
  if (!application) {
    return { kind: "skipped", reason: "application_not_found" };
  }
  if (application.status !== "evaluation_failed") {
    return { kind: "skipped", reason: `not_evaluation_failed:${application.status}` };
  }

  const interview = await getInterviewByApplicationId(db, { applicationId });

  // ── Classification ──────────────────────────────────────────────────────
  // No interview → pre-evaluation never finished or never produced a hand-off.
  if (!interview) {
    return await claimAndTriggerPreEval(db, applicationId, bindings, options);
  }

  // Completed interview but no report → post-evaluation never produced one.
  if (interview.status === "completed") {
    const existingReport = await getReportByInterviewId(db, { interviewId: interview.id });
    if (existingReport) {
      return { kind: "skipped", reason: "report_already_exists" };
    }
    return await claimAndTriggerPostEval(db, applicationId, interview.id, bindings, options);
  }

  // pending / in_progress: candidate hasn't really finished. expired /
  // cancelled: nothing to recover from at the AI layer — the company would
  // re-invite manually via the status dropdown.
  return { kind: "skipped", reason: `interview_${interview.status}` };
}

async function claimAndTriggerPreEval(
  db: Sql,
  applicationId: string,
  bindings: RetryEvaluationBindings,
  options: { cap: number | null; source: EvalRetrySource },
): Promise<RetryEvaluationResult> {
  const claimed = await claimApplicationForRetry(db, {
    nextstatus: "pre_screening",
    retrykind: "pre_eval",
    retrysource: options.source,
    id: applicationId,
    cap: options.cap,
  });
  if (!claimed) {
    return { kind: "skipped", reason: "claim_lost_or_capped" };
  }

  try {
    const instance = await bindings.preEvaluation.create({ params: { applicationId } });
    try {
      return { kind: "pre_eval", action: "created", workflowInstanceId: instance.id };
    } finally {
      disposeRpcResource(instance);
    }
  } catch (error) {
    await updateApplicationStatus(db, { id: applicationId, status: "evaluation_failed" });
    throw error;
  }
}

async function claimAndTriggerPostEval(
  db: Sql,
  applicationId: string,
  interviewId: string,
  bindings: RetryEvaluationBindings,
  options: { cap: number | null; source: EvalRetrySource },
): Promise<RetryEvaluationResult> {
  // Probe the existing instance BEFORE claiming so we can skip without
  // incrementing the counter if the workflow is healthily mid-flight.
  const probe = await probePostEvaluationInstance(db, bindings.postEvaluation, interviewId);
  if (probe.action === "skip") {
    return { kind: "skipped", reason: probe.reason };
  }

  const claimed = await claimApplicationForRetry(db, {
    nextstatus: "interview_in_progress",
    retrykind: "post_eval",
    retrysource: options.source,
    id: applicationId,
    cap: options.cap,
  });
  if (!claimed) {
    return { kind: "skipped", reason: "claim_lost_or_capped" };
  }

  try {
    if (probe.action === "create") {
      const created = await bindings.postEvaluation.create({
        id: interviewId,
        params: { interviewId },
      });
      try {
        return { kind: "post_eval", action: "created", workflowInstanceId: created.id };
      } finally {
        disposeRpcResource(created);
      }
    }

    await probe.instance.restart(probe.restartFrom ? { from: probe.restartFrom } : undefined);
    return { kind: "post_eval", action: "restarted", workflowInstanceId: probe.instance.id };
  } catch (error) {
    await updateApplicationStatus(db, { id: applicationId, status: "evaluation_failed" });
    throw error;
  } finally {
    if (probe.action === "restart") {
      disposeRpcResource(probe.instance);
    }
  }
}

type PostEvalRestartFrom = WorkflowInstanceRestartOptions["from"];

type PostEvalProbe =
  | { action: "create" }
  | { action: "restart"; instance: WorkflowInstance; restartFrom?: PostEvalRestartFrom }
  | { action: "skip"; reason: string };

async function isPostEvalVoiceScoringRecoverable(
  db: Sql,
  interviewId: string,
  output: unknown,
): Promise<boolean> {
  const existingReport = await getReportByInterviewId(db, { interviewId });
  if (existingReport) {
    return false;
  }

  const result = output as { status?: string } | null | undefined;
  if (result?.status === "voice_assessment_incomplete") {
    return true;
  }
  if (result?.status === "insufficient_signal" || result?.status === "already_exists") {
    return false;
  }

  const assessment = await getCommunicationAssessmentByInterviewId(db, { interviewId });
  return assessment?.status === "completed" && assessment.analysis == null;
}

async function probePostEvaluationInstance(
  db: Sql,
  binding: Workflow<{ interviewId: string }>,
  interviewId: string,
): Promise<PostEvalProbe> {
  let instance: WorkflowInstance | null = null;
  try {
    instance = await binding.get(interviewId);
  } catch {
    // No retained instance with this id — fall through to create.
    return { action: "create" };
  }

  let retainInstance = false;
  try {
    const statusPayload = await instance.status();
    try {
      const workflowStatus = statusPayload.status;

      switch (workflowStatus) {
        case "errored":
        case "terminated":
          retainInstance = true;
          return { action: "restart", instance };
        case "complete": {
          if (await isPostEvalVoiceScoringRecoverable(db, interviewId, statusPayload.output)) {
            retainInstance = true;
            return {
              action: "restart",
              instance,
              restartFrom: { name: "load_voice_assessment" },
            };
          }
          // Workflow ran to completion (e.g. `insufficient_signal`). Restarting
          // against the same data will produce the same outcome — re-invite.
          return { action: "skip", reason: "post_eval_already_complete" };
        }
        case "queued":
        case "running":
        case "paused":
        case "waiting":
        case "waitingForPause":
          return { action: "skip", reason: `post_eval_${workflowStatus}` };
        default:
          return { action: "skip", reason: "post_eval_unknown_status" };
      }
    } finally {
      disposeRpcResource(statusPayload);
    }
  } finally {
    if (!retainInstance) {
      disposeRpcResource(instance);
    }
  }
}
