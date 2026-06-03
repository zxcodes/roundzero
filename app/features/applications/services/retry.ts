import type { Sql } from "postgres";
import { getInterviewByApplicationId } from "@/features/interviews/queries/queries_sql";
import { getReportByInterviewId } from "@/features/reports/queries/queries_sql";
import {
  claimApplicationForRetry,
  getApplicationById,
  updateApplicationStatus,
} from "../queries/queries_sql";

/** Maximum auto-retries enforced by the cron sweep. Manual retries pass null. */
export const EVAL_RETRY_AUTO_CAP = 3;
/** Maximum number of applications the cron will pick up per tick. */
export const EVAL_RETRY_SWEEP_LIMIT = 25;

export type EvalRetryKind = "pre_eval" | "post_eval";
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
    return { kind: "pre_eval", action: "created", workflowInstanceId: instance.id };
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
  const probe = await probePostEvaluationInstance(bindings.postEvaluation, interviewId);
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
      return { kind: "post_eval", action: "created", workflowInstanceId: created.id };
    }

    await probe.instance.restart();
    return { kind: "post_eval", action: "restarted", workflowInstanceId: probe.instance.id };
  } catch (error) {
    await updateApplicationStatus(db, { id: applicationId, status: "evaluation_failed" });
    throw error;
  }
}

type PostEvalProbe =
  | { action: "create" }
  | { action: "restart"; instance: WorkflowInstance }
  | { action: "skip"; reason: string };

async function probePostEvaluationInstance(
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

  const status = await instance.status();
  switch (status.status) {
    case "errored":
    case "terminated":
      return { action: "restart", instance };
    case "complete":
      // Workflow ran to completion (often the `insufficient_signal` branch).
      // Restarting against the same data will produce the same outcome, so
      // skip — operators can intervene differently (e.g. re-invite).
      return { action: "skip", reason: "post_eval_already_complete" };
    case "queued":
    case "running":
    case "paused":
    case "waiting":
    case "waitingForPause":
      return { action: "skip", reason: `post_eval_${status.status}` };
    default:
      return { action: "skip", reason: `post_eval_unknown_status` };
  }
}
