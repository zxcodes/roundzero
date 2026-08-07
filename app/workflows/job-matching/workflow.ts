import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import {
  extractCandidateMatchingProfile,
  extractJobMatchingProfile,
  rerankJobs,
} from "@/features/job-matching/ai";
import { deriveMatchBand, MATCHING_CONFIG } from "@/features/job-matching/config";
import {
  capScoreForEvidence,
  scoreMatchDimensions,
  validateAndRenderEvidence,
} from "@/features/job-matching/evidence";
import { candidateFeedInputHash } from "@/features/job-matching/feed-fingerprint";
import { sha256Bytes } from "@/features/job-matching/hash";
import {
  validateCandidateMatchingProfile,
  validateJobMatchingProfile,
} from "@/features/job-matching/profile-sanitization";
import {
  getCandidateMatchingState,
  getJobForMatchingExtraction,
  getJobMatchingProfile,
  listEligibleJobsForCandidateMatching,
  lockCandidateMatchRefresh,
  markCandidateFeedFailedIfCurrent,
  markCandidateProfileFailedIfCurrent,
  markJobMatchingProfileFailedIfCurrent,
  publishCandidateMatchGenerationIfCurrent,
  saveCandidateMatchingProfileIfCurrent,
  saveJobMatchingProfileIfCurrent,
  setCandidateMatchRefreshPhaseIfCurrent,
  touchCandidateMatchFeedIfCurrent,
  upsertCandidateJobMatch,
} from "@/features/job-matching/queries/queries_sql";
import { retrieveJobs } from "@/features/job-matching/retrieval";
import {
  candidateMatchingProfileSchema,
  jobMatchingProfileSchema,
  matchReasonsSchema,
} from "@/features/job-matching/schemas";
import type { JobMatchingWorkflowPayload } from "@/features/job-matching/server/orchestration";
import { getDb } from "@/shared/db";
import { asSqlTransaction } from "@/shared/db-transaction";
import { extractSanitizedResumeText, resumeContentType } from "@/shared/resume-extraction.server";

const retries = { limit: 3, delay: "10 seconds", backoff: "exponential" } as const;

const errorMessage = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).slice(0, 500);

export class JobMatchingWorkflow extends WorkflowEntrypoint<Env, JobMatchingWorkflowPayload> {
  async run(event: WorkflowEvent<JobMatchingWorkflowPayload>, step: WorkflowStep) {
    if (event.payload.type === "job_extract") {
      return await this.runJobExtraction(event.payload, step);
    }
    return await this.runCandidateRefresh(event.payload, step);
  }

  private async runJobExtraction(
    payload: Extract<JobMatchingWorkflowPayload, { type: "job_extract" }>,
    step: WorkflowStep,
  ) {
    try {
      const source = await step.do("load-job-source", async () => {
        const db = getDb();
        const [job, request] = await Promise.all([
          getJobForMatchingExtraction(db, { id: payload.jobId }),
          getJobMatchingProfile(db, { jobId: payload.jobId }),
        ]);
        if (!job || !request || request.extractionToken !== payload.extractionToken) {
          return null;
        }
        if (job.status !== "open" || job.archivedAt) return null;
        return {
          title: job.title,
          description: job.description,
          experienceLevel: job.experienceLevel,
          sourceHash: request.requestedSourceHash,
        };
      });
      if (!source) return { status: "stale" as const };

      const extracted = await step.do(
        "extract-job-profile",
        { retries, timeout: "5 minutes" },
        async () => await extractJobMatchingProfile(source),
      );

      const saved = await step.do("save-job-profile", async () => {
        const db = getDb();
        return await saveJobMatchingProfileIfCurrent(db, {
          jobId: payload.jobId,
          extractionToken: payload.extractionToken,
          sourceHash: source.sourceHash,
          matchingProfile: extracted.profile,
          model: extracted.model,
          promptVersion: MATCHING_CONFIG.jobProfileVersion,
        });
      });
      return { status: saved ? ("ready" as const) : ("stale" as const) };
    } catch (error) {
      await step.do("mark-job-profile-failed", async () => {
        const db = getDb();
        await markJobMatchingProfileFailedIfCurrent(db, {
          jobId: payload.jobId,
          extractionToken: payload.extractionToken,
          errorMessage: errorMessage(error),
        });
      });
      throw error;
    }
  }

  private async runCandidateRefresh(
    payload: Extract<JobMatchingWorkflowPayload, { type: "candidate_refresh" }>,
    step: WorkflowStep,
  ) {
    try {
      const candidate = await step.do("load-candidate-state", async () => {
        const db = getDb();
        const state = await getCandidateMatchingState(db, { userId: payload.candidateId });
        if (!state?.resumeKey || state.matchRefreshToken !== payload.refreshToken) return null;
        await setCandidateMatchRefreshPhaseIfCurrent(db, {
          userId: payload.candidateId,
          refreshToken: payload.refreshToken,
          phase: "reading_resume",
        });
        return {
          resumeKey: state.resumeKey,
          existingProfile: state.matchingProfile,
          existingSourceHash: state.matchingProfileSourceHash,
          existingVersion: state.matchingProfileVersion,
          existingProfileStatus: state.matchingProfileStatus,
          servingInputHash: state.servingMatchInputHash,
        };
      });
      if (!candidate) return { status: "stale" as const };

      const extracted = await step.do(
        "extract-candidate-profile",
        { retries, timeout: "5 minutes" },
        async () => {
          const object = await this.env.RESUMES.get(candidate.resumeKey);
          if (!object) throw new Error("Resume not found");
          const bytes = new Uint8Array(await object.arrayBuffer());
          const sourceHash = await sha256Bytes(bytes);
          if (
            sourceHash === candidate.existingSourceHash &&
            candidate.existingVersion === MATCHING_CONFIG.candidateProfileVersion
          ) {
            return {
              profile: validateCandidateMatchingProfile(
                candidateMatchingProfileSchema.parse(candidate.existingProfile),
              ),
              sourceHash,
              changed: false,
              model: null,
            };
          }

          const resumeText = await extractSanitizedResumeText(
            bytes,
            resumeContentType(candidate.resumeKey),
            100_000,
          );
          const result = await extractCandidateMatchingProfile(resumeText);
          return { profile: result.profile, sourceHash, changed: true, model: result.model };
        },
      );

      if (extracted.changed || candidate.existingProfileStatus !== "ready") {
        const saved = await step.do("save-candidate-profile", async () => {
          const db = getDb();
          return await saveCandidateMatchingProfileIfCurrent(db, {
            userId: payload.candidateId,
            resumeKey: candidate.resumeKey,
            refreshToken: payload.refreshToken,
            sourceHash: extracted.sourceHash,
            profileVersion: MATCHING_CONFIG.candidateProfileVersion,
            matchingProfile: extracted.profile,
          });
        });
        if (!saved) return { status: "stale" as const };
      }

      const retrieval = await step.do("retrieve-jobs", async () => {
        const db = getDb();
        await setCandidateMatchRefreshPhaseIfCurrent(db, {
          userId: payload.candidateId,
          refreshToken: payload.refreshToken,
          phase: "finding_jobs",
        });
        const rows = await listEligibleJobsForCandidateMatching(db, {
          candidateId: payload.candidateId,
        });
        const jobs = rows.flatMap((row) => {
          const parsed = jobMatchingProfileSchema.safeParse(row.matchingProfile);
          if (!parsed.success || !row.completedSourceHash) return [];
          const profile = validateJobMatchingProfile(parsed.data);
          return [
            {
              id: row.id,
              title: row.title,
              location: row.location,
              workplaceType: row.workplaceType,
              employmentType: row.employmentType,
              experienceLevel: row.experienceLevel,
              createdAt: row.createdAt,
              profileSourceHash: row.completedSourceHash,
              profileVersion: row.sourceVersion,
              profile,
            },
          ];
        });
        return retrieveJobs(extracted.profile, jobs).map((job) => ({
          ...job,
          createdAt: job.createdAt.toISOString(),
        }));
      });

      const inputHash = await step.do("calculate-feed-input-hash", async () =>
        candidateFeedInputHash(extracted.sourceHash, retrieval),
      );

      if (!payload.force && inputHash === candidate.servingInputHash) {
        await step.do("touch-unchanged-feed", async () => {
          const db = getDb();
          await touchCandidateMatchFeedIfCurrent(db, {
            userId: payload.candidateId,
            refreshToken: payload.refreshToken,
          });
        });
        return { status: "unchanged" as const };
      }

      const ranked =
        retrieval.length === 0
          ? {
              output: { matches: [] },
              model: "none",
              promptVersion: MATCHING_CONFIG.rerankerPromptVersion,
              usage: { inputTokens: 0, outputTokens: 0, latencyMs: 0 },
            }
          : await step.do("rerank-jobs", { retries, timeout: "5 minutes" }, async () => {
              const db = getDb();
              await setCandidateMatchRefreshPhaseIfCurrent(db, {
                userId: payload.candidateId,
                refreshToken: payload.refreshToken,
                phase: "ranking_matches",
              });
              return await rerankJobs({
                candidate: extracted.profile,
                jobs: retrieval.map((job) => ({
                  id: job.id,
                  profile: job.profile,
                  retrievalScore: job.retrievalScore,
                })),
              });
            });

      await step.do("record-reranker-usage", async () => {
        console.info({
          event: "candidate_job_matching_reranker_usage",
          candidateId: payload.candidateId,
          jobs: retrieval.length,
          model: ranked.model,
          inputTokens: ranked.usage.inputTokens,
          outputTokens: ranked.usage.outputTokens,
          latencyMs: ranked.usage.latencyMs,
        });
      });

      const matches = this.validateMatches(extracted.profile, retrieval, ranked.output.matches);
      const generationId = await step.do("create-generation-id", async () => crypto.randomUUID());
      const published = await step.do("publish-feed-generation", async () => {
        const db = getDb();
        await setCandidateMatchRefreshPhaseIfCurrent(db, {
          userId: payload.candidateId,
          refreshToken: payload.refreshToken,
          phase: "updating_feed",
        });
        return await db.begin(async (tx) => {
          const transaction = asSqlTransaction(tx);
          const locked = await lockCandidateMatchRefresh(transaction, {
            userId: payload.candidateId,
          });
          if (
            !locked ||
            locked.matchRefreshToken !== payload.refreshToken ||
            locked.matchingProfileSourceHash !== extracted.sourceHash
          ) {
            return false;
          }

          for (const match of matches) {
            await upsertCandidateJobMatch(transaction, {
              candidateId: payload.candidateId,
              jobId: match.jobId,
              generationId,
              candidateProfileSourceHash: extracted.sourceHash,
              jobProfileSourceHash: match.jobProfileSourceHash,
              score: match.score,
              band: deriveMatchBand(match.score),
              reasons: match.reasons,
              consideration: match.consideration,
              algorithmVersion: MATCHING_CONFIG.algorithmVersion,
              thresholdVersion: MATCHING_CONFIG.thresholdVersion,
              promptVersion: ranked.promptVersion,
              model: ranked.model,
            });
          }

          return Boolean(
            await publishCandidateMatchGenerationIfCurrent(transaction, {
              userId: payload.candidateId,
              refreshToken: payload.refreshToken,
              candidateProfileSourceHash: extracted.sourceHash,
              generationId,
              inputHash,
            }),
          );
        });
      });

      return {
        status: published ? ("ready" as const) : ("stale" as const),
        matches: matches.length,
      };
    } catch (error) {
      await step.do("mark-candidate-refresh-failed", async () => {
        const db = getDb();
        const state = await getCandidateMatchingState(db, { userId: payload.candidateId });
        const args = {
          userId: payload.candidateId,
          refreshToken: payload.refreshToken,
          errorMessage: errorMessage(error),
        };
        if (
          state?.matchingProfileStatus === "ready" &&
          state.matchingProfileVersion === MATCHING_CONFIG.candidateProfileVersion
        ) {
          await markCandidateFeedFailedIfCurrent(db, args);
        } else {
          await markCandidateProfileFailedIfCurrent(db, args);
        }
      });
      throw error;
    }
  }

  private validateMatches(
    candidate: ReturnType<typeof candidateMatchingProfileSchema.parse>,
    jobs: Array<{
      id: string;
      location: string | null;
      workplaceType: string | null;
      profileSourceHash: string;
      profile: ReturnType<typeof jobMatchingProfileSchema.parse>;
    }>,
    output: Array<{
      jobId: string;
      score: number;
      dimensions: {
        roleFunction: number;
        capabilitiesResponsibilities: number;
        technologies: number;
        seniority: number;
        domain: number;
      };
      evidencePairs: Array<{ candidateItemId: string; jobItemId: string }>;
    }>,
  ) {
    const suppliedIds = new Set(jobs.map((job) => job.id));
    const outputIds = new Set(output.map((match) => match.jobId));
    if (output.length !== jobs.length || outputIds.size !== output.length) {
      throw new Error("Reranker returned missing or duplicate jobs");
    }
    if ([...outputIds].some((id) => !suppliedIds.has(id))) {
      throw new Error("Reranker returned an unknown job");
    }

    const jobsById = new Map(jobs.map((job) => [job.id, job]));
    return output.flatMap((match) => {
      const dimensionScores = Object.values(match.dimensions);
      if (
        !Number.isFinite(match.score) ||
        match.score < 0 ||
        match.score > 100 ||
        dimensionScores.some((score) => !Number.isFinite(score) || score < 0 || score > 100)
      ) {
        throw new Error("Reranker returned an invalid score or dimension");
      }
      const job = jobsById.get(match.jobId);
      if (!job) throw new Error("Reranker returned an unknown job");
      const reasons = validateAndRenderEvidence(candidate, job.profile, match.evidencePairs);
      const score = capScoreForEvidence(
        scoreMatchDimensions(match.dimensions),
        reasons,
        match.dimensions.roleFunction,
      );
      if (score === null) return [];

      return [
        {
          jobId: match.jobId,
          score,
          jobProfileSourceHash: job.profileSourceHash,
          reasons: matchReasonsSchema.parse(reasons),
          consideration:
            job.workplaceType || job.location
              ? `Work arrangement: ${[job.workplaceType, job.location].filter(Boolean).join(" · ")}`
              : null,
        },
      ];
    });
  }
}
