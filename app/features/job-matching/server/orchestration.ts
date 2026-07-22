import { env } from "cloudflare:workers";
import type { Sql } from "postgres";

import { MATCHING_CONFIG } from "../config";
import { hashStableValue } from "../hash";
import {
  claimCandidateMatchRefresh,
  getJobMatchingProfile,
  markCandidateFeedFailedIfCurrent,
  requestJobMatchingProfile,
} from "../queries/queries_sql";

export type JobMatchingWorkflowPayload =
  | {
      type: "candidate_refresh";
      candidateId: string;
      refreshToken: string;
    }
  | {
      type: "job_extract";
      jobId: string;
      extractionToken: string;
    };

type MatchingJobSource = {
  id: string;
  title: string;
  description: string;
  requirements: unknown;
  experienceLevel: string | null;
};

export async function jobMatchingSourceHash(job: MatchingJobSource): Promise<string> {
  return hashStableValue({
    title: job.title.trim(),
    description: job.description.trim(),
    requirements: job.requirements,
    experienceLevel: job.experienceLevel,
    profileVersion: MATCHING_CONFIG.jobProfileVersion,
  });
}

export async function requestJobMatchingExtraction(
  db: Sql,
  job: MatchingJobSource,
): Promise<{ jobId: string; extractionToken: string } | null> {
  const sourceHash = await jobMatchingSourceHash(job);
  const existing = await getJobMatchingProfile(db, { jobId: job.id });
  if (
    existing?.requestedSourceHash === sourceHash &&
    existing.sourceVersion === MATCHING_CONFIG.jobProfileVersion &&
    existing.extractionStatus !== "failed"
  ) {
    return null;
  }

  const extractionToken = crypto.randomUUID();
  const requested = await requestJobMatchingProfile(db, {
    jobId: job.id,
    requestedSourceHash: sourceHash,
    sourceVersion: MATCHING_CONFIG.jobProfileVersion,
    extractionToken,
  });
  return requested ? { jobId: job.id, extractionToken } : null;
}

export async function startJobMatchingExtraction(request: {
  jobId: string;
  extractionToken: string;
}): Promise<boolean> {
  try {
    await env.JOB_MATCHING.create({
      id: `job-extract-${request.jobId}-${request.extractionToken}`,
      params: {
        type: "job_extract",
        jobId: request.jobId,
        extractionToken: request.extractionToken,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function claimAndStartCandidateRefresh(input: {
  db: Sql;
  candidateId: string;
}): Promise<boolean> {
  const refreshToken = crypto.randomUUID();
  const claim = await claimCandidateMatchRefresh(input.db, {
    userId: input.candidateId,
    refreshToken,
    claimCutoff: new Date(Date.now() - MATCHING_CONFIG.refreshLeaseMs),
  });
  if (!claim?.matchRefreshToken) return false;

  try {
    await env.JOB_MATCHING.create({
      id: `candidate-refresh-${input.candidateId}-${refreshToken}`,
      params: {
        type: "candidate_refresh",
        candidateId: input.candidateId,
        refreshToken,
      },
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markCandidateFeedFailedIfCurrent(input.db, {
      userId: input.candidateId,
      refreshToken,
      errorMessage: message.slice(0, 500),
    });
    return false;
  }
}
