import { Sql } from "postgres";

export const createCandidateProfileQuery = `-- name: createCandidateProfile :one
INSERT INTO candidate_profiles (user_id, headline, resume_key, onboarding_completed_at, resume_updated_at)
VALUES ($1, $2, $3, now(), CASE WHEN $3::text IS NOT NULL THEN now() ELSE NULL END)
RETURNING id, user_id, onboarding_completed_at, headline, resume_key, resume_updated_at, skills, links, created_at, updated_at`;

export interface createCandidateProfileArgs {
    userId: string;
    headline: string | null;
    resumeKey: string | null;
}

export interface createCandidateProfileRow {
    id: string;
    userId: string;
    onboardingCompletedAt: Date | null;
    headline: string | null;
    resumeKey: string | null;
    resumeUpdatedAt: Date | null;
    skills: any | null;
    links: any | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function createCandidateProfile(sql: Sql, args: createCandidateProfileArgs): Promise<createCandidateProfileRow | null> {
    const rows = await sql.unsafe(createCandidateProfileQuery, [args.userId, args.headline, args.resumeKey]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        onboardingCompletedAt: row[2],
        headline: row[3],
        resumeKey: row[4],
        resumeUpdatedAt: row[5],
        skills: row[6],
        links: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

export const getCandidateProfileByUserIdQuery = `-- name: getCandidateProfileByUserId :one
SELECT id, user_id, onboarding_completed_at, headline, resume_key, resume_updated_at, skills, links, created_at, updated_at
FROM candidate_profiles
WHERE user_id = $1`;

export interface getCandidateProfileByUserIdArgs {
    userId: string;
}

export interface getCandidateProfileByUserIdRow {
    id: string;
    userId: string;
    onboardingCompletedAt: Date | null;
    headline: string | null;
    resumeKey: string | null;
    resumeUpdatedAt: Date | null;
    skills: any | null;
    links: any | null;
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
        headline: row[3],
        resumeKey: row[4],
        resumeUpdatedAt: row[5],
        skills: row[6],
        links: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

export const updateCandidateProfileQuery = `-- name: updateCandidateProfile :one
UPDATE candidate_profiles
SET headline = $1,
    resume_key = $2,
    skills = $3,
    links = $4,
    resume_updated_at = CASE WHEN $2 IS DISTINCT FROM resume_key THEN now() ELSE resume_updated_at END,
    updated_at = now()
WHERE user_id = $5
RETURNING id, user_id, onboarding_completed_at, headline, resume_key, resume_updated_at, skills, links, created_at, updated_at`;

export interface updateCandidateProfileArgs {
    headline: string | null;
    resumeKey: string | null;
    skills: any | null;
    links: any | null;
    userId: string;
}

export interface updateCandidateProfileRow {
    id: string;
    userId: string;
    onboardingCompletedAt: Date | null;
    headline: string | null;
    resumeKey: string | null;
    resumeUpdatedAt: Date | null;
    skills: any | null;
    links: any | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateCandidateProfile(sql: Sql, args: updateCandidateProfileArgs): Promise<updateCandidateProfileRow | null> {
    const rows = await sql.unsafe(updateCandidateProfileQuery, [args.headline, args.resumeKey, args.skills, args.links, args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        onboardingCompletedAt: row[2],
        headline: row[3],
        resumeKey: row[4],
        resumeUpdatedAt: row[5],
        skills: row[6],
        links: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

