import { Sql } from "postgres";

export const createCandidateProfileQuery = `-- name: createCandidateProfile :one
INSERT INTO candidate_profiles (user_id, resume_key, onboarding_completed_at, resume_updated_at)
VALUES ($1, $2, now(), CASE WHEN $2::text IS NOT NULL THEN now() ELSE NULL END)
RETURNING id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at`;

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
        updatedAt: row[6]
    };
}

export const getCandidateProfileByUserIdQuery = `-- name: getCandidateProfileByUserId :one
SELECT id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at
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
        updatedAt: row[6]
    };
}

export const updateCandidateProfileQuery = `-- name: updateCandidateProfile :one
UPDATE candidate_profiles
SET resume_key = $1,
    resume_updated_at = CASE WHEN $1 IS DISTINCT FROM resume_key THEN now() ELSE resume_updated_at END,
    updated_at = now()
WHERE user_id = $2
RETURNING id, user_id, onboarding_completed_at, resume_key, resume_updated_at, created_at, updated_at`;

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
        updatedAt: row[6]
    };
}

