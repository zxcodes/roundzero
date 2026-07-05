import type { Sql } from "postgres";
import { notifyCompanyTeam } from "@/features/companies/services/company-team-notifications";

export function isJobPublishTransition(
  previousStatus: string | null | undefined,
  nextStatus: string,
): boolean {
  return nextStatus === "open" && previousStatus !== "open";
}

export async function notifyJobPublished(
  sql: Sql,
  companyId: string,
  job: { id: string; title: string },
) {
  await notifyCompanyTeam(sql, {
    companyId,
    type: "job_published",
    payload: {
      jobId: job.id,
      jobTitle: job.title,
      status: "open",
    },
  });
}
