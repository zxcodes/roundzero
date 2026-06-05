import type { Sql } from "postgres";
import { expireInterview } from "@/features/interviews/queries/queries_sql";
import { shouldAutoExpireInterview } from "@/features/interviews/shared/expiry";

export type ExpirableInterview = {
  id: string;
  status: string;
  expiresAt: Date | string | null;
};

export type ExpireInterviewResult<T extends ExpirableInterview> = {
  interview: T;
  expiredNow: boolean;
  postEvalTriggered: boolean;
};

/**
 * If `interview` has passed its window and is still in `pending`/`in_progress`,
 * flip it to `expired` in the DB. When the interview was actively
 * `in_progress`, also kick off post-evaluation so any partial transcript is
 * turned into a report (or surfaced as `insufficient_signal`) instead of being
 * silently dropped on the floor. Without this, candidates whose session ran
 * out mid-interview would leave companies with no report at all.
 *
 * The post-eval workflow binding is injected so tests can verify the call
 * without booting the Workers runtime. Pass `null` to disable the side effect.
 */
export const expireInterviewIfDue = async <T extends ExpirableInterview>(input: {
  db: Sql;
  interview: T;
  postEvaluation: Workflow<{ interviewId: string }> | null;
}): Promise<ExpireInterviewResult<T>> => {
  if (!shouldAutoExpireInterview(input.interview.status, input.interview.expiresAt)) {
    return { interview: input.interview, expiredNow: false, postEvalTriggered: false };
  }

  const wasInProgress = input.interview.status === "in_progress";
  await expireInterview(input.db, { id: input.interview.id });

  let postEvalTriggered = false;
  if (wasInProgress && input.postEvaluation) {
    try {
      // Stable id matches what `completeInterview` uses so the post-eval
      // workflow is single-sourced per interview. If an instance is already
      // retained (unlikely on first expiry), the create throws — log and
      // move on so the calling request still resolves cleanly.
      await input.postEvaluation.create({
        id: input.interview.id,
        params: { interviewId: input.interview.id },
      });
      postEvalTriggered = true;
    } catch (error) {
      console.error(
        `[expireInterviewIfDue] failed to trigger post-eval for ${input.interview.id}`,
        error,
      );
    }
  }

  return {
    interview: { ...input.interview, status: "expired" as const },
    expiredNow: true,
    postEvalTriggered,
  };
};
