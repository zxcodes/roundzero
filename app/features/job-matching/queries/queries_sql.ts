import { Sql } from "postgres";

export const requestJobMatchingProfileQuery = `-- name: RequestJobMatchingProfile :one
INSERT INTO job_matching_profiles (
  job_id, requested_source_hash, source_version, extraction_status,
  extraction_token, extraction_claimed_at
)
VALUES ($1, $2, $3, 'pending', $4, now())
ON CONFLICT (job_id) DO UPDATE SET
  requested_source_hash = EXCLUDED.requested_source_hash,
  source_version = EXCLUDED.source_version,
  extraction_status = 'pending',
  extraction_error = NULL,
  extraction_token = EXCLUDED.extraction_token,
  extraction_claimed_at = now(),
  updated_at = now()
RETURNING job_id, requested_source_hash, completed_source_hash, source_version, extraction_status, extraction_error, matching_profile, model, prompt_version, extraction_token, extraction_claimed_at, completed_at, created_at, updated_at`;

export interface RequestJobMatchingProfileArgs {
    jobId: string;
    requestedSourceHash: string;
    sourceVersion: string;
    extractionToken: string;
}

export interface RequestJobMatchingProfileRow {
    jobId: string;
    requestedSourceHash: string;
    completedSourceHash: string | null;
    sourceVersion: string;
    extractionStatus: string;
    extractionError: string | null;
    matchingProfile: any | null;
    model: string | null;
    promptVersion: string | null;
    extractionToken: string;
    extractionClaimedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function requestJobMatchingProfile(sql: Sql, args: RequestJobMatchingProfileArgs): Promise<RequestJobMatchingProfileRow | null> {
    const rows = await sql.unsafe(requestJobMatchingProfileQuery, [args.jobId, args.requestedSourceHash, args.sourceVersion, args.extractionToken]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        jobId: row[0],
        requestedSourceHash: row[1],
        completedSourceHash: row[2],
        sourceVersion: row[3],
        extractionStatus: row[4],
        extractionError: row[5],
        matchingProfile: row[6],
        model: row[7],
        promptVersion: row[8],
        extractionToken: row[9],
        extractionClaimedAt: row[10],
        completedAt: row[11],
        createdAt: row[12],
        updatedAt: row[13]
    };
}

export const getJobMatchingProfileQuery = `-- name: GetJobMatchingProfile :one
SELECT job_id, requested_source_hash, completed_source_hash, source_version, extraction_status, extraction_error, matching_profile, model, prompt_version, extraction_token, extraction_claimed_at, completed_at, created_at, updated_at
FROM job_matching_profiles
WHERE job_id = $1`;

export interface GetJobMatchingProfileArgs {
    jobId: string;
}

export interface GetJobMatchingProfileRow {
    jobId: string;
    requestedSourceHash: string;
    completedSourceHash: string | null;
    sourceVersion: string;
    extractionStatus: string;
    extractionError: string | null;
    matchingProfile: any | null;
    model: string | null;
    promptVersion: string | null;
    extractionToken: string;
    extractionClaimedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getJobMatchingProfile(sql: Sql, args: GetJobMatchingProfileArgs): Promise<GetJobMatchingProfileRow | null> {
    const rows = await sql.unsafe(getJobMatchingProfileQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        jobId: row[0],
        requestedSourceHash: row[1],
        completedSourceHash: row[2],
        sourceVersion: row[3],
        extractionStatus: row[4],
        extractionError: row[5],
        matchingProfile: row[6],
        model: row[7],
        promptVersion: row[8],
        extractionToken: row[9],
        extractionClaimedAt: row[10],
        completedAt: row[11],
        createdAt: row[12],
        updatedAt: row[13]
    };
}

export const getJobForMatchingExtractionQuery = `-- name: GetJobForMatchingExtraction :one
SELECT id, title, description, experience_level, status, archived_at, expires_at
FROM jobs
WHERE id = $1`;

export interface GetJobForMatchingExtractionArgs {
    id: string;
}

export interface GetJobForMatchingExtractionRow {
    id: string;
    title: string;
    description: string;
    experienceLevel: string | null;
    status: string;
    archivedAt: Date | null;
    expiresAt: Date | null;
}

export async function getJobForMatchingExtraction(sql: Sql, args: GetJobForMatchingExtractionArgs): Promise<GetJobForMatchingExtractionRow | null> {
    const rows = await sql.unsafe(getJobForMatchingExtractionQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        title: row[1],
        description: row[2],
        experienceLevel: row[3],
        status: row[4],
        archivedAt: row[5],
        expiresAt: row[6]
    };
}

export const saveJobMatchingProfileIfCurrentQuery = `-- name: SaveJobMatchingProfileIfCurrent :one
UPDATE job_matching_profiles
SET completed_source_hash = $1,
    matching_profile = $2,
    model = $3,
    prompt_version = $4,
    extraction_status = 'ready',
    extraction_error = NULL,
    extraction_claimed_at = NULL,
    completed_at = now(),
    updated_at = now()
WHERE job_id = $5
  AND requested_source_hash = $1
  AND extraction_token = $6
RETURNING job_id, requested_source_hash, completed_source_hash, source_version, extraction_status, extraction_error, matching_profile, model, prompt_version, extraction_token, extraction_claimed_at, completed_at, created_at, updated_at`;

export interface SaveJobMatchingProfileIfCurrentArgs {
    sourceHash: string | null;
    matchingProfile: any | null;
    model: string | null;
    promptVersion: string | null;
    jobId: string;
    extractionToken: string;
}

export interface SaveJobMatchingProfileIfCurrentRow {
    jobId: string;
    requestedSourceHash: string;
    completedSourceHash: string | null;
    sourceVersion: string;
    extractionStatus: string;
    extractionError: string | null;
    matchingProfile: any | null;
    model: string | null;
    promptVersion: string | null;
    extractionToken: string;
    extractionClaimedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function saveJobMatchingProfileIfCurrent(sql: Sql, args: SaveJobMatchingProfileIfCurrentArgs): Promise<SaveJobMatchingProfileIfCurrentRow | null> {
    const rows = await sql.unsafe(saveJobMatchingProfileIfCurrentQuery, [args.sourceHash, args.matchingProfile, args.model, args.promptVersion, args.jobId, args.extractionToken]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        jobId: row[0],
        requestedSourceHash: row[1],
        completedSourceHash: row[2],
        sourceVersion: row[3],
        extractionStatus: row[4],
        extractionError: row[5],
        matchingProfile: row[6],
        model: row[7],
        promptVersion: row[8],
        extractionToken: row[9],
        extractionClaimedAt: row[10],
        completedAt: row[11],
        createdAt: row[12],
        updatedAt: row[13]
    };
}

export const markJobMatchingProfileFailedIfCurrentQuery = `-- name: MarkJobMatchingProfileFailedIfCurrent :one
UPDATE job_matching_profiles
SET extraction_status = 'failed',
    extraction_error = $1,
    extraction_claimed_at = NULL,
    updated_at = now()
WHERE job_id = $2
  AND extraction_token = $3
RETURNING job_id, requested_source_hash, completed_source_hash, source_version, extraction_status, extraction_error, matching_profile, model, prompt_version, extraction_token, extraction_claimed_at, completed_at, created_at, updated_at`;

export interface MarkJobMatchingProfileFailedIfCurrentArgs {
    errorMessage: string | null;
    jobId: string;
    extractionToken: string;
}

export interface MarkJobMatchingProfileFailedIfCurrentRow {
    jobId: string;
    requestedSourceHash: string;
    completedSourceHash: string | null;
    sourceVersion: string;
    extractionStatus: string;
    extractionError: string | null;
    matchingProfile: any | null;
    model: string | null;
    promptVersion: string | null;
    extractionToken: string;
    extractionClaimedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function markJobMatchingProfileFailedIfCurrent(sql: Sql, args: MarkJobMatchingProfileFailedIfCurrentArgs): Promise<MarkJobMatchingProfileFailedIfCurrentRow | null> {
    const rows = await sql.unsafe(markJobMatchingProfileFailedIfCurrentQuery, [args.errorMessage, args.jobId, args.extractionToken]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        jobId: row[0],
        requestedSourceHash: row[1],
        completedSourceHash: row[2],
        sourceVersion: row[3],
        extractionStatus: row[4],
        extractionError: row[5],
        matchingProfile: row[6],
        model: row[7],
        promptVersion: row[8],
        extractionToken: row[9],
        extractionClaimedAt: row[10],
        completedAt: row[11],
        createdAt: row[12],
        updatedAt: row[13]
    };
}

export const getCandidateMatchingStateQuery = `-- name: GetCandidateMatchingState :one
SELECT id, user_id, resume_key, resume_updated_at, matching_profile,
       matching_profile_source_hash, matching_profile_version,
       matching_profile_status, matching_profile_error,
       serving_match_generation, serving_match_input_hash,
       match_feed_status, match_feed_error, match_feed_refreshed_at,
       match_alerts_enabled, match_alerts_enabled_at,
       match_refresh_token, match_refresh_claimed_at, match_refresh_phase
FROM candidate_profiles
WHERE user_id = $1`;

export interface GetCandidateMatchingStateArgs {
    userId: string;
}

export interface GetCandidateMatchingStateRow {
    id: string;
    userId: string;
    resumeKey: string | null;
    resumeUpdatedAt: Date | null;
    matchingProfile: any | null;
    matchingProfileSourceHash: string | null;
    matchingProfileVersion: string | null;
    matchingProfileStatus: string;
    matchingProfileError: string | null;
    servingMatchGeneration: string | null;
    servingMatchInputHash: string | null;
    matchFeedStatus: string;
    matchFeedError: string | null;
    matchFeedRefreshedAt: Date | null;
    matchAlertsEnabled: boolean;
    matchAlertsEnabledAt: Date | null;
    matchRefreshToken: string | null;
    matchRefreshClaimedAt: Date | null;
    matchRefreshPhase: string | null;
}

export async function getCandidateMatchingState(sql: Sql, args: GetCandidateMatchingStateArgs): Promise<GetCandidateMatchingStateRow | null> {
    const rows = await sql.unsafe(getCandidateMatchingStateQuery, [args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        resumeKey: row[2],
        resumeUpdatedAt: row[3],
        matchingProfile: row[4],
        matchingProfileSourceHash: row[5],
        matchingProfileVersion: row[6],
        matchingProfileStatus: row[7],
        matchingProfileError: row[8],
        servingMatchGeneration: row[9],
        servingMatchInputHash: row[10],
        matchFeedStatus: row[11],
        matchFeedError: row[12],
        matchFeedRefreshedAt: row[13],
        matchAlertsEnabled: row[14],
        matchAlertsEnabledAt: row[15],
        matchRefreshToken: row[16],
        matchRefreshClaimedAt: row[17],
        matchRefreshPhase: row[18]
    };
}

export const getCandidateMatchRefreshProgressQuery = `-- name: GetCandidateMatchRefreshProgress :one
SELECT match_feed_status, match_feed_error, match_feed_refreshed_at,
       match_refresh_claimed_at, match_refresh_phase
FROM candidate_profiles
WHERE user_id = $1`;

export interface GetCandidateMatchRefreshProgressArgs {
    userId: string;
}

export interface GetCandidateMatchRefreshProgressRow {
    matchFeedStatus: string;
    matchFeedError: string | null;
    matchFeedRefreshedAt: Date | null;
    matchRefreshClaimedAt: Date | null;
    matchRefreshPhase: string | null;
}

export async function getCandidateMatchRefreshProgress(sql: Sql, args: GetCandidateMatchRefreshProgressArgs): Promise<GetCandidateMatchRefreshProgressRow | null> {
    const rows = await sql.unsafe(getCandidateMatchRefreshProgressQuery, [args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        matchFeedStatus: row[0],
        matchFeedError: row[1],
        matchFeedRefreshedAt: row[2],
        matchRefreshClaimedAt: row[3],
        matchRefreshPhase: row[4]
    };
}

export const saveCandidateMatchingProfileIfCurrentQuery = `-- name: SaveCandidateMatchingProfileIfCurrent :one
UPDATE candidate_profiles
SET matching_profile = $1,
    matching_profile_source_hash = $2,
    matching_profile_version = $3,
    matching_profile_status = 'ready',
    matching_profile_error = NULL,
    updated_at = now()
WHERE user_id = $4
  AND resume_key = $5
  AND match_refresh_token = $6
RETURNING id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at, matching_profile, matching_profile_source_hash, matching_profile_version, matching_profile_status, matching_profile_error, serving_match_generation, serving_match_input_hash, match_feed_status, match_feed_error, match_feed_refreshed_at, match_alerts_enabled, match_alerts_enabled_at, match_refresh_token, match_refresh_claimed_at, match_refresh_phase`;

export interface SaveCandidateMatchingProfileIfCurrentArgs {
    matchingProfile: any | null;
    sourceHash: string | null;
    profileVersion: string | null;
    userId: string;
    resumeKey: string | null;
    refreshToken: string | null;
}

export interface SaveCandidateMatchingProfileIfCurrentRow {
    id: string;
    userId: string;
    onboardingCompletedAt: Date | null;
    resumeKey: string | null;
    resumeUpdatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    matchingProfile: any | null;
    matchingProfileSourceHash: string | null;
    matchingProfileVersion: string | null;
    matchingProfileStatus: string;
    matchingProfileError: string | null;
    servingMatchGeneration: string | null;
    servingMatchInputHash: string | null;
    matchFeedStatus: string;
    matchFeedError: string | null;
    matchFeedRefreshedAt: Date | null;
    matchAlertsEnabled: boolean;
    matchAlertsEnabledAt: Date | null;
    matchRefreshToken: string | null;
    matchRefreshClaimedAt: Date | null;
    matchRefreshPhase: string | null;
}

export async function saveCandidateMatchingProfileIfCurrent(sql: Sql, args: SaveCandidateMatchingProfileIfCurrentArgs): Promise<SaveCandidateMatchingProfileIfCurrentRow | null> {
    const rows = await sql.unsafe(saveCandidateMatchingProfileIfCurrentQuery, [args.matchingProfile, args.sourceHash, args.profileVersion, args.userId, args.resumeKey, args.refreshToken]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        onboardingCompletedAt: row[2],
        resumeKey: row[3],
        resumeUpdatedAt: row[4],
        createdAt: row[5],
        updatedAt: row[6],
        matchingProfile: row[7],
        matchingProfileSourceHash: row[8],
        matchingProfileVersion: row[9],
        matchingProfileStatus: row[10],
        matchingProfileError: row[11],
        servingMatchGeneration: row[12],
        servingMatchInputHash: row[13],
        matchFeedStatus: row[14],
        matchFeedError: row[15],
        matchFeedRefreshedAt: row[16],
        matchAlertsEnabled: row[17],
        matchAlertsEnabledAt: row[18],
        matchRefreshToken: row[19],
        matchRefreshClaimedAt: row[20],
        matchRefreshPhase: row[21]
    };
}

export const markCandidateProfileFailedIfCurrentQuery = `-- name: MarkCandidateProfileFailedIfCurrent :one
UPDATE candidate_profiles
SET matching_profile_status = 'failed',
    matching_profile_error = $1,
    match_feed_status = 'failed',
    match_feed_error = $1,
    match_refresh_claimed_at = NULL,
    match_refresh_phase = NULL,
    updated_at = now()
WHERE user_id = $2
  AND match_refresh_token = $3
RETURNING id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at, matching_profile, matching_profile_source_hash, matching_profile_version, matching_profile_status, matching_profile_error, serving_match_generation, serving_match_input_hash, match_feed_status, match_feed_error, match_feed_refreshed_at, match_alerts_enabled, match_alerts_enabled_at, match_refresh_token, match_refresh_claimed_at, match_refresh_phase`;

export interface MarkCandidateProfileFailedIfCurrentArgs {
    errorMessage: string | null;
    userId: string;
    refreshToken: string | null;
}

export interface MarkCandidateProfileFailedIfCurrentRow {
    id: string;
    userId: string;
    onboardingCompletedAt: Date | null;
    resumeKey: string | null;
    resumeUpdatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    matchingProfile: any | null;
    matchingProfileSourceHash: string | null;
    matchingProfileVersion: string | null;
    matchingProfileStatus: string;
    matchingProfileError: string | null;
    servingMatchGeneration: string | null;
    servingMatchInputHash: string | null;
    matchFeedStatus: string;
    matchFeedError: string | null;
    matchFeedRefreshedAt: Date | null;
    matchAlertsEnabled: boolean;
    matchAlertsEnabledAt: Date | null;
    matchRefreshToken: string | null;
    matchRefreshClaimedAt: Date | null;
    matchRefreshPhase: string | null;
}

export async function markCandidateProfileFailedIfCurrent(sql: Sql, args: MarkCandidateProfileFailedIfCurrentArgs): Promise<MarkCandidateProfileFailedIfCurrentRow | null> {
    const rows = await sql.unsafe(markCandidateProfileFailedIfCurrentQuery, [args.errorMessage, args.userId, args.refreshToken]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        onboardingCompletedAt: row[2],
        resumeKey: row[3],
        resumeUpdatedAt: row[4],
        createdAt: row[5],
        updatedAt: row[6],
        matchingProfile: row[7],
        matchingProfileSourceHash: row[8],
        matchingProfileVersion: row[9],
        matchingProfileStatus: row[10],
        matchingProfileError: row[11],
        servingMatchGeneration: row[12],
        servingMatchInputHash: row[13],
        matchFeedStatus: row[14],
        matchFeedError: row[15],
        matchFeedRefreshedAt: row[16],
        matchAlertsEnabled: row[17],
        matchAlertsEnabledAt: row[18],
        matchRefreshToken: row[19],
        matchRefreshClaimedAt: row[20],
        matchRefreshPhase: row[21]
    };
}

export const claimCandidateMatchRefreshQuery = `-- name: ClaimCandidateMatchRefresh :one
UPDATE candidate_profiles
SET match_refresh_token = $1,
    match_refresh_claimed_at = now(),
    match_refresh_phase = 'queued',
    match_feed_status = 'processing',
    match_feed_error = NULL,
    updated_at = now()
WHERE user_id = $2
  AND resume_key IS NOT NULL
  AND (
    match_refresh_claimed_at IS NULL
    OR match_refresh_claimed_at < $3
  )
RETURNING user_id, match_refresh_token, resume_key`;

export interface ClaimCandidateMatchRefreshArgs {
    refreshToken: string | null;
    userId: string;
    claimCutoff: Date | null;
}

export interface ClaimCandidateMatchRefreshRow {
    userId: string;
    matchRefreshToken: string | null;
    resumeKey: string | null;
}

export async function claimCandidateMatchRefresh(sql: Sql, args: ClaimCandidateMatchRefreshArgs): Promise<ClaimCandidateMatchRefreshRow | null> {
    const rows = await sql.unsafe(claimCandidateMatchRefreshQuery, [args.refreshToken, args.userId, args.claimCutoff]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        userId: row[0],
        matchRefreshToken: row[1],
        resumeKey: row[2]
    };
}

export const setCandidateMatchRefreshPhaseIfCurrentQuery = `-- name: SetCandidateMatchRefreshPhaseIfCurrent :one
UPDATE candidate_profiles
SET match_refresh_phase = $1,
    updated_at = now()
WHERE user_id = $2
  AND match_refresh_token = $3
  AND match_feed_status = 'processing'
RETURNING user_id, match_refresh_phase`;

export interface SetCandidateMatchRefreshPhaseIfCurrentArgs {
    phase: string | null;
    userId: string;
    refreshToken: string | null;
}

export interface SetCandidateMatchRefreshPhaseIfCurrentRow {
    userId: string;
    matchRefreshPhase: string | null;
}

export async function setCandidateMatchRefreshPhaseIfCurrent(sql: Sql, args: SetCandidateMatchRefreshPhaseIfCurrentArgs): Promise<SetCandidateMatchRefreshPhaseIfCurrentRow | null> {
    const rows = await sql.unsafe(setCandidateMatchRefreshPhaseIfCurrentQuery, [args.phase, args.userId, args.refreshToken]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        userId: row[0],
        matchRefreshPhase: row[1]
    };
}

export const lockCandidateMatchRefreshQuery = `-- name: LockCandidateMatchRefresh :one
SELECT user_id, resume_key, matching_profile_source_hash, match_refresh_token
FROM candidate_profiles
WHERE user_id = $1
FOR UPDATE`;

export interface LockCandidateMatchRefreshArgs {
    userId: string;
}

export interface LockCandidateMatchRefreshRow {
    userId: string;
    resumeKey: string | null;
    matchingProfileSourceHash: string | null;
    matchRefreshToken: string | null;
}

export async function lockCandidateMatchRefresh(sql: Sql, args: LockCandidateMatchRefreshArgs): Promise<LockCandidateMatchRefreshRow | null> {
    const rows = await sql.unsafe(lockCandidateMatchRefreshQuery, [args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        userId: row[0],
        resumeKey: row[1],
        matchingProfileSourceHash: row[2],
        matchRefreshToken: row[3]
    };
}

export const touchCandidateMatchFeedIfCurrentQuery = `-- name: TouchCandidateMatchFeedIfCurrent :one
UPDATE candidate_profiles
SET match_feed_status = 'ready',
    match_feed_error = NULL,
    match_feed_refreshed_at = now(),
    match_refresh_claimed_at = NULL,
    match_refresh_phase = NULL,
    updated_at = now()
WHERE user_id = $1
  AND match_refresh_token = $2
RETURNING id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at, matching_profile, matching_profile_source_hash, matching_profile_version, matching_profile_status, matching_profile_error, serving_match_generation, serving_match_input_hash, match_feed_status, match_feed_error, match_feed_refreshed_at, match_alerts_enabled, match_alerts_enabled_at, match_refresh_token, match_refresh_claimed_at, match_refresh_phase`;

export interface TouchCandidateMatchFeedIfCurrentArgs {
    userId: string;
    refreshToken: string | null;
}

export interface TouchCandidateMatchFeedIfCurrentRow {
    id: string;
    userId: string;
    onboardingCompletedAt: Date | null;
    resumeKey: string | null;
    resumeUpdatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    matchingProfile: any | null;
    matchingProfileSourceHash: string | null;
    matchingProfileVersion: string | null;
    matchingProfileStatus: string;
    matchingProfileError: string | null;
    servingMatchGeneration: string | null;
    servingMatchInputHash: string | null;
    matchFeedStatus: string;
    matchFeedError: string | null;
    matchFeedRefreshedAt: Date | null;
    matchAlertsEnabled: boolean;
    matchAlertsEnabledAt: Date | null;
    matchRefreshToken: string | null;
    matchRefreshClaimedAt: Date | null;
    matchRefreshPhase: string | null;
}

export async function touchCandidateMatchFeedIfCurrent(sql: Sql, args: TouchCandidateMatchFeedIfCurrentArgs): Promise<TouchCandidateMatchFeedIfCurrentRow | null> {
    const rows = await sql.unsafe(touchCandidateMatchFeedIfCurrentQuery, [args.userId, args.refreshToken]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        onboardingCompletedAt: row[2],
        resumeKey: row[3],
        resumeUpdatedAt: row[4],
        createdAt: row[5],
        updatedAt: row[6],
        matchingProfile: row[7],
        matchingProfileSourceHash: row[8],
        matchingProfileVersion: row[9],
        matchingProfileStatus: row[10],
        matchingProfileError: row[11],
        servingMatchGeneration: row[12],
        servingMatchInputHash: row[13],
        matchFeedStatus: row[14],
        matchFeedError: row[15],
        matchFeedRefreshedAt: row[16],
        matchAlertsEnabled: row[17],
        matchAlertsEnabledAt: row[18],
        matchRefreshToken: row[19],
        matchRefreshClaimedAt: row[20],
        matchRefreshPhase: row[21]
    };
}

export const markCandidateFeedFailedIfCurrentQuery = `-- name: MarkCandidateFeedFailedIfCurrent :one
UPDATE candidate_profiles
SET match_feed_status = 'failed',
    match_feed_error = $1,
    match_refresh_claimed_at = NULL,
    match_refresh_phase = NULL,
    updated_at = now()
WHERE user_id = $2
  AND match_refresh_token = $3
RETURNING id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at, matching_profile, matching_profile_source_hash, matching_profile_version, matching_profile_status, matching_profile_error, serving_match_generation, serving_match_input_hash, match_feed_status, match_feed_error, match_feed_refreshed_at, match_alerts_enabled, match_alerts_enabled_at, match_refresh_token, match_refresh_claimed_at, match_refresh_phase`;

export interface MarkCandidateFeedFailedIfCurrentArgs {
    errorMessage: string | null;
    userId: string;
    refreshToken: string | null;
}

export interface MarkCandidateFeedFailedIfCurrentRow {
    id: string;
    userId: string;
    onboardingCompletedAt: Date | null;
    resumeKey: string | null;
    resumeUpdatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    matchingProfile: any | null;
    matchingProfileSourceHash: string | null;
    matchingProfileVersion: string | null;
    matchingProfileStatus: string;
    matchingProfileError: string | null;
    servingMatchGeneration: string | null;
    servingMatchInputHash: string | null;
    matchFeedStatus: string;
    matchFeedError: string | null;
    matchFeedRefreshedAt: Date | null;
    matchAlertsEnabled: boolean;
    matchAlertsEnabledAt: Date | null;
    matchRefreshToken: string | null;
    matchRefreshClaimedAt: Date | null;
    matchRefreshPhase: string | null;
}

export async function markCandidateFeedFailedIfCurrent(sql: Sql, args: MarkCandidateFeedFailedIfCurrentArgs): Promise<MarkCandidateFeedFailedIfCurrentRow | null> {
    const rows = await sql.unsafe(markCandidateFeedFailedIfCurrentQuery, [args.errorMessage, args.userId, args.refreshToken]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        onboardingCompletedAt: row[2],
        resumeKey: row[3],
        resumeUpdatedAt: row[4],
        createdAt: row[5],
        updatedAt: row[6],
        matchingProfile: row[7],
        matchingProfileSourceHash: row[8],
        matchingProfileVersion: row[9],
        matchingProfileStatus: row[10],
        matchingProfileError: row[11],
        servingMatchGeneration: row[12],
        servingMatchInputHash: row[13],
        matchFeedStatus: row[14],
        matchFeedError: row[15],
        matchFeedRefreshedAt: row[16],
        matchAlertsEnabled: row[17],
        matchAlertsEnabledAt: row[18],
        matchRefreshToken: row[19],
        matchRefreshClaimedAt: row[20],
        matchRefreshPhase: row[21]
    };
}

export const listEligibleJobsForCandidateMatchingQuery = `-- name: ListEligibleJobsForCandidateMatching :many
SELECT j.id, j.title, j.location, j.workplace_type, j.employment_type,
       j.experience_level, j.created_at, p.matching_profile,
       p.completed_source_hash, p.source_version
FROM jobs j
JOIN companies c ON c.id = j.company_id
JOIN users owner ON owner.id = c.owner_id
JOIN job_matching_profiles p ON p.job_id = j.id
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND owner.deleted_at IS NULL
  AND p.extraction_status = 'ready'
  AND p.completed_source_hash = p.requested_source_hash
  AND p.source_version = 'job-profile-v4-markdown'
  AND NOT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.job_id = j.id AND a.candidate_id = $1
  )
ORDER BY j.created_at DESC, j.id`;

export interface ListEligibleJobsForCandidateMatchingArgs {
    candidateId: string;
}

export interface ListEligibleJobsForCandidateMatchingRow {
    id: string;
    title: string;
    location: string | null;
    workplaceType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    createdAt: Date;
    matchingProfile: any | null;
    completedSourceHash: string | null;
    sourceVersion: string;
}

export async function listEligibleJobsForCandidateMatching(sql: Sql, args: ListEligibleJobsForCandidateMatchingArgs): Promise<ListEligibleJobsForCandidateMatchingRow[]> {
    return (await sql.unsafe(listEligibleJobsForCandidateMatchingQuery, [args.candidateId]).values()).map(row => ({
        id: row[0],
        title: row[1],
        location: row[2],
        workplaceType: row[3],
        employmentType: row[4],
        experienceLevel: row[5],
        createdAt: row[6],
        matchingProfile: row[7],
        completedSourceHash: row[8],
        sourceVersion: row[9]
    }));
}

export const upsertCandidateJobMatchQuery = `-- name: UpsertCandidateJobMatch :one
INSERT INTO candidate_job_matches (
  candidate_id, job_id, generation_id, candidate_profile_source_hash,
  job_profile_source_hash, score, band, reasons, consideration,
  algorithm_version, threshold_version, prompt_version, model,
  first_strong_at
)
VALUES (
  $1, $2, $3,
  $4, $5,
  $6, $7, $8, $9,
  $10, $11,
  $12, $13,
  CASE WHEN $7::text = 'strong' THEN now() ELSE NULL END
)
ON CONFLICT (candidate_id, job_id) DO UPDATE SET
  generation_id = EXCLUDED.generation_id,
  candidate_profile_source_hash = EXCLUDED.candidate_profile_source_hash,
  job_profile_source_hash = EXCLUDED.job_profile_source_hash,
  score = EXCLUDED.score,
  band = EXCLUDED.band,
  reasons = EXCLUDED.reasons,
  consideration = EXCLUDED.consideration,
  algorithm_version = EXCLUDED.algorithm_version,
  threshold_version = EXCLUDED.threshold_version,
  prompt_version = EXCLUDED.prompt_version,
  model = EXCLUDED.model,
  matched_at = now(),
  first_strong_at = COALESCE(candidate_job_matches.first_strong_at, EXCLUDED.first_strong_at),
  updated_at = now()
RETURNING candidate_id, job_id, generation_id, candidate_profile_source_hash, job_profile_source_hash, score, band, reasons, consideration, algorithm_version, threshold_version, prompt_version, model, matched_at, first_strong_at, viewed_at, dismissed_at, digest_notified_at, created_at, updated_at`;

export interface UpsertCandidateJobMatchArgs {
    candidateId: string;
    jobId: string;
    generationId: string;
    candidateProfileSourceHash: string;
    jobProfileSourceHash: string;
    score: number;
    band: string;
    reasons: any;
    consideration: string | null;
    algorithmVersion: string;
    thresholdVersion: string;
    promptVersion: string;
    model: string;
}

export interface UpsertCandidateJobMatchRow {
    candidateId: string;
    jobId: string;
    generationId: string;
    candidateProfileSourceHash: string;
    jobProfileSourceHash: string;
    score: number;
    band: string;
    reasons: any;
    consideration: string | null;
    algorithmVersion: string;
    thresholdVersion: string;
    promptVersion: string;
    model: string;
    matchedAt: Date;
    firstStrongAt: Date | null;
    viewedAt: Date | null;
    dismissedAt: Date | null;
    digestNotifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function upsertCandidateJobMatch(sql: Sql, args: UpsertCandidateJobMatchArgs): Promise<UpsertCandidateJobMatchRow | null> {
    const rows = await sql.unsafe(upsertCandidateJobMatchQuery, [args.candidateId, args.jobId, args.generationId, args.candidateProfileSourceHash, args.jobProfileSourceHash, args.score, args.band, args.reasons, args.consideration, args.algorithmVersion, args.thresholdVersion, args.promptVersion, args.model]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        candidateId: row[0],
        jobId: row[1],
        generationId: row[2],
        candidateProfileSourceHash: row[3],
        jobProfileSourceHash: row[4],
        score: row[5],
        band: row[6],
        reasons: row[7],
        consideration: row[8],
        algorithmVersion: row[9],
        thresholdVersion: row[10],
        promptVersion: row[11],
        model: row[12],
        matchedAt: row[13],
        firstStrongAt: row[14],
        viewedAt: row[15],
        dismissedAt: row[16],
        digestNotifiedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19]
    };
}

export const publishCandidateMatchGenerationIfCurrentQuery = `-- name: PublishCandidateMatchGenerationIfCurrent :one
UPDATE candidate_profiles
SET serving_match_generation = $1,
    serving_match_input_hash = $2,
    match_feed_status = 'ready',
    match_feed_error = NULL,
    match_feed_refreshed_at = now(),
    match_refresh_claimed_at = NULL,
    match_refresh_phase = NULL,
    updated_at = now()
WHERE user_id = $3
  AND match_refresh_token = $4
  AND matching_profile_source_hash = $5
RETURNING id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at, matching_profile, matching_profile_source_hash, matching_profile_version, matching_profile_status, matching_profile_error, serving_match_generation, serving_match_input_hash, match_feed_status, match_feed_error, match_feed_refreshed_at, match_alerts_enabled, match_alerts_enabled_at, match_refresh_token, match_refresh_claimed_at, match_refresh_phase`;

export interface PublishCandidateMatchGenerationIfCurrentArgs {
    generationId: string | null;
    inputHash: string | null;
    userId: string;
    refreshToken: string | null;
    candidateProfileSourceHash: string | null;
}

export interface PublishCandidateMatchGenerationIfCurrentRow {
    id: string;
    userId: string;
    onboardingCompletedAt: Date | null;
    resumeKey: string | null;
    resumeUpdatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    matchingProfile: any | null;
    matchingProfileSourceHash: string | null;
    matchingProfileVersion: string | null;
    matchingProfileStatus: string;
    matchingProfileError: string | null;
    servingMatchGeneration: string | null;
    servingMatchInputHash: string | null;
    matchFeedStatus: string;
    matchFeedError: string | null;
    matchFeedRefreshedAt: Date | null;
    matchAlertsEnabled: boolean;
    matchAlertsEnabledAt: Date | null;
    matchRefreshToken: string | null;
    matchRefreshClaimedAt: Date | null;
    matchRefreshPhase: string | null;
}

export async function publishCandidateMatchGenerationIfCurrent(sql: Sql, args: PublishCandidateMatchGenerationIfCurrentArgs): Promise<PublishCandidateMatchGenerationIfCurrentRow | null> {
    const rows = await sql.unsafe(publishCandidateMatchGenerationIfCurrentQuery, [args.generationId, args.inputHash, args.userId, args.refreshToken, args.candidateProfileSourceHash]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        onboardingCompletedAt: row[2],
        resumeKey: row[3],
        resumeUpdatedAt: row[4],
        createdAt: row[5],
        updatedAt: row[6],
        matchingProfile: row[7],
        matchingProfileSourceHash: row[8],
        matchingProfileVersion: row[9],
        matchingProfileStatus: row[10],
        matchingProfileError: row[11],
        servingMatchGeneration: row[12],
        servingMatchInputHash: row[13],
        matchFeedStatus: row[14],
        matchFeedError: row[15],
        matchFeedRefreshedAt: row[16],
        matchAlertsEnabled: row[17],
        matchAlertsEnabledAt: row[18],
        matchRefreshToken: row[19],
        matchRefreshClaimedAt: row[20],
        matchRefreshPhase: row[21]
    };
}

export const getCandidateMatchFeedQuery = `-- name: GetCandidateMatchFeed :many
SELECT m.job_id, m.score, m.band, m.reasons, m.consideration, m.matched_at,
       m.viewed_at, j.title, j.location, j.workplace_type, j.employment_type,
       j.experience_level, j.salary_min, j.salary_max, j.salary_currency,
       j.created_at, c.name AS company_name, c.slug AS company_slug
FROM candidate_profiles cp
JOIN candidate_job_matches m
  ON m.candidate_id = cp.user_id
 AND m.generation_id = cp.serving_match_generation
JOIN jobs j ON j.id = m.job_id
JOIN companies c ON c.id = j.company_id
JOIN users owner ON owner.id = c.owner_id
JOIN job_matching_profiles p ON p.job_id = j.id
WHERE cp.user_id = $1
  AND m.dismissed_at IS NULL
  AND j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND owner.deleted_at IS NULL
  AND p.extraction_status = 'ready'
  AND p.completed_source_hash = p.requested_source_hash
  AND NOT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.job_id = j.id AND a.candidate_id = cp.user_id
  )
ORDER BY m.score DESC, m.matched_at DESC, m.job_id`;

export interface GetCandidateMatchFeedArgs {
    userId: string;
}

export interface GetCandidateMatchFeedRow {
    jobId: string;
    score: number;
    band: string;
    reasons: any;
    consideration: string | null;
    matchedAt: Date;
    viewedAt: Date | null;
    title: string;
    location: string | null;
    workplaceType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    createdAt: Date;
    companyName: string;
    companySlug: string;
}

export async function getCandidateMatchFeed(sql: Sql, args: GetCandidateMatchFeedArgs): Promise<GetCandidateMatchFeedRow[]> {
    return (await sql.unsafe(getCandidateMatchFeedQuery, [args.userId]).values()).map(row => ({
        jobId: row[0],
        score: row[1],
        band: row[2],
        reasons: row[3],
        consideration: row[4],
        matchedAt: row[5],
        viewedAt: row[6],
        title: row[7],
        location: row[8],
        workplaceType: row[9],
        employmentType: row[10],
        experienceLevel: row[11],
        salaryMin: row[12],
        salaryMax: row[13],
        salaryCurrency: row[14],
        createdAt: row[15],
        companyName: row[16],
        companySlug: row[17]
    }));
}

export const markCandidateMatchViewedQuery = `-- name: MarkCandidateMatchViewed :one
UPDATE candidate_job_matches
SET viewed_at = COALESCE(viewed_at, now()), updated_at = now()
WHERE candidate_id = $1 AND job_id = $2
RETURNING candidate_id, job_id, generation_id, candidate_profile_source_hash, job_profile_source_hash, score, band, reasons, consideration, algorithm_version, threshold_version, prompt_version, model, matched_at, first_strong_at, viewed_at, dismissed_at, digest_notified_at, created_at, updated_at`;

export interface MarkCandidateMatchViewedArgs {
    candidateId: string;
    jobId: string;
}

export interface MarkCandidateMatchViewedRow {
    candidateId: string;
    jobId: string;
    generationId: string;
    candidateProfileSourceHash: string;
    jobProfileSourceHash: string;
    score: number;
    band: string;
    reasons: any;
    consideration: string | null;
    algorithmVersion: string;
    thresholdVersion: string;
    promptVersion: string;
    model: string;
    matchedAt: Date;
    firstStrongAt: Date | null;
    viewedAt: Date | null;
    dismissedAt: Date | null;
    digestNotifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function markCandidateMatchViewed(sql: Sql, args: MarkCandidateMatchViewedArgs): Promise<MarkCandidateMatchViewedRow | null> {
    const rows = await sql.unsafe(markCandidateMatchViewedQuery, [args.candidateId, args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        candidateId: row[0],
        jobId: row[1],
        generationId: row[2],
        candidateProfileSourceHash: row[3],
        jobProfileSourceHash: row[4],
        score: row[5],
        band: row[6],
        reasons: row[7],
        consideration: row[8],
        algorithmVersion: row[9],
        thresholdVersion: row[10],
        promptVersion: row[11],
        model: row[12],
        matchedAt: row[13],
        firstStrongAt: row[14],
        viewedAt: row[15],
        dismissedAt: row[16],
        digestNotifiedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19]
    };
}

export const dismissCandidateMatchQuery = `-- name: DismissCandidateMatch :one
UPDATE candidate_job_matches
SET dismissed_at = COALESCE(dismissed_at, now()), updated_at = now()
WHERE candidate_id = $1 AND job_id = $2
RETURNING candidate_id, job_id, generation_id, candidate_profile_source_hash, job_profile_source_hash, score, band, reasons, consideration, algorithm_version, threshold_version, prompt_version, model, matched_at, first_strong_at, viewed_at, dismissed_at, digest_notified_at, created_at, updated_at`;

export interface DismissCandidateMatchArgs {
    candidateId: string;
    jobId: string;
}

export interface DismissCandidateMatchRow {
    candidateId: string;
    jobId: string;
    generationId: string;
    candidateProfileSourceHash: string;
    jobProfileSourceHash: string;
    score: number;
    band: string;
    reasons: any;
    consideration: string | null;
    algorithmVersion: string;
    thresholdVersion: string;
    promptVersion: string;
    model: string;
    matchedAt: Date;
    firstStrongAt: Date | null;
    viewedAt: Date | null;
    dismissedAt: Date | null;
    digestNotifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function dismissCandidateMatch(sql: Sql, args: DismissCandidateMatchArgs): Promise<DismissCandidateMatchRow | null> {
    const rows = await sql.unsafe(dismissCandidateMatchQuery, [args.candidateId, args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        candidateId: row[0],
        jobId: row[1],
        generationId: row[2],
        candidateProfileSourceHash: row[3],
        jobProfileSourceHash: row[4],
        score: row[5],
        band: row[6],
        reasons: row[7],
        consideration: row[8],
        algorithmVersion: row[9],
        thresholdVersion: row[10],
        promptVersion: row[11],
        model: row[12],
        matchedAt: row[13],
        firstStrongAt: row[14],
        viewedAt: row[15],
        dismissedAt: row[16],
        digestNotifiedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19]
    };
}

export const updateCandidateMatchAlertsQuery = `-- name: UpdateCandidateMatchAlerts :one
UPDATE candidate_profiles
SET match_alerts_enabled = $1,
    match_alerts_enabled_at = CASE WHEN $1::boolean THEN now() ELSE NULL END,
    updated_at = now()
WHERE user_id = $2
RETURNING id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at, matching_profile, matching_profile_source_hash, matching_profile_version, matching_profile_status, matching_profile_error, serving_match_generation, serving_match_input_hash, match_feed_status, match_feed_error, match_feed_refreshed_at, match_alerts_enabled, match_alerts_enabled_at, match_refresh_token, match_refresh_claimed_at, match_refresh_phase`;

export interface UpdateCandidateMatchAlertsArgs {
    enabled: boolean;
    userId: string;
}

export interface UpdateCandidateMatchAlertsRow {
    id: string;
    userId: string;
    onboardingCompletedAt: Date | null;
    resumeKey: string | null;
    resumeUpdatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    matchingProfile: any | null;
    matchingProfileSourceHash: string | null;
    matchingProfileVersion: string | null;
    matchingProfileStatus: string;
    matchingProfileError: string | null;
    servingMatchGeneration: string | null;
    servingMatchInputHash: string | null;
    matchFeedStatus: string;
    matchFeedError: string | null;
    matchFeedRefreshedAt: Date | null;
    matchAlertsEnabled: boolean;
    matchAlertsEnabledAt: Date | null;
    matchRefreshToken: string | null;
    matchRefreshClaimedAt: Date | null;
    matchRefreshPhase: string | null;
}

export async function updateCandidateMatchAlerts(sql: Sql, args: UpdateCandidateMatchAlertsArgs): Promise<UpdateCandidateMatchAlertsRow | null> {
    const rows = await sql.unsafe(updateCandidateMatchAlertsQuery, [args.enabled, args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        onboardingCompletedAt: row[2],
        resumeKey: row[3],
        resumeUpdatedAt: row[4],
        createdAt: row[5],
        updatedAt: row[6],
        matchingProfile: row[7],
        matchingProfileSourceHash: row[8],
        matchingProfileVersion: row[9],
        matchingProfileStatus: row[10],
        matchingProfileError: row[11],
        servingMatchGeneration: row[12],
        servingMatchInputHash: row[13],
        matchFeedStatus: row[14],
        matchFeedError: row[15],
        matchFeedRefreshedAt: row[16],
        matchAlertsEnabled: row[17],
        matchAlertsEnabledAt: row[18],
        matchRefreshToken: row[19],
        matchRefreshClaimedAt: row[20],
        matchRefreshPhase: row[21]
    };
}

export const claimCandidateRefreshBatchQuery = `-- name: ClaimCandidateRefreshBatch :many
WITH candidates AS (
  SELECT cp.id
  FROM candidate_profiles cp
  JOIN users u ON u.id = cp.user_id
  WHERE cp.resume_key IS NOT NULL
    AND cp.match_alerts_enabled
    AND u.deleted_at IS NULL
    AND (cp.match_refresh_claimed_at IS NULL OR cp.match_refresh_claimed_at < $1)
  ORDER BY cp.match_feed_refreshed_at NULLS FIRST, cp.id
  FOR UPDATE OF cp SKIP LOCKED
  LIMIT $2
)
UPDATE candidate_profiles cp
SET match_refresh_token = gen_random_uuid(),
    match_refresh_claimed_at = now(),
    match_refresh_phase = 'queued',
    match_feed_status = 'processing',
    match_feed_error = NULL,
    updated_at = now()
FROM candidates
WHERE cp.id = candidates.id
RETURNING cp.user_id, cp.match_refresh_token`;

export interface ClaimCandidateRefreshBatchArgs {
    claimCutoff: Date | null;
    batchLimit: string;
}

export interface ClaimCandidateRefreshBatchRow {
    userId: string;
    matchRefreshToken: string | null;
}

export async function claimCandidateRefreshBatch(sql: Sql, args: ClaimCandidateRefreshBatchArgs): Promise<ClaimCandidateRefreshBatchRow[]> {
    return (await sql.unsafe(claimCandidateRefreshBatchQuery, [args.claimCutoff, args.batchLimit]).values()).map(row => ({
        userId: row[0],
        matchRefreshToken: row[1]
    }));
}

export const claimJobProfileRecoveryBatchQuery = `-- name: ClaimJobProfileRecoveryBatch :many
WITH profiles AS (
  SELECT p.job_id
  FROM job_matching_profiles p
  JOIN jobs j ON j.id = p.job_id
  WHERE j.status = 'open'
    AND j.archived_at IS NULL
    AND (j.expires_at IS NULL OR j.expires_at > now())
    AND (
      p.extraction_status IN ('pending', 'failed')
      OR p.completed_source_hash IS DISTINCT FROM p.requested_source_hash
      OR p.extraction_claimed_at < $1
    )
    AND (p.extraction_claimed_at IS NULL OR p.extraction_claimed_at < $1)
  ORDER BY p.updated_at, p.job_id
  FOR UPDATE OF p SKIP LOCKED
  LIMIT $2
)
UPDATE job_matching_profiles p
SET extraction_token = gen_random_uuid(),
    extraction_claimed_at = now(),
    extraction_status = 'pending',
    extraction_error = NULL,
    updated_at = now()
FROM profiles
WHERE p.job_id = profiles.job_id
RETURNING p.job_id, p.extraction_token`;

export interface ClaimJobProfileRecoveryBatchArgs {
    claimCutoff: Date | null;
    batchLimit: string;
}

export interface ClaimJobProfileRecoveryBatchRow {
    jobId: string;
    extractionToken: string;
}

export async function claimJobProfileRecoveryBatch(sql: Sql, args: ClaimJobProfileRecoveryBatchArgs): Promise<ClaimJobProfileRecoveryBatchRow[]> {
    return (await sql.unsafe(claimJobProfileRecoveryBatchQuery, [args.claimCutoff, args.batchLimit]).values()).map(row => ({
        jobId: row[0],
        extractionToken: row[1]
    }));
}

export const listOpenJobsWithOutdatedMatchingProfileQuery = `-- name: ListOpenJobsWithOutdatedMatchingProfile :many
SELECT j.id, j.title, j.description, j.experience_level
FROM jobs j
JOIN job_matching_profiles p ON p.job_id = j.id
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND p.source_version <> 'job-profile-v4-markdown'
ORDER BY p.updated_at, p.job_id
LIMIT $1`;

export interface ListOpenJobsWithOutdatedMatchingProfileArgs {
    limit: string;
}

export interface ListOpenJobsWithOutdatedMatchingProfileRow {
    id: string;
    title: string;
    description: string;
    experienceLevel: string | null;
}

export async function listOpenJobsWithOutdatedMatchingProfile(sql: Sql, args: ListOpenJobsWithOutdatedMatchingProfileArgs): Promise<ListOpenJobsWithOutdatedMatchingProfileRow[]> {
    return (await sql.unsafe(listOpenJobsWithOutdatedMatchingProfileQuery, [args.limit]).values()).map(row => ({
        id: row[0],
        title: row[1],
        description: row[2],
        experienceLevel: row[3]
    }));
}

export const listOpenJobsMissingMatchingProfileQuery = `-- name: ListOpenJobsMissingMatchingProfile :many
SELECT j.id, j.title, j.description, j.experience_level
FROM jobs j
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM job_matching_profiles p WHERE p.job_id = j.id
  )
ORDER BY j.created_at, j.id
LIMIT $1`;

export interface ListOpenJobsMissingMatchingProfileArgs {
    limit: string;
}

export interface ListOpenJobsMissingMatchingProfileRow {
    id: string;
    title: string;
    description: string;
    experienceLevel: string | null;
}

export async function listOpenJobsMissingMatchingProfile(sql: Sql, args: ListOpenJobsMissingMatchingProfileArgs): Promise<ListOpenJobsMissingMatchingProfileRow[]> {
    return (await sql.unsafe(listOpenJobsMissingMatchingProfileQuery, [args.limit]).values()).map(row => ({
        id: row[0],
        title: row[1],
        description: row[2],
        experienceLevel: row[3]
    }));
}

export const hasReadyOpenJobMatchingProfileQuery = `-- name: HasReadyOpenJobMatchingProfile :one
SELECT EXISTS (
  SELECT 1
  FROM jobs j
  JOIN job_matching_profiles p ON p.job_id = j.id
  WHERE j.status = 'open'
    AND j.archived_at IS NULL
    AND (j.expires_at IS NULL OR j.expires_at > now())
    AND p.extraction_status = 'ready'
    AND p.completed_source_hash = p.requested_source_hash
    AND p.source_version = 'job-profile-v4-markdown'
) AS ready`;

export interface HasReadyOpenJobMatchingProfileRow {
    ready: boolean;
}

export async function hasReadyOpenJobMatchingProfile(sql: Sql): Promise<HasReadyOpenJobMatchingProfileRow | null> {
    const rows = await sql.unsafe(hasReadyOpenJobMatchingProfileQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        ready: row[0]
    };
}

export const listDigestCandidatesQuery = `-- name: ListDigestCandidates :many
SELECT DISTINCT cp.user_id, u.email
FROM candidate_profiles cp
JOIN users u ON u.id = cp.user_id
JOIN candidate_job_matches m
  ON m.candidate_id = cp.user_id
 AND m.generation_id = cp.serving_match_generation
JOIN jobs j ON j.id = m.job_id
JOIN companies c ON c.id = j.company_id
JOIN users owner ON owner.id = c.owner_id
JOIN job_matching_profiles p ON p.job_id = j.id
WHERE cp.match_alerts_enabled
  AND cp.match_alerts_enabled_at IS NOT NULL
  AND cp.resume_key IS NOT NULL
  AND u.deleted_at IS NULL
  AND m.band = 'strong'
  AND m.first_strong_at >= cp.match_alerts_enabled_at
  AND m.viewed_at IS NULL
  AND m.dismissed_at IS NULL
  AND m.digest_notified_at IS NULL
  AND j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND owner.deleted_at IS NULL
  AND p.extraction_status = 'ready'
  AND p.completed_source_hash = p.requested_source_hash
  AND NOT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.job_id = j.id AND a.candidate_id = cp.user_id
  )
ORDER BY cp.user_id`;

export interface ListDigestCandidatesRow {
    userId: string;
    email: string;
}

export async function listDigestCandidates(sql: Sql): Promise<ListDigestCandidatesRow[]> {
    return (await sql.unsafe(listDigestCandidatesQuery, []).values()).map(row => ({
        userId: row[0],
        email: row[1]
    }));
}

export const createJobMatchDigestNotificationQuery = `-- name: CreateJobMatchDigestNotification :one
INSERT INTO notifications (user_id, type, payload, dedupe_key)
VALUES ($1, 'job_match_digest', $2, $3)
ON CONFLICT (user_id, type, dedupe_key) WHERE dedupe_key IS NOT NULL
DO NOTHING
RETURNING id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at, dedupe_key`;

export interface CreateJobMatchDigestNotificationArgs {
    userId: string;
    payload: any;
    dedupeKey: string | null;
}

export interface CreateJobMatchDigestNotificationRow {
    id: string;
    userId: string;
    type: string;
    payload: any;
    readAt: Date | null;
    emailDeliveryStatus: string | null;
    emailDeliveryError: string | null;
    emailDeliveryAttemptedAt: Date | null;
    emailDeliverySentAt: Date | null;
    emailProviderMessageId: string | null;
    createdAt: Date;
    dedupeKey: string | null;
}

export async function createJobMatchDigestNotification(sql: Sql, args: CreateJobMatchDigestNotificationArgs): Promise<CreateJobMatchDigestNotificationRow | null> {
    const rows = await sql.unsafe(createJobMatchDigestNotificationQuery, [args.userId, args.payload, args.dedupeKey]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        type: row[2],
        payload: row[3],
        readAt: row[4],
        emailDeliveryStatus: row[5],
        emailDeliveryError: row[6],
        emailDeliveryAttemptedAt: row[7],
        emailDeliverySentAt: row[8],
        emailProviderMessageId: row[9],
        createdAt: row[10],
        dedupeKey: row[11]
    };
}

export const getJobMatchDigestNotificationQuery = `-- name: GetJobMatchDigestNotification :one
SELECT id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at, dedupe_key
FROM notifications
WHERE user_id = $1
  AND type = 'job_match_digest'
  AND dedupe_key = $2`;

export interface GetJobMatchDigestNotificationArgs {
    userId: string;
    dedupeKey: string | null;
}

export interface GetJobMatchDigestNotificationRow {
    id: string;
    userId: string;
    type: string;
    payload: any;
    readAt: Date | null;
    emailDeliveryStatus: string | null;
    emailDeliveryError: string | null;
    emailDeliveryAttemptedAt: Date | null;
    emailDeliverySentAt: Date | null;
    emailProviderMessageId: string | null;
    createdAt: Date;
    dedupeKey: string | null;
}

export async function getJobMatchDigestNotification(sql: Sql, args: GetJobMatchDigestNotificationArgs): Promise<GetJobMatchDigestNotificationRow | null> {
    const rows = await sql.unsafe(getJobMatchDigestNotificationQuery, [args.userId, args.dedupeKey]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        type: row[2],
        payload: row[3],
        readAt: row[4],
        emailDeliveryStatus: row[5],
        emailDeliveryError: row[6],
        emailDeliveryAttemptedAt: row[7],
        emailDeliverySentAt: row[8],
        emailProviderMessageId: row[9],
        createdAt: row[10],
        dedupeKey: row[11]
    };
}

export const lockCandidateDigestMatchesQuery = `-- name: LockCandidateDigestMatches :many
SELECT m.job_id, m.score, m.first_strong_at, j.title, c.name AS company_name
FROM candidate_profiles cp
JOIN candidate_job_matches m
  ON m.candidate_id = cp.user_id
 AND m.generation_id = cp.serving_match_generation
JOIN jobs j ON j.id = m.job_id
JOIN companies c ON c.id = j.company_id
JOIN users owner ON owner.id = c.owner_id
JOIN job_matching_profiles p ON p.job_id = j.id
WHERE cp.user_id = $1
  AND cp.match_alerts_enabled
  AND cp.match_alerts_enabled_at IS NOT NULL
  AND cp.resume_key IS NOT NULL
  AND m.band = 'strong'
  AND m.first_strong_at >= cp.match_alerts_enabled_at
  AND m.viewed_at IS NULL
  AND m.dismissed_at IS NULL
  AND m.digest_notified_at IS NULL
  AND j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND owner.deleted_at IS NULL
  AND p.extraction_status = 'ready'
  AND p.completed_source_hash = p.requested_source_hash
  AND NOT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.job_id = j.id AND a.candidate_id = cp.user_id
  )
ORDER BY m.score DESC, m.first_strong_at DESC, m.job_id
LIMIT $2
FOR UPDATE OF m SKIP LOCKED`;

export interface LockCandidateDigestMatchesArgs {
    candidateId: string;
    matchLimit: string;
}

export interface LockCandidateDigestMatchesRow {
    jobId: string;
    score: number;
    firstStrongAt: Date | null;
    title: string;
    companyName: string;
}

export async function lockCandidateDigestMatches(sql: Sql, args: LockCandidateDigestMatchesArgs): Promise<LockCandidateDigestMatchesRow[]> {
    return (await sql.unsafe(lockCandidateDigestMatchesQuery, [args.candidateId, args.matchLimit]).values()).map(row => ({
        jobId: row[0],
        score: row[1],
        firstStrongAt: row[2],
        title: row[3],
        companyName: row[4]
    }));
}

export const markCandidateDigestMatchesNotifiedQuery = `-- name: MarkCandidateDigestMatchesNotified :exec
UPDATE candidate_job_matches
SET digest_notified_at = now(), updated_at = now()
WHERE candidate_id = $1
  AND job_id = ANY(string_to_array($2, ',')::uuid[])
  AND digest_notified_at IS NULL`;

export interface MarkCandidateDigestMatchesNotifiedArgs {
    candidateId: string;
    jobIdsCsv: string;
}

export async function markCandidateDigestMatchesNotified(sql: Sql, args: MarkCandidateDigestMatchesNotifiedArgs): Promise<void> {
    await sql.unsafe(markCandidateDigestMatchesNotifiedQuery, [args.candidateId, args.jobIdsCsv]);
}

