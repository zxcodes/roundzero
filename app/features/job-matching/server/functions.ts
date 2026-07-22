import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";

import { MATCHING_CONFIG } from "../config";
import {
  dismissCandidateMatch,
  getCandidateMatchFeed,
  getCandidateMatchRefreshProgress,
  getCandidateMatchingState,
  markCandidateMatchViewed,
  updateCandidateMatchAlerts,
} from "../queries/queries_sql";
import { matchReasonsSchema, matchRefreshPhaseSchema, matchingStatusSchema } from "../schemas";
import { claimAndStartCandidateRefresh } from "./orchestration";

const jobIdSchema = z.object({ jobId: z.string().uuid() });
const alertsSchema = z.object({ enabled: z.boolean() });

const requireCandidate = (role: string | null) => {
  if (role !== "candidate") throw new Error("Only candidates can manage job matches");
};

export const getMyCandidateMatches = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requireCandidate(context.user.role);
    const db = getDb();
    const [state, rows] = await Promise.all([
      getCandidateMatchingState(db, { userId: context.userId }),
      getCandidateMatchFeed(db, { userId: context.userId }),
    ]);
    if (!state) return null;

    const stale =
      !state.matchFeedRefreshedAt ||
      state.matchFeedRefreshedAt.getTime() < Date.now() - MATCHING_CONFIG.feedStaleMs;
    const resumeIsStale = Boolean(
      state.resumeKey &&
      state.resumeUpdatedAt &&
      state.resumeUpdatedAt.getTime() < Date.now() - MATCHING_CONFIG.resumeStaleMs,
    );
    const refreshStarted =
      state.resumeKey && stale
        ? await claimAndStartCandidateRefresh({ db, candidateId: context.userId })
        : false;

    return {
      status: refreshStarted
        ? ("processing" as const)
        : matchingStatusSchema.catch("pending").parse(state.matchFeedStatus),
      refreshPhase: refreshStarted
        ? ("queued" as const)
        : matchRefreshPhaseSchema.nullable().catch(null).parse(state.matchRefreshPhase),
      hasError: refreshStarted ? false : Boolean(state.matchFeedError),
      refreshedAt: state.matchFeedRefreshedAt,
      resumeUpdatedAt: state.resumeUpdatedAt,
      resumeIsStale,
      hasResume: Boolean(state.resumeKey),
      alertsEnabled: state.matchAlertsEnabled,
      items: rows.flatMap((row) => {
        const reasons = matchReasonsSchema.safeParse(row.reasons);
        if (!reasons.success) return [];
        return [{ ...row, reasons: reasons.data }];
      }),
    };
  });

export const getMyCandidateMatchRefreshProgress = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requireCandidate(context.user.role);
    const progress = await getCandidateMatchRefreshProgress(getDb(), {
      userId: context.userId,
    });
    if (!progress) return null;
    return {
      status: matchingStatusSchema.catch("pending").parse(progress.matchFeedStatus),
      phase: matchRefreshPhaseSchema.nullable().catch(null).parse(progress.matchRefreshPhase),
      error: progress.matchFeedError,
      refreshedAt: progress.matchFeedRefreshedAt,
    };
  });

export const refreshMyCandidateMatches = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requireCandidate(context.user.role);
    const started = await claimAndStartCandidateRefresh({
      db: getDb(),
      candidateId: context.userId,
      force: true,
    });
    return { started };
  });

export const dismissMyCandidateMatch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    requireCandidate(context.user.role);
    return {
      dismissed: Boolean(
        await dismissCandidateMatch(getDb(), {
          candidateId: context.userId,
          jobId: data.jobId,
        }),
      ),
    };
  });

export const viewMyCandidateMatch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    requireCandidate(context.user.role);
    return {
      viewed: Boolean(
        await markCandidateMatchViewed(getDb(), {
          candidateId: context.userId,
          jobId: data.jobId,
        }),
      ),
    };
  });

export const updateMyMatchAlerts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(alertsSchema))
  .handler(async ({ data, context }) => {
    requireCandidate(context.user.role);
    const profile = await updateCandidateMatchAlerts(getDb(), {
      userId: context.userId,
      enabled: data.enabled,
    });
    if (!profile) throw new Error("Candidate profile not found");
    return { enabled: profile.matchAlertsEnabled };
  });
