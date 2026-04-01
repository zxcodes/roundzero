import { Sql } from "postgres";

export const createCandidateProfileQuery = `-- name: createCandidateProfile :one
INSERT INTO candidate_profiles (user_id, headline, resume_key, onboarding_completed_at, resume_updated_at)
VALUES ($1, $2, $3, now(), CASE WHEN $3::text IS NOT NULL THEN now() ELSE NULL END)
RETURNING id, user_id, onboarding_completed_at, headline, resume_key, resume_updated_at, bio, skills, links, created_at, updated_at`;

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
    bio: string | null;
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
        bio: row[6],
        skills: row[7],
        links: row[8],
        createdAt: row[9],
        updatedAt: row[10]
    };
}

export const getCandidateProfileByUserIdQuery = `-- name: getCandidateProfileByUserId :one
SELECT id, user_id, onboarding_completed_at, headline, resume_key, resume_updated_at, bio, skills, links, created_at, updated_at
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
    bio: string | null;
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
        bio: row[6],
        skills: row[7],
        links: row[8],
        createdAt: row[9],
        updatedAt: row[10]
    };
}

export const getCandidateWorkHistoryByProfileIdQuery = `-- name: getCandidateWorkHistoryByProfileId :many
SELECT id, candidate_profile_id, company, title, start_month, end_month, currently_working_here, description, sort_order, created_at, updated_at
FROM candidate_work_history
WHERE candidate_profile_id = $1
ORDER BY sort_order ASC, created_at ASC`;

export interface getCandidateWorkHistoryByProfileIdArgs {
    candidateProfileId: string;
}

export interface getCandidateWorkHistoryByProfileIdRow {
    id: string;
    candidateProfileId: string;
    company: string;
    title: string;
    startMonth: string;
    endMonth: string | null;
    currentlyWorkingHere: boolean;
    description: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export async function getCandidateWorkHistoryByProfileId(sql: Sql, args: getCandidateWorkHistoryByProfileIdArgs): Promise<getCandidateWorkHistoryByProfileIdRow[]> {
    return (await sql.unsafe(getCandidateWorkHistoryByProfileIdQuery, [args.candidateProfileId]).values()).map(row => ({
        id: row[0],
        candidateProfileId: row[1],
        company: row[2],
        title: row[3],
        startMonth: row[4],
        endMonth: row[5],
        currentlyWorkingHere: row[6],
        description: row[7],
        sortOrder: row[8],
        createdAt: row[9],
        updatedAt: row[10]
    }));
}

export const createCandidateWorkHistoryEntryQuery = `-- name: createCandidateWorkHistoryEntry :one
INSERT INTO candidate_work_history (
  candidate_profile_id,
  company,
  title,
  start_month,
  end_month,
  currently_working_here,
  description,
  sort_order
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, candidate_profile_id, company, title, start_month, end_month, currently_working_here, description, sort_order, created_at, updated_at`;

export interface createCandidateWorkHistoryEntryArgs {
    candidateProfileId: string;
    company: string;
    title: string;
    startMonth: string;
    endMonth: string | null;
    currentlyWorkingHere: boolean;
    description: string | null;
    sortOrder: number;
}

export interface createCandidateWorkHistoryEntryRow {
    id: string;
    candidateProfileId: string;
    company: string;
    title: string;
    startMonth: string;
    endMonth: string | null;
    currentlyWorkingHere: boolean;
    description: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export async function createCandidateWorkHistoryEntry(sql: Sql, args: createCandidateWorkHistoryEntryArgs): Promise<createCandidateWorkHistoryEntryRow | null> {
    const rows = await sql.unsafe(createCandidateWorkHistoryEntryQuery, [args.candidateProfileId, args.company, args.title, args.startMonth, args.endMonth, args.currentlyWorkingHere, args.description, args.sortOrder]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        candidateProfileId: row[1],
        company: row[2],
        title: row[3],
        startMonth: row[4],
        endMonth: row[5],
        currentlyWorkingHere: row[6],
        description: row[7],
        sortOrder: row[8],
        createdAt: row[9],
        updatedAt: row[10]
    };
}

export const deleteCandidateWorkHistoryByProfileIdQuery = `-- name: deleteCandidateWorkHistoryByProfileId :exec
DELETE FROM candidate_work_history
WHERE candidate_profile_id = $1`;

export interface deleteCandidateWorkHistoryByProfileIdArgs {
    candidateProfileId: string;
}

export async function deleteCandidateWorkHistoryByProfileId(sql: Sql, args: deleteCandidateWorkHistoryByProfileIdArgs): Promise<void> {
    await sql.unsafe(deleteCandidateWorkHistoryByProfileIdQuery, [args.candidateProfileId]);
}

export const updateCandidateProfileQuery = `-- name: updateCandidateProfile :one
UPDATE candidate_profiles
SET headline = $1,
    resume_key = $2,
    bio = $3,
    skills = $4,
    links = $5,
    resume_updated_at = CASE WHEN $2 IS DISTINCT FROM resume_key THEN now() ELSE resume_updated_at END,
    updated_at = now()
WHERE user_id = $6
RETURNING id, user_id, onboarding_completed_at, headline, resume_key, resume_updated_at, bio, skills, links, created_at, updated_at`;

export interface updateCandidateProfileArgs {
    headline: string | null;
    resumeKey: string | null;
    bio: string | null;
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
    bio: string | null;
    skills: any | null;
    links: any | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateCandidateProfile(sql: Sql, args: updateCandidateProfileArgs): Promise<updateCandidateProfileRow | null> {
    const rows = await sql.unsafe(updateCandidateProfileQuery, [args.headline, args.resumeKey, args.bio, args.skills, args.links, args.userId]).values();
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
        bio: row[6],
        skills: row[7],
        links: row[8],
        createdAt: row[9],
        updatedAt: row[10]
    };
}

