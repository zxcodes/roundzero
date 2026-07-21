import { Sql } from "postgres";

export const createCandidateProfileQuery = `-- name: createCandidateProfile :one
INSERT INTO candidate_profiles (user_id, resume_key, onboarding_completed_at, resume_updated_at)
VALUES ($1, $2, now(), CASE WHEN $2::text IS NOT NULL THEN now() ELSE NULL END)
RETURNING id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at, matching_profile, matching_profile_source_hash, matching_profile_version, matching_profile_status, matching_profile_error, serving_match_generation, serving_match_input_hash, match_feed_status, match_feed_error, match_feed_refreshed_at, match_alerts_enabled, match_alerts_enabled_at, match_refresh_token, match_refresh_claimed_at`;

export interface createCandidateProfileArgs {
    userId: string;
    resumeKey: string | null;
}

export interface createCandidateProfileRow {
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
}

export async function createCandidateProfile(sql: Sql, args: createCandidateProfileArgs): Promise<createCandidateProfileRow | null> {
    const rows = await sql.unsafe(createCandidateProfileQuery, [args.userId, args.resumeKey]).values();
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
        matchRefreshClaimedAt: row[20]
    };
}

export const getCandidateProfileByUserIdQuery = `-- name: getCandidateProfileByUserId :one
SELECT id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at, matching_profile, matching_profile_source_hash, matching_profile_version, matching_profile_status, matching_profile_error, serving_match_generation, serving_match_input_hash, match_feed_status, match_feed_error, match_feed_refreshed_at, match_alerts_enabled, match_alerts_enabled_at, match_refresh_token, match_refresh_claimed_at
FROM candidate_profiles
WHERE user_id = $1`;

export interface getCandidateProfileByUserIdArgs {
    userId: string;
}

export interface getCandidateProfileByUserIdRow {
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
}

export async function getCandidateProfileByUserId(sql: Sql, args: getCandidateProfileByUserIdArgs): Promise<getCandidateProfileByUserIdRow | null> {
    const rows = await sql.unsafe(getCandidateProfileByUserIdQuery, [args.userId]).values();
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
        matchRefreshClaimedAt: row[20]
    };
}

export const updateCandidateProfileQuery = `-- name: updateCandidateProfile :one
UPDATE candidate_profiles
SET resume_key = $1,
    resume_updated_at = CASE
      WHEN $1 IS DISTINCT FROM resume_key THEN CASE WHEN $1::text IS NOT NULL THEN now() ELSE NULL END
      ELSE resume_updated_at
    END,
    matching_profile = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE matching_profile END,
    matching_profile_source_hash = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE matching_profile_source_hash END,
    matching_profile_version = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE matching_profile_version END,
    matching_profile_status = CASE WHEN $1 IS DISTINCT FROM resume_key THEN 'pending' ELSE matching_profile_status END,
    matching_profile_error = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE matching_profile_error END,
    serving_match_generation = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE serving_match_generation END,
    serving_match_input_hash = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE serving_match_input_hash END,
    match_feed_status = CASE WHEN $1 IS DISTINCT FROM resume_key THEN 'pending' ELSE match_feed_status END,
    match_feed_error = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE match_feed_error END,
    match_feed_refreshed_at = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE match_feed_refreshed_at END,
    match_alerts_enabled_at = CASE
      WHEN $1 IS DISTINCT FROM resume_key THEN
        CASE WHEN $1::text IS NOT NULL AND match_alerts_enabled THEN now() ELSE NULL END
      ELSE match_alerts_enabled_at
    END,
    match_refresh_token = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE match_refresh_token END,
    match_refresh_claimed_at = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE match_refresh_claimed_at END,
    updated_at = now()
WHERE user_id = $2
RETURNING id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at, matching_profile, matching_profile_source_hash, matching_profile_version, matching_profile_status, matching_profile_error, serving_match_generation, serving_match_input_hash, match_feed_status, match_feed_error, match_feed_refreshed_at, match_alerts_enabled, match_alerts_enabled_at, match_refresh_token, match_refresh_claimed_at`;

export interface updateCandidateProfileArgs {
    resumeKey: string | null;
    userId: string;
}

export interface updateCandidateProfileRow {
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
}

export async function updateCandidateProfile(sql: Sql, args: updateCandidateProfileArgs): Promise<updateCandidateProfileRow | null> {
    const rows = await sql.unsafe(updateCandidateProfileQuery, [args.resumeKey, args.userId]).values();
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
        matchRefreshClaimedAt: row[20]
    };
}

export const deleteCandidateJobMatchesQuery = `-- name: deleteCandidateJobMatches :exec
DELETE FROM candidate_job_matches
WHERE candidate_id = $1`;

export interface deleteCandidateJobMatchesArgs {
    candidateId: string;
}

export async function deleteCandidateJobMatches(sql: Sql, args: deleteCandidateJobMatchesArgs): Promise<void> {
    await sql.unsafe(deleteCandidateJobMatchesQuery, [args.candidateId]);
}

