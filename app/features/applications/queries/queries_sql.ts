import { Sql } from "postgres";

export const createApplicationQuery = `-- name: createApplication :one
INSERT INTO applications (job_id, candidate_id, resume_url, links)
VALUES ($1, $2, $3, $4)
RETURNING id, job_id, candidate_id, resume_url, links, status, created_at, updated_at`;

export interface createApplicationArgs {
    jobId: string;
    candidateId: string;
    resumeUrl: string | null;
    links: any;
}

export interface createApplicationRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeUrl: string | null;
    links: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export async function createApplication(sql: Sql, args: createApplicationArgs): Promise<createApplicationRow | null> {
    const rows = await sql.unsafe(createApplicationQuery, [args.jobId, args.candidateId, args.resumeUrl, args.links]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        candidateId: row[2],
        resumeUrl: row[3],
        links: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    };
}

export const getApplicationByJobAndCandidateQuery = `-- name: getApplicationByJobAndCandidate :one
SELECT id, job_id, candidate_id, resume_url, links, status, created_at, updated_at
FROM applications
WHERE job_id = $1 AND candidate_id = $2`;

export interface getApplicationByJobAndCandidateArgs {
    jobId: string;
    candidateId: string;
}

export interface getApplicationByJobAndCandidateRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeUrl: string | null;
    links: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export async function getApplicationByJobAndCandidate(sql: Sql, args: getApplicationByJobAndCandidateArgs): Promise<getApplicationByJobAndCandidateRow | null> {
    const rows = await sql.unsafe(getApplicationByJobAndCandidateQuery, [args.jobId, args.candidateId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        candidateId: row[2],
        resumeUrl: row[3],
        links: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    };
}

export const getApplicationsByCandidateQuery = `-- name: getApplicationsByCandidate :many
SELECT a.id, a.job_id, a.candidate_id, a.resume_url, a.links, a.status, a.created_at, a.updated_at,
       j.title AS job_title, j.status AS job_status,
       c.name AS company_name
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE a.candidate_id = $1
ORDER BY a.created_at DESC`;

export interface getApplicationsByCandidateArgs {
    candidateId: string;
}

export interface getApplicationsByCandidateRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeUrl: string | null;
    links: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    jobTitle: string;
    jobStatus: string;
    companyName: string;
}

export async function getApplicationsByCandidate(sql: Sql, args: getApplicationsByCandidateArgs): Promise<getApplicationsByCandidateRow[]> {
    return (await sql.unsafe(getApplicationsByCandidateQuery, [args.candidateId]).values()).map(row => ({
        id: row[0],
        jobId: row[1],
        candidateId: row[2],
        resumeUrl: row[3],
        links: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7],
        jobTitle: row[8],
        jobStatus: row[9],
        companyName: row[10]
    }));
}

export const getApplicationsByJobQuery = `-- name: getApplicationsByJob :many
SELECT a.id, a.job_id, a.candidate_id, a.resume_url, a.links, a.status, a.created_at, a.updated_at,
       u.name AS candidate_name, u.email AS candidate_email, u.picture AS candidate_picture
FROM applications a
JOIN users u ON u.id = a.candidate_id
WHERE a.job_id = $1
ORDER BY a.created_at DESC`;

export interface getApplicationsByJobArgs {
    jobId: string;
}

export interface getApplicationsByJobRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeUrl: string | null;
    links: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    candidateName: string;
    candidateEmail: string;
    candidatePicture: string | null;
}

export async function getApplicationsByJob(sql: Sql, args: getApplicationsByJobArgs): Promise<getApplicationsByJobRow[]> {
    return (await sql.unsafe(getApplicationsByJobQuery, [args.jobId]).values()).map(row => ({
        id: row[0],
        jobId: row[1],
        candidateId: row[2],
        resumeUrl: row[3],
        links: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7],
        candidateName: row[8],
        candidateEmail: row[9],
        candidatePicture: row[10]
    }));
}

export const getApplicationByIdQuery = `-- name: getApplicationById :one
SELECT a.id, a.job_id, a.candidate_id, a.resume_url, a.links, a.status, a.created_at, a.updated_at,
       j.title AS job_title, j.status AS job_status,
       c.name AS company_name
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE a.id = $1`;

export interface getApplicationByIdArgs {
    id: string;
}

export interface getApplicationByIdRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeUrl: string | null;
    links: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    jobTitle: string;
    jobStatus: string;
    companyName: string;
}

export async function getApplicationById(sql: Sql, args: getApplicationByIdArgs): Promise<getApplicationByIdRow | null> {
    const rows = await sql.unsafe(getApplicationByIdQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        candidateId: row[2],
        resumeUrl: row[3],
        links: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7],
        jobTitle: row[8],
        jobStatus: row[9],
        companyName: row[10]
    };
}

export const updateApplicationStatusQuery = `-- name: updateApplicationStatus :one
UPDATE applications
SET status = $1,
    updated_at = now()
WHERE id = $2
RETURNING id, job_id, candidate_id, resume_url, links, status, created_at, updated_at`;

export interface updateApplicationStatusArgs {
    status: string;
    id: string;
}

export interface updateApplicationStatusRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeUrl: string | null;
    links: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateApplicationStatus(sql: Sql, args: updateApplicationStatusArgs): Promise<updateApplicationStatusRow | null> {
    const rows = await sql.unsafe(updateApplicationStatusQuery, [args.status, args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        candidateId: row[2],
        resumeUrl: row[3],
        links: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    };
}

export const getApplicationCountByJobQuery = `-- name: getApplicationCountByJob :one
SELECT count(*)::int AS count
FROM applications
WHERE job_id = $1`;

export interface getApplicationCountByJobArgs {
    jobId: string;
}

export interface getApplicationCountByJobRow {
    count: number;
}

export async function getApplicationCountByJob(sql: Sql, args: getApplicationCountByJobArgs): Promise<getApplicationCountByJobRow | null> {
    const rows = await sql.unsafe(getApplicationCountByJobQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        count: row[0]
    };
}

export const countApplicationsByCompanyQuery = `-- name: countApplicationsByCompany :one
SELECT count(*)::int AS total_count
FROM applications a
JOIN jobs j ON j.id = a.job_id
WHERE j.company_id = $1`;

export interface countApplicationsByCompanyArgs {
    companyId: string;
}

export interface countApplicationsByCompanyRow {
    totalCount: number;
}

export async function countApplicationsByCompany(sql: Sql, args: countApplicationsByCompanyArgs): Promise<countApplicationsByCompanyRow | null> {
    const rows = await sql.unsafe(countApplicationsByCompanyQuery, [args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        totalCount: row[0]
    };
}

export const countApplicationsByCandidateQuery = `-- name: countApplicationsByCandidate :one
SELECT
  count(*)::int AS total_count,
  count(*) FILTER (WHERE a.status != 'rejected')::int AS active_count,
  count(*) FILTER (WHERE a.status = 'interviewing')::int AS interviewing_count,
  count(*) FILTER (WHERE a.status = 'evaluated')::int AS evaluated_count
FROM applications a
WHERE a.candidate_id = $1`;

export interface countApplicationsByCandidateArgs {
    candidateId: string;
}

export interface countApplicationsByCandidateRow {
    totalCount: number;
    activeCount: number;
    interviewingCount: number;
    evaluatedCount: number;
}

export async function countApplicationsByCandidate(sql: Sql, args: countApplicationsByCandidateArgs): Promise<countApplicationsByCandidateRow | null> {
    const rows = await sql.unsafe(countApplicationsByCandidateQuery, [args.candidateId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        totalCount: row[0],
        activeCount: row[1],
        interviewingCount: row[2],
        evaluatedCount: row[3]
    };
}

