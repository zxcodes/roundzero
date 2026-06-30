import type { Sql } from "postgres";
import {
  getApplicationById,
  updateApplicationStatus,
} from "@/features/applications/queries/queries_sql";
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

  await expireInterview(input.db, { id: input.interview.id });

  const application = await getApplicationById(input.db, { id: input.interview.applicationId });
  if (application && application.status !== "rejected" && application.status !== "withdrawn") {
    await updateApplicationStatus(input.db, {
      id: input.interview.applicationId,
      status: "pre_screening",
    });
  }

  return {
    interview: { ...input.interview, status: "expired" as const },
    expiredNow: true,
  };
};
