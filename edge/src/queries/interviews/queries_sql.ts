import { Sql } from "postgres";

export const createInterviewQuery = `-- name: createInterview :one
INSERT INTO interviews (application_id, agent_id, type, metadata, status, started_at, completed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, application_id, agent_id, type, metadata, status, started_at, completed_at, created_at, updated_at`;

export interface createInterviewArgs {
    applicationId: string;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
}

export interface createInterviewRow {
    id: string;
    applicationId: string;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function createInterview(sql: Sql, args: createInterviewArgs): Promise<createInterviewRow | null> {
    const rows = await sql.unsafe(createInterviewQuery, [args.applicationId, args.agentId, args.type, args.metadata, args.status, args.startedAt, args.completedAt]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        agentId: row[2],
        type: row[3],
        metadata: row[4],
        status: row[5],
        startedAt: row[6],
        completedAt: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

export const getInterviewByApplicationIdQuery = `-- name: getInterviewByApplicationId :one
SELECT id, application_id, agent_id, type, metadata, status, started_at, completed_at, created_at, updated_at
FROM interviews
WHERE application_id = $1`;

export interface getInterviewByApplicationIdArgs {
    applicationId: string;
}

export interface getInterviewByApplicationIdRow {
    id: string;
    applicationId: string;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getInterviewByApplicationId(sql: Sql, args: getInterviewByApplicationIdArgs): Promise<getInterviewByApplicationIdRow | null> {
    const rows = await sql.unsafe(getInterviewByApplicationIdQuery, [args.applicationId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        agentId: row[2],
        type: row[3],
        metadata: row[4],
        status: row[5],
        startedAt: row[6],
        completedAt: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

export const getInterviewByIdQuery = `-- name: getInterviewById :one
SELECT id, application_id, agent_id, type, metadata, status, started_at, completed_at, created_at, updated_at
FROM interviews
WHERE id = $1`;

export interface getInterviewByIdArgs {
    id: string;
}

export interface getInterviewByIdRow {
    id: string;
    applicationId: string;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getInterviewById(sql: Sql, args: getInterviewByIdArgs): Promise<getInterviewByIdRow | null> {
    const rows = await sql.unsafe(getInterviewByIdQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        agentId: row[2],
        type: row[3],
        metadata: row[4],
        status: row[5],
        startedAt: row[6],
        completedAt: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

export const getInterviewForCandidateByIdQuery = `-- name: getInterviewForCandidateById :one
SELECT i.id, i.application_id, i.agent_id, i.type, i.metadata, i.status, i.started_at, i.completed_at,
       i.created_at, i.updated_at,
       a.candidate_id, a.status AS application_status,
       a.job_id, j.title AS job_title, c.name AS company_name
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE i.id = $1
  AND a.candidate_id = $2`;

export interface getInterviewForCandidateByIdArgs {
    id: string;
    candidateId: string;
}

export interface getInterviewForCandidateByIdRow {
    id: string;
    applicationId: string;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    candidateId: string;
    applicationStatus: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
}

export async function getInterviewForCandidateById(sql: Sql, args: getInterviewForCandidateByIdArgs): Promise<getInterviewForCandidateByIdRow | null> {
    const rows = await sql.unsafe(getInterviewForCandidateByIdQuery, [args.id, args.candidateId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        agentId: row[2],
        type: row[3],
        metadata: row[4],
        status: row[5],
        startedAt: row[6],
        completedAt: row[7],
        createdAt: row[8],
        updatedAt: row[9],
        candidateId: row[10],
        applicationStatus: row[11],
        jobId: row[12],
        jobTitle: row[13],
        companyName: row[14]
    };
}

export const updateInterviewStatusQuery = `-- name: updateInterviewStatus :one
UPDATE interviews
SET status = $1,
    updated_at = now()
WHERE id = $2
RETURNING id, application_id, agent_id, type, metadata, status, started_at, completed_at, created_at, updated_at`;

export interface updateInterviewStatusArgs {
    status: string;
    id: string;
}

export interface updateInterviewStatusRow {
    id: string;
    applicationId: string;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateInterviewStatus(sql: Sql, args: updateInterviewStatusArgs): Promise<updateInterviewStatusRow | null> {
    const rows = await sql.unsafe(updateInterviewStatusQuery, [args.status, args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        agentId: row[2],
        type: row[3],
        metadata: row[4],
        status: row[5],
        startedAt: row[6],
        completedAt: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

export const completeInterviewQuery = `-- name: completeInterview :one
UPDATE interviews
SET status = 'completed',
    completed_at = now(),
    updated_at = now()
WHERE id = $1
RETURNING id, application_id, agent_id, type, metadata, status, started_at, completed_at, created_at, updated_at`;

export interface completeInterviewArgs {
    id: string;
}

export interface completeInterviewRow {
    id: string;
    applicationId: string;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function completeInterview(sql: Sql, args: completeInterviewArgs): Promise<completeInterviewRow | null> {
    const rows = await sql.unsafe(completeInterviewQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        agentId: row[2],
        type: row[3],
        metadata: row[4],
        status: row[5],
        startedAt: row[6],
        completedAt: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

export const getInterviewContextByIdQuery = `-- name: getInterviewContextById :one
SELECT i.id, i.application_id, i.agent_id, i.type, i.metadata, i.status, i.started_at, i.completed_at,
       i.created_at, i.updated_at,
       a.candidate_id, a.status AS application_status,
       j.id AS job_id, j.title AS job_title,
       c.name AS company_name,
       c.owner_id AS company_owner_id,
       u.name AS candidate_name
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = a.candidate_id
WHERE i.id = $1`;

export interface getInterviewContextByIdArgs {
    id: string;
}

export interface getInterviewContextByIdRow {
    id: string;
    applicationId: string;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    candidateId: string;
    applicationStatus: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
    companyOwnerId: string;
    candidateName: string;
}

export async function getInterviewContextById(sql: Sql, args: getInterviewContextByIdArgs): Promise<getInterviewContextByIdRow | null> {
    const rows = await sql.unsafe(getInterviewContextByIdQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        agentId: row[2],
        type: row[3],
        metadata: row[4],
        status: row[5],
        startedAt: row[6],
        completedAt: row[7],
        createdAt: row[8],
        updatedAt: row[9],
        candidateId: row[10],
        applicationStatus: row[11],
        jobId: row[12],
        jobTitle: row[13],
        companyName: row[14],
        companyOwnerId: row[15],
        candidateName: row[16]
    };
}

export const countInterviewSlotsUsedByJobQuery = `-- name: countInterviewSlotsUsedByJob :one
SELECT count(*)::int AS count
FROM interviews i
JOIN applications a ON a.id = i.application_id
WHERE a.job_id = $1`;

export interface countInterviewSlotsUsedByJobArgs {
    jobId: string;
}

export interface countInterviewSlotsUsedByJobRow {
    count: number;
}

export async function countInterviewSlotsUsedByJob(sql: Sql, args: countInterviewSlotsUsedByJobArgs): Promise<countInterviewSlotsUsedByJobRow | null> {
    const rows = await sql.unsafe(countInterviewSlotsUsedByJobQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        count: row[0]
    };
}

export const countActiveInterviewSlotsByJobQuery = `-- name: countActiveInterviewSlotsByJob :one
SELECT count(*)::int AS count
FROM interviews i
JOIN applications a ON a.id = i.application_id
WHERE a.job_id = $1
  AND i.status IN ('pending', 'in_progress')`;

export interface countActiveInterviewSlotsByJobArgs {
    jobId: string;
}

export interface countActiveInterviewSlotsByJobRow {
    count: number;
}

export async function countActiveInterviewSlotsByJob(sql: Sql, args: countActiveInterviewSlotsByJobArgs): Promise<countActiveInterviewSlotsByJobRow | null> {
    const rows = await sql.unsafe(countActiveInterviewSlotsByJobQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        count: row[0]
    };
}

export const getBestBackfillCandidateByJobQuery = `-- name: getBestBackfillCandidateByJob :one
SELECT a.id AS application_id,
       a.candidate_id,
       pe.next_step,
       pe.score
FROM applications a
JOIN pre_evaluations pe ON pe.application_id = a.id
JOIN users u ON u.id = a.candidate_id AND u.deleted_at IS NULL
WHERE a.job_id = $1
  AND a.status = 'pre_screening'
  AND pe.next_step IN ('interview_invited', 'ask_followups')
  AND NOT EXISTS (
    SELECT 1
    FROM interviews i
    WHERE i.application_id = a.id
  )
ORDER BY pe.score DESC, pe.created_at ASC
LIMIT 1`;

export interface getBestBackfillCandidateByJobArgs {
    jobId: string;
}

export interface getBestBackfillCandidateByJobRow {
    applicationId: string;
    candidateId: string;
    nextStep: string;
    score: number;
}

export async function getBestBackfillCandidateByJob(sql: Sql, args: getBestBackfillCandidateByJobArgs): Promise<getBestBackfillCandidateByJobRow | null> {
    const rows = await sql.unsafe(getBestBackfillCandidateByJobQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        applicationId: row[0],
        candidateId: row[1],
        nextStep: row[2],
        score: row[3]
    };
}

export const getInterviewsPastDeadlineQuery = `-- name: getInterviewsPastDeadline :many
SELECT i.id,
       i.application_id,
       a.candidate_id,
       a.job_id,
       j.title AS job_title
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
WHERE i.status IN ('pending', 'in_progress')
  AND i.metadata ? 'expiresAt'
  AND (i.metadata->>'expiresAt')::timestamptz <= now()`;

export interface getInterviewsPastDeadlineRow {
    id: string;
    applicationId: string;
    candidateId: string;
    jobId: string;
    jobTitle: string;
}

export async function getInterviewsPastDeadline(sql: Sql): Promise<getInterviewsPastDeadlineRow[]> {
    return (await sql.unsafe(getInterviewsPastDeadlineQuery, []).values()).map(row => ({
        id: row[0],
        applicationId: row[1],
        candidateId: row[2],
        jobId: row[3],
        jobTitle: row[4]
    }));
}

