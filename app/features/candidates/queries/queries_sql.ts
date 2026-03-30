import { Sql } from "postgres";

export const createCandidateProfileQuery = `-- name: createCandidateProfile :one
INSERT INTO candidate_profiles (user_id, headline, resume_url)
VALUES ($1, $2, $3)
RETURNING id, user_id, headline, resume_url, bio, skills, work_history, links, created_at, updated_at`;

export interface createCandidateProfileArgs {
    userId: string;
    headline: string | null;
    resumeUrl: string | null;
}

export interface createCandidateProfileRow {
    id: string;
    userId: string;
    headline: string | null;
    resumeUrl: string | null;
    bio: string | null;
    skills: any;
    workHistory: any;
    links: any;
    createdAt: Date;
    updatedAt: Date;
}

export async function createCandidateProfile(sql: Sql, args: createCandidateProfileArgs): Promise<createCandidateProfileRow | null> {
    const rows = await sql.unsafe(createCandidateProfileQuery, [args.userId, args.headline, args.resumeUrl]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        headline: row[2],
        resumeUrl: row[3],
        bio: row[4],
        skills: row[5],
        workHistory: row[6],
        links: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

export const getCandidateProfileByUserIdQuery = `-- name: getCandidateProfileByUserId :one
SELECT id, user_id, headline, resume_url, bio, skills, work_history, links, created_at, updated_at
FROM candidate_profiles
WHERE user_id = $1`;

export interface getCandidateProfileByUserIdArgs {
    userId: string;
}

export interface getCandidateProfileByUserIdRow {
    id: string;
    userId: string;
    headline: string | null;
    resumeUrl: string | null;
    bio: string | null;
    skills: any;
    workHistory: any;
    links: any;
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
        headline: row[2],
        resumeUrl: row[3],
        bio: row[4],
        skills: row[5],
        workHistory: row[6],
        links: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

export const updateCandidateProfileQuery = `-- name: updateCandidateProfile :one
UPDATE candidate_profiles
SET headline = $1,
    resume_url = $2,
    bio = $3,
    skills = $4,
    work_history = $5,
    links = $6,
    updated_at = now()
WHERE user_id = $7
RETURNING id, user_id, headline, resume_url, bio, skills, work_history, links, created_at, updated_at`;

export interface updateCandidateProfileArgs {
    headline: string | null;
    resumeUrl: string | null;
    bio: string | null;
    skills: any;
    workHistory: any;
    links: any;
    userId: string;
}

export interface updateCandidateProfileRow {
    id: string;
    userId: string;
    headline: string | null;
    resumeUrl: string | null;
    bio: string | null;
    skills: any;
    workHistory: any;
    links: any;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateCandidateProfile(sql: Sql, args: updateCandidateProfileArgs): Promise<updateCandidateProfileRow | null> {
    const rows = await sql.unsafe(updateCandidateProfileQuery, [args.headline, args.resumeUrl, args.bio, args.skills, args.workHistory, args.links, args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        headline: row[2],
        resumeUrl: row[3],
        bio: row[4],
        skills: row[5],
        workHistory: row[6],
        links: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

