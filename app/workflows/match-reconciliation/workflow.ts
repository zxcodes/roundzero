import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import { MATCHING_CONFIG } from "@/features/job-matching/config";
import {
  claimCandidateRefreshBatch,
  claimJobProfileRecoveryBatch,
  hasReadyOpenJobMatchingProfile,
  listOpenJobsMissingMatchingProfile,
} from "@/features/job-matching/queries/queries_sql";
import {
  requestJobMatchingExtraction,
  type JobMatchingWorkflowPayload,
} from "@/features/job-matching/server/orchestration";
import { getDb } from "@/shared/db";

const chunks = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

export class MatchReconciliationWorkflow extends WorkflowEntrypoint<Env> {
  async run(_event: WorkflowEvent<unknown>, step: WorkflowStep) {
    const missingJobs = await step.do("request-missing-job-profiles", async () => {
      const db = getDb();
      const jobs = await listOpenJobsMissingMatchingProfile(db, {
        limit: String(MATCHING_CONFIG.reconciliationJobLimit),
      });
      const requests = [];
      for (const job of jobs) {
        const request = await requestJobMatchingExtraction(db, job);
        if (request) requests.push(request);
      }
      return requests;
    });

    const jobs = await step.do("claim-job-profile-recoveries", async () => {
      const db = getDb();
      return await claimJobProfileRecoveryBatch(db, {
        claimCutoff: new Date(Date.now() - MATCHING_CONFIG.refreshLeaseMs),
        batchLimit: String(MATCHING_CONFIG.reconciliationJobLimit),
      });
    });

    const jobRequests = [
      ...missingJobs,
      ...jobs.flatMap((job) =>
        job.extractionToken ? [{ jobId: job.jobId, extractionToken: job.extractionToken }] : [],
      ),
    ];

    for (const [index, batch] of chunks(jobRequests, 100).entries()) {
      await step.do(`start-job-recovery-batch-${index}`, async () => {
        await this.env.JOB_MATCHING.createBatch(
          batch.map((job) => ({
            id: `job-extract-${job.jobId}-${job.extractionToken}`,
            params: {
              type: "job_extract" as const,
              jobId: job.jobId,
              extractionToken: job.extractionToken,
            } satisfies JobMatchingWorkflowPayload,
          })),
        );
      });
    }

    if (jobRequests.length > 0) {
      const hasReadyJobs = await step.do("check-ready-job-profiles", async () => {
        const db = getDb();
        return await hasReadyOpenJobMatchingProfile(db);
      });

      // Job extraction workflows run asynchronously. If this environment has no ready profiles
      // yet, leave candidate refreshes for a later pass so they cannot publish an empty feed.
      if (!hasReadyJobs?.ready) {
        return { recoveredJobs: jobRequests.length, refreshedCandidates: 0 };
      }
    }

    const candidates = await step.do("claim-candidate-refreshes", async () => {
      const db = getDb();
      return await claimCandidateRefreshBatch(db, {
        claimCutoff: new Date(Date.now() - MATCHING_CONFIG.refreshLeaseMs),
        batchLimit: String(MATCHING_CONFIG.reconciliationCandidateLimit),
      });
    });

    for (const [index, batch] of chunks(candidates, 100).entries()) {
      await step.do(`start-candidate-refresh-batch-${index}`, async () => {
        await this.env.JOB_MATCHING.createBatch(
          batch.flatMap((candidate) =>
            candidate.matchRefreshToken
              ? [
                  {
                    id: `candidate-refresh-${candidate.userId}-${candidate.matchRefreshToken}`,
                    params: {
                      type: "candidate_refresh" as const,
                      candidateId: candidate.userId,
                      refreshToken: candidate.matchRefreshToken,
                      force: false,
                    } satisfies JobMatchingWorkflowPayload,
                  },
                ]
              : [],
          ),
        );
      });
    }

    return { recoveredJobs: jobRequests.length, refreshedCandidates: candidates.length };
  }
}
