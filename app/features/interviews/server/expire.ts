import type { Sql } from "postgres";

import { updateApplicationStatusIfCurrent } from "@/features/applications/queries/queries_sql";
import { checkAndLaunchBatch } from "@/features/batches/server/orchestration";
import { expireInterview } from "@/features/interviews/queries/queries_sql";
import { shouldAutoExpireInterview } from "@/features/interviews/shared/expiry";

export type ExpirableInterview = {
  id: string;
  applicationId: string;
  status: string;
  expiresAt: Date | string | null;
};

export type ExpireInterviewResult<T extends ExpirableInterview> = {
  interview: T;
  expiredNow: boolean;
};

/**
 * If `interview` has passed its window and is still in `pending`/`in_progress`,
 * flip it to `expired` in the DB. Post-evaluation is not started here — reports
 * require a completed voice assessment, which cannot exist for sessions that
 * never reached text submit.
 */
export const expireInterviewIfDue = async <T extends ExpirableInterview>(input: {
  db: Sql;
  interview: T;
}): Promise<ExpireInterviewResult<T>> => {
  if (!shouldAutoExpireInterview(input.interview.status, input.interview.expiresAt)) {
    return { interview: input.interview, expiredNow: false };
  }

  const transition = await input.db.begin(async (tx) => {
    const transaction = tx as unknown as Sql;
    const rows = await tx`
      SELECT job_id, status
      FROM applications
      WHERE id = ${input.interview.applicationId}
      FOR UPDATE
    `;
    const application = rows[0];
    if (!application) return null;

    // Canonical order for individual terminal transitions: application first,
    // then interview. expireInterview's conditional UPDATE takes the latter lock.
    const expired = await expireInterview(transaction, { id: input.interview.id });
    if (!expired) return null;

    if (
      application.status === "interview_invited" ||
      application.status === "interview_in_progress"
    ) {
      await updateApplicationStatusIfCurrent(transaction, {
        id: input.interview.applicationId,
        currentStatus: application.status,
        status: "pre_screening",
      });
    }
    return application.job_id;
  });

  if (!transition) return { interview: input.interview, expiredNow: false };
  await checkAndLaunchBatch(transition);

  return {
    interview: { ...input.interview, status: "expired" as const },
    expiredNow: true,
  };
};
