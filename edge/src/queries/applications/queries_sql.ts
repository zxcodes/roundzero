import { Sql } from "postgres";

export const createApplicationQuery = `-- name: createApplication :one
INSERT INTO applications (job_id, candidate_id, resume_key, metadata, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, job_id, candidate_id, resume_key, metadata, status, created_at, updated_at`;

export interface createApplicationArgs {
    jobId: string;
    candidateId: string;
    resumeKey: string | null;
    metadata: any;
    status: string;
}

export interface createApplicationRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeKey: string | null;
    metadata: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export async function createApplication(sql: Sql, args: createApplicationArgs): Promise<createApplicationRow | null> {
    const rows = await sql.unsafe(createApplicationQuery, [args.jobId, args.candidateId, args.resumeKey, args.metadata, args.status]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        candidateId: row[2],
        resumeKey: row[3],
        metadata: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    };
}

export const getApplicationByJobAndCandidateQuery = `-- name: getApplicationByJobAndCandidate :one
SELECT id, job_id, candidate_id, resume_key, metadata, status, created_at, updated_at
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
    resumeKey: string | null;
    metadata: any;
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
        resumeKey: row[3],
        metadata: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    };
}

export const getApplicationsByCandidateQuery = `-- name: getApplicationsByCandidate :many
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       j.title AS job_title, j.status AS job_status,
       c.name AS company_name,
       u.deleted_at IS NOT NULL AS company_owner_deleted
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id
WHERE a.candidate_id = $1
  AND j.archived_at IS NULL
ORDER BY a.created_at DESC`;

export interface getApplicationsByCandidateArgs {
    candidateId: string;
}

export interface getApplicationsByCandidateRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeKey: string | null;
    metadata: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    jobTitle: string;
    jobStatus: string;
    companyName: string;
    companyOwnerDeleted: string | null;
}

export async function getApplicationsByCandidate(sql: Sql, args: getApplicationsByCandidateArgs): Promise<getApplicationsByCandidateRow[]> {
    return (await sql.unsafe(getApplicationsByCandidateQuery, [args.candidateId]).values()).map(row => ({
        id: row[0],
        jobId: row[1],
        candidateId: row[2],
        resumeKey: row[3],
        metadata: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7],
        jobTitle: row[8],
        jobStatus: row[9],
        companyName: row[10],
        companyOwnerDeleted: row[11]
    }));
}

export const getApplicationsByJobQuery = `-- name: getApplicationsByJob :many
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       u.name AS candidate_name, u.email AS candidate_email, u.picture AS candidate_picture,
       r.id AS report_id, r.recommendation AS report_recommendation, r.scores AS report_scores
FROM applications a
JOIN users u ON u.id = a.candidate_id AND u.deleted_at IS NULL
LEFT JOIN reports r ON r.application_id = a.id
WHERE a.job_id = $1
ORDER BY (r.id IS NOT NULL) DESC, COALESCE((r.scores->>'overall')::numeric, 0) DESC, a.created_at DESC`;

export interface getApplicationsByJobArgs {
    jobId: string;
}

export interface getApplicationsByJobRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeKey: string | null;
    metadata: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    candidateName: string;
    candidateEmail: string;
    candidatePicture: string | null;
    reportId: string | null;
    reportRecommendation: string | null;
    reportScores: any | null;
}

export async function getApplicationsByJob(sql: Sql, args: getApplicationsByJobArgs): Promise<getApplicationsByJobRow[]> {
    return (await sql.unsafe(getApplicationsByJobQuery, [args.jobId]).values()).map(row => ({
        id: row[0],
        jobId: row[1],
        candidateId: row[2],
        resumeKey: row[3],
        metadata: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7],
        candidateName: row[8],
        candidateEmail: row[9],
        candidatePicture: row[10],
        reportId: row[11],
        reportRecommendation: row[12],
        reportScores: row[13]
    }));
}

export const getApplicationByIdQuery = `-- name: getApplicationById :one
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       j.title AS job_title, j.status AS job_status,
       c.name AS company_name,
       u.deleted_at IS NOT NULL AS company_owner_deleted
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id
WHERE a.id = $1`;

export interface getApplicationByIdArgs {
    id: string;
}

export interface getApplicationByIdRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeKey: string | null;
    metadata: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    jobTitle: string;
    jobStatus: string;
    companyName: string;
    companyOwnerDeleted: string | null;
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
        resumeKey: row[3],
        metadata: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7],
        jobTitle: row[8],
        jobStatus: row[9],
        companyName: row[10],
        companyOwnerDeleted: row[11]
    };
}

export const getApplicationReviewByIdQuery = `-- name: getApplicationReviewById :one
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       j.title AS job_title, j.status AS job_status, j.company_id,
       c.name AS company_name, c.slug AS company_slug,
       u.name AS candidate_name, u.email AS candidate_email, u.picture AS candidate_picture
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = a.candidate_id AND u.deleted_at IS NULL
WHERE a.id = $1`;

export interface getApplicationReviewByIdArgs {
    id: string;
}

export interface getApplicationReviewByIdRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeKey: string | null;
    metadata: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    jobTitle: string;
    jobStatus: string;
    companyId: string;
    companyName: string;
    companySlug: string;
    candidateName: string;
    candidateEmail: string;
    candidatePicture: string | null;
}

export async function getApplicationReviewById(sql: Sql, args: getApplicationReviewByIdArgs): Promise<getApplicationReviewByIdRow | null> {
    const rows = await sql.unsafe(getApplicationReviewByIdQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        candidateId: row[2],
        resumeKey: row[3],
        metadata: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7],
        jobTitle: row[8],
        jobStatus: row[9],
        companyId: row[10],
        companyName: row[11],
        companySlug: row[12],
        candidateName: row[13],
        candidateEmail: row[14],
        candidatePicture: row[15]
    };
}

export const updateApplicationStatusQuery = `-- name: updateApplicationStatus :one
UPDATE applications
SET status = $1,
    updated_at = now()
WHERE id = $2
RETURNING id, job_id, candidate_id, resume_key, metadata, status, created_at, updated_at`;

export interface updateApplicationStatusArgs {
    status: string;
    id: string;
}

export interface updateApplicationStatusRow {
    id: string;
    jobId: string;
    candidateId: string;
    resumeKey: string | null;
    metadata: any;
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
        resumeKey: row[3],
        metadata: row[4],
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
WHERE j.company_id = $1
  AND j.archived_at IS NULL`;

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
  count(*) FILTER (WHERE a.status NOT IN ('rejected', 'withdrawn'))::int AS active_count,
  count(*) FILTER (WHERE a.status = 'interview_invited')::int AS interview_invited_count,
  count(*) FILTER (WHERE a.status = 'interview_in_progress')::int AS interview_in_progress_count,
  count(*) FILTER (WHERE a.status = 'evaluated')::int AS evaluated_count
FROM applications a
JOIN jobs j ON j.id = a.job_id
WHERE a.candidate_id = $1
  AND j.archived_at IS NULL`;

export interface countApplicationsByCandidateArgs {
    candidateId: string;
}

export interface countApplicationsByCandidateRow {
    totalCount: number;
    activeCount: number;
    interviewInvitedCount: number;
    interviewInProgressCount: number;
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
        interviewInvitedCount: row[2],
        interviewInProgressCount: row[3],
        evaluatedCount: row[4]
    };
}

