import { Sql } from "postgres";

export const createInterviewQuery = `-- name: createInterview :one
INSERT INTO interviews (application_id, agent_id, type, metadata, status, invited_at, started_at, completed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, application_id, batch_id, agent_id, type, metadata, status, invited_at, started_at, completed_at, expired_at, cancelled_at, cancellation_reason, created_at, updated_at`;

export interface createInterviewArgs {
    applicationId: string;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
}

export interface createInterviewRow {
    id: string;
    applicationId: string;
    batchId: string | null;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function createInterview(sql: Sql, args: createInterviewArgs): Promise<createInterviewRow | null> {
    const rows = await sql.unsafe(createInterviewQuery, [args.applicationId, args.agentId, args.type, args.metadata, args.status, args.invitedAt, args.startedAt, args.completedAt]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        batchId: row[2],
        agentId: row[3],
        type: row[4],
        metadata: row[5],
        status: row[6],
        invitedAt: row[7],
        startedAt: row[8],
        completedAt: row[9],
        expiredAt: row[10],
        cancelledAt: row[11],
        cancellationReason: row[12],
        createdAt: row[13],
        updatedAt: row[14]
    };
}

export const getInterviewByApplicationIdQuery = `-- name: getInterviewByApplicationId :one
SELECT id, application_id, batch_id, agent_id, type, metadata, status, invited_at, started_at, completed_at, expired_at, cancelled_at, cancellation_reason, created_at, updated_at
FROM interviews
WHERE application_id = $1
ORDER BY created_at DESC
LIMIT 1`;

export interface getInterviewByApplicationIdArgs {
    applicationId: string;
}

export interface getInterviewByApplicationIdRow {
    id: string;
    applicationId: string;
    batchId: string | null;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
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
        batchId: row[2],
        agentId: row[3],
        type: row[4],
        metadata: row[5],
        status: row[6],
        invitedAt: row[7],
        startedAt: row[8],
        completedAt: row[9],
        expiredAt: row[10],
        cancelledAt: row[11],
        cancellationReason: row[12],
        createdAt: row[13],
        updatedAt: row[14]
    };
}

export const getInterviewForCompanyByApplicationIdQuery = `-- name: getInterviewForCompanyByApplicationId :one
SELECT i.id, i.application_id, i.batch_id, i.type, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
       i.metadata->>'expiresAt' AS expires_at
FROM interviews i
WHERE i.application_id = $1
ORDER BY i.created_at DESC
LIMIT 1`;

export interface getInterviewForCompanyByApplicationIdArgs {
    applicationId: string;
}

export interface getInterviewForCompanyByApplicationIdRow {
    id: string;
    applicationId: string;
    batchId: string | null;
    type: string;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: string | null;
}

export async function getInterviewForCompanyByApplicationId(sql: Sql, args: getInterviewForCompanyByApplicationIdArgs): Promise<getInterviewForCompanyByApplicationIdRow | null> {
    const rows = await sql.unsafe(getInterviewForCompanyByApplicationIdQuery, [args.applicationId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        batchId: row[2],
        type: row[3],
        status: row[4],
        invitedAt: row[5],
        startedAt: row[6],
        completedAt: row[7],
        expiredAt: row[8],
        cancelledAt: row[9],
        cancellationReason: row[10],
        createdAt: row[11],
        updatedAt: row[12],
        expiresAt: row[13]
    };
}

export const getInterviewForCandidateByIdQuery = `-- name: getInterviewForCandidateById :one
SELECT i.id, i.application_id, i.type, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
       i.metadata->>'expiresAt' AS expires_at,
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
    type: string;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: string | null;
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
        type: row[2],
        status: row[3],
        invitedAt: row[4],
        startedAt: row[5],
        completedAt: row[6],
        expiredAt: row[7],
        cancelledAt: row[8],
        cancellationReason: row[9],
        createdAt: row[10],
        updatedAt: row[11],
        expiresAt: row[12],
        candidateId: row[13],
        applicationStatus: row[14],
        jobId: row[15],
        jobTitle: row[16],
        companyName: row[17]
    };
}

export const getInterviewForCandidateByApplicationIdQuery = `-- name: getInterviewForCandidateByApplicationId :one
SELECT i.id, i.application_id, i.type, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
       i.metadata->>'expiresAt' AS expires_at,
       a.candidate_id, a.status AS application_status,
       a.job_id, j.title AS job_title, c.name AS company_name
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE a.id = $1
  AND a.candidate_id = $2
ORDER BY i.created_at DESC
LIMIT 1`;

export interface getInterviewForCandidateByApplicationIdArgs {
    id: string;
    candidateId: string;
}

export interface getInterviewForCandidateByApplicationIdRow {
    id: string;
    applicationId: string;
    type: string;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: string | null;
    candidateId: string;
    applicationStatus: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
}

export async function getInterviewForCandidateByApplicationId(sql: Sql, args: getInterviewForCandidateByApplicationIdArgs): Promise<getInterviewForCandidateByApplicationIdRow | null> {
    const rows = await sql.unsafe(getInterviewForCandidateByApplicationIdQuery, [args.id, args.candidateId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        type: row[2],
        status: row[3],
        invitedAt: row[4],
        startedAt: row[5],
        completedAt: row[6],
        expiredAt: row[7],
        cancelledAt: row[8],
        cancellationReason: row[9],
        createdAt: row[10],
        updatedAt: row[11],
        expiresAt: row[12],
        candidateId: row[13],
        applicationStatus: row[14],
        jobId: row[15],
        jobTitle: row[16],
        companyName: row[17]
    };
}

export const getInterviewsByCandidateQuery = `-- name: getInterviewsByCandidate :many
SELECT i.id, i.application_id, i.type, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
       i.metadata->>'expiresAt' AS expires_at,
       a.candidate_id, a.status AS application_status,
       a.job_id, j.title AS job_title, c.name AS company_name
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE a.candidate_id = $1
ORDER BY i.updated_at DESC`;

export interface getInterviewsByCandidateArgs {
    candidateId: string;
}

export interface getInterviewsByCandidateRow {
    id: string;
    applicationId: string;
    type: string;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: string | null;
    candidateId: string;
    applicationStatus: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
}

export async function getInterviewsByCandidate(sql: Sql, args: getInterviewsByCandidateArgs): Promise<getInterviewsByCandidateRow[]> {
    return (await sql.unsafe(getInterviewsByCandidateQuery, [args.candidateId]).values()).map(row => ({
        id: row[0],
        applicationId: row[1],
        type: row[2],
        status: row[3],
        invitedAt: row[4],
        startedAt: row[5],
        completedAt: row[6],
        expiredAt: row[7],
        cancelledAt: row[8],
        cancellationReason: row[9],
        createdAt: row[10],
        updatedAt: row[11],
        expiresAt: row[12],
        candidateId: row[13],
        applicationStatus: row[14],
        jobId: row[15],
        jobTitle: row[16],
        companyName: row[17]
    }));
}

export const getActiveInterviewsByJobQuery = `-- name: getActiveInterviewsByJob :many
SELECT i.id, i.application_id, i.status, i.metadata->>'expiresAt' AS expires_at
FROM interviews i
JOIN applications a ON a.id = i.application_id
WHERE a.job_id = $1
  AND i.status IN ('pending', 'in_progress')
ORDER BY i.created_at DESC`;

export interface getActiveInterviewsByJobArgs {
    jobId: string;
}

export interface getActiveInterviewsByJobRow {
    id: string;
    applicationId: string;
    status: string;
    expiresAt: string | null;
}

export async function getActiveInterviewsByJob(sql: Sql, args: getActiveInterviewsByJobArgs): Promise<getActiveInterviewsByJobRow[]> {
    return (await sql.unsafe(getActiveInterviewsByJobQuery, [args.jobId]).values()).map(row => ({
        id: row[0],
        applicationId: row[1],
        status: row[2],
        expiresAt: row[3]
    }));
}

export const resetInterviewInviteQuery = `-- name: resetInterviewInvite :one
UPDATE interviews
SET batch_id = NULL,
    metadata = $2,
    status = 'pending',
    invited_at = $3,
    started_at = NULL,
    completed_at = NULL,
    expired_at = NULL,
    cancelled_at = NULL,
    cancellation_reason = NULL,
    updated_at = now()
WHERE interviews.id = $1
  AND status IN ('expired', 'cancelled', 'pending', 'in_progress')
  AND NOT EXISTS (SELECT 1 FROM reports WHERE application_id = interviews.application_id)
RETURNING id, application_id, batch_id, agent_id, type, metadata, status, invited_at, started_at, completed_at, expired_at, cancelled_at, cancellation_reason, created_at, updated_at`;

export interface resetInterviewInviteArgs {
    id: string;
    metadata: any;
    invitedAt: Date | null;
}

export interface resetInterviewInviteRow {
    id: string;
    applicationId: string;
    batchId: string | null;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function resetInterviewInvite(sql: Sql, args: resetInterviewInviteArgs): Promise<resetInterviewInviteRow | null> {
    const rows = await sql.unsafe(resetInterviewInviteQuery, [args.id, args.metadata, args.invitedAt]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        batchId: row[2],
        agentId: row[3],
        type: row[4],
        metadata: row[5],
        status: row[6],
        invitedAt: row[7],
        startedAt: row[8],
        completedAt: row[9],
        expiredAt: row[10],
        cancelledAt: row[11],
        cancellationReason: row[12],
        createdAt: row[13],
        updatedAt: row[14]
    };
}

export const deleteCommunicationAssessmentByInterviewIdQuery = `-- name: deleteCommunicationAssessmentByInterviewId :exec
DELETE FROM communication_assessments
WHERE interview_id = $1`;

export interface deleteCommunicationAssessmentByInterviewIdArgs {
    interviewId: string;
}

export async function deleteCommunicationAssessmentByInterviewId(sql: Sql, args: deleteCommunicationAssessmentByInterviewIdArgs): Promise<void> {
    await sql.unsafe(deleteCommunicationAssessmentByInterviewIdQuery, [args.interviewId]);
}

export const updateInterviewStatusQuery = `-- name: updateInterviewStatus :one
UPDATE interviews
SET status = $1,
    updated_at = now()
WHERE id = $2
RETURNING id, application_id, batch_id, agent_id, type, metadata, status, invited_at, started_at, completed_at, expired_at, cancelled_at, cancellation_reason, created_at, updated_at`;

export interface updateInterviewStatusArgs {
    status: string;
    id: string;
}

export interface updateInterviewStatusRow {
    id: string;
    applicationId: string;
    batchId: string | null;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
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
        batchId: row[2],
        agentId: row[3],
        type: row[4],
        metadata: row[5],
        status: row[6],
        invitedAt: row[7],
        startedAt: row[8],
        completedAt: row[9],
        expiredAt: row[10],
        cancelledAt: row[11],
        cancellationReason: row[12],
        createdAt: row[13],
        updatedAt: row[14]
    };
}

export const submitInterviewForVoiceQuery = `-- name: submitInterviewForVoice :one
UPDATE interviews
SET status = 'awaiting_voice',
    updated_at = now()
WHERE id = $1
  AND status = 'in_progress'
RETURNING id, application_id, batch_id, agent_id, type, metadata, status, invited_at, started_at, completed_at, expired_at, cancelled_at, cancellation_reason, created_at, updated_at`;

export interface submitInterviewForVoiceArgs {
    id: string;
}

export interface submitInterviewForVoiceRow {
    id: string;
    applicationId: string;
    batchId: string | null;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function submitInterviewForVoice(sql: Sql, args: submitInterviewForVoiceArgs): Promise<submitInterviewForVoiceRow | null> {
    const rows = await sql.unsafe(submitInterviewForVoiceQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        batchId: row[2],
        agentId: row[3],
        type: row[4],
        metadata: row[5],
        status: row[6],
        invitedAt: row[7],
        startedAt: row[8],
        completedAt: row[9],
        expiredAt: row[10],
        cancelledAt: row[11],
        cancellationReason: row[12],
        createdAt: row[13],
        updatedAt: row[14]
    };
}

export const completeInterviewAfterVoiceQuery = `-- name: completeInterviewAfterVoice :one
UPDATE interviews
SET status = 'completed',
    completed_at = now(),
    updated_at = now()
WHERE id = $1
  AND status = 'awaiting_voice'
RETURNING id, application_id, batch_id, agent_id, type, metadata, status, invited_at, started_at, completed_at, expired_at, cancelled_at, cancellation_reason, created_at, updated_at`;

export interface completeInterviewAfterVoiceArgs {
    id: string;
}

export interface completeInterviewAfterVoiceRow {
    id: string;
    applicationId: string;
    batchId: string | null;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function completeInterviewAfterVoice(sql: Sql, args: completeInterviewAfterVoiceArgs): Promise<completeInterviewAfterVoiceRow | null> {
    const rows = await sql.unsafe(completeInterviewAfterVoiceQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        batchId: row[2],
        agentId: row[3],
        type: row[4],
        metadata: row[5],
        status: row[6],
        invitedAt: row[7],
        startedAt: row[8],
        completedAt: row[9],
        expiredAt: row[10],
        cancelledAt: row[11],
        cancellationReason: row[12],
        createdAt: row[13],
        updatedAt: row[14]
    };
}

export const expireInterviewQuery = `-- name: expireInterview :one
UPDATE interviews
SET status = 'expired',
    expired_at = now(),
    updated_at = now()
WHERE id = $1
  AND status IN ('pending', 'in_progress')
  AND (metadata->>'expiresAt')::timestamptz <= now()
RETURNING id, application_id, batch_id, agent_id, type, metadata, status, invited_at, started_at, completed_at, expired_at, cancelled_at, cancellation_reason, created_at, updated_at`;

export interface expireInterviewArgs {
    id: string;
}

export interface expireInterviewRow {
    id: string;
    applicationId: string;
    batchId: string | null;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function expireInterview(sql: Sql, args: expireInterviewArgs): Promise<expireInterviewRow | null> {
    const rows = await sql.unsafe(expireInterviewQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        batchId: row[2],
        agentId: row[3],
        type: row[4],
        metadata: row[5],
        status: row[6],
        invitedAt: row[7],
        startedAt: row[8],
        completedAt: row[9],
        expiredAt: row[10],
        cancelledAt: row[11],
        cancellationReason: row[12],
        createdAt: row[13],
        updatedAt: row[14]
    };
}

export const cancelInterviewQuery = `-- name: cancelInterview :one
UPDATE interviews
SET status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = $2,
    updated_at = now()
WHERE id = $1
  AND status IN ('pending', 'in_progress', 'awaiting_voice')
RETURNING id, application_id, batch_id, agent_id, type, metadata, status, invited_at, started_at, completed_at, expired_at, cancelled_at, cancellation_reason, created_at, updated_at`;

export interface cancelInterviewArgs {
    id: string;
    cancellationReason: string | null;
}

export interface cancelInterviewRow {
    id: string;
    applicationId: string;
    batchId: string | null;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function cancelInterview(sql: Sql, args: cancelInterviewArgs): Promise<cancelInterviewRow | null> {
    const rows = await sql.unsafe(cancelInterviewQuery, [args.id, args.cancellationReason]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        batchId: row[2],
        agentId: row[3],
        type: row[4],
        metadata: row[5],
        status: row[6],
        invitedAt: row[7],
        startedAt: row[8],
        completedAt: row[9],
        expiredAt: row[10],
        cancelledAt: row[11],
        cancellationReason: row[12],
        createdAt: row[13],
        updatedAt: row[14]
    };
}

export const updateInterviewMetadataQuery = `-- name: updateInterviewMetadata :one
UPDATE interviews
SET metadata = $2,
    updated_at = now()
WHERE id = $1
RETURNING id, application_id, batch_id, agent_id, type, metadata, status, invited_at, started_at, completed_at, expired_at, cancelled_at, cancellation_reason, created_at, updated_at`;

export interface updateInterviewMetadataArgs {
    id: string;
    metadata: any;
}

export interface updateInterviewMetadataRow {
    id: string;
    applicationId: string;
    batchId: string | null;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateInterviewMetadata(sql: Sql, args: updateInterviewMetadataArgs): Promise<updateInterviewMetadataRow | null> {
    const rows = await sql.unsafe(updateInterviewMetadataQuery, [args.id, args.metadata]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        batchId: row[2],
        agentId: row[3],
        type: row[4],
        metadata: row[5],
        status: row[6],
        invitedAt: row[7],
        startedAt: row[8],
        completedAt: row[9],
        expiredAt: row[10],
        cancelledAt: row[11],
        cancellationReason: row[12],
        createdAt: row[13],
        updatedAt: row[14]
    };
}

export const getInterviewRuntimeInputsByApplicationIdQuery = `-- name: getInterviewRuntimeInputsByApplicationId :one
SELECT a.metadata AS application_metadata,
       u.name AS candidate_name,
       pe.score,
       pe.missing_requirements,
       pe.consistency_score,
       pe.raw_response
FROM applications a
JOIN users u ON u.id = a.candidate_id
LEFT JOIN pre_evaluations pe ON pe.application_id = a.id
WHERE a.id = $1`;

export interface getInterviewRuntimeInputsByApplicationIdArgs {
    id: string;
}

export interface getInterviewRuntimeInputsByApplicationIdRow {
    applicationMetadata: any;
    candidateName: string;
    score: number | null;
    missingRequirements: any | null;
    consistencyScore: number | null;
    rawResponse: any | null;
}

export async function getInterviewRuntimeInputsByApplicationId(sql: Sql, args: getInterviewRuntimeInputsByApplicationIdArgs): Promise<getInterviewRuntimeInputsByApplicationIdRow | null> {
    const rows = await sql.unsafe(getInterviewRuntimeInputsByApplicationIdQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        applicationMetadata: row[0],
        candidateName: row[1],
        score: row[2],
        missingRequirements: row[3],
        consistencyScore: row[4],
        rawResponse: row[5]
    };
}

export const deleteInterviewMessagesByInterviewIdQuery = `-- name: deleteInterviewMessagesByInterviewId :exec
DELETE FROM interview_messages
WHERE interview_id = $1`;

export interface deleteInterviewMessagesByInterviewIdArgs {
    interviewId: string;
}

export async function deleteInterviewMessagesByInterviewId(sql: Sql, args: deleteInterviewMessagesByInterviewIdArgs): Promise<void> {
    await sql.unsafe(deleteInterviewMessagesByInterviewIdQuery, [args.interviewId]);
}

export const getInterviewContextByIdQuery = `-- name: getInterviewContextById :one
SELECT i.id, i.application_id, i.batch_id, i.agent_id, i.type, i.metadata, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
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
    batchId: string | null;
    agentId: string | null;
    type: string;
    metadata: any;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
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
        batchId: row[2],
        agentId: row[3],
        type: row[4],
        metadata: row[5],
        status: row[6],
        invitedAt: row[7],
        startedAt: row[8],
        completedAt: row[9],
        expiredAt: row[10],
        cancelledAt: row[11],
        cancellationReason: row[12],
        createdAt: row[13],
        updatedAt: row[14],
        candidateId: row[15],
        applicationStatus: row[16],
        jobId: row[17],
        jobTitle: row[18],
        companyName: row[19],
        companyOwnerId: row[20],
        candidateName: row[21]
    };
}

export const createCommunicationAssessmentQuery = `-- name: createCommunicationAssessment :one
INSERT INTO communication_assessments (interview_id, application_id, status)
VALUES ($1, $2, $3)
RETURNING id, interview_id, application_id, status, audio_key, provider_session_id, provider_conversation_id, transcript, analysis, started_at, completed_at, created_at, updated_at`;

export interface createCommunicationAssessmentArgs {
    interviewId: string;
    applicationId: string;
    status: string;
}

export interface createCommunicationAssessmentRow {
    id: string;
    interviewId: string;
    applicationId: string;
    status: string;
    audioKey: string | null;
    providerSessionId: string | null;
    providerConversationId: string | null;
    transcript: any;
    analysis: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function createCommunicationAssessment(sql: Sql, args: createCommunicationAssessmentArgs): Promise<createCommunicationAssessmentRow | null> {
    const rows = await sql.unsafe(createCommunicationAssessmentQuery, [args.interviewId, args.applicationId, args.status]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        status: row[3],
        audioKey: row[4],
        providerSessionId: row[5],
        providerConversationId: row[6],
        transcript: row[7],
        analysis: row[8],
        startedAt: row[9],
        completedAt: row[10],
        createdAt: row[11],
        updatedAt: row[12]
    };
}

export const getCommunicationAssessmentByInterviewIdQuery = `-- name: getCommunicationAssessmentByInterviewId :one
SELECT id, interview_id, application_id, status, audio_key, provider_session_id, provider_conversation_id, transcript, analysis, started_at, completed_at, created_at, updated_at
FROM communication_assessments
WHERE interview_id = $1`;

export interface getCommunicationAssessmentByInterviewIdArgs {
    interviewId: string;
}

export interface getCommunicationAssessmentByInterviewIdRow {
    id: string;
    interviewId: string;
    applicationId: string;
    status: string;
    audioKey: string | null;
    providerSessionId: string | null;
    providerConversationId: string | null;
    transcript: any;
    analysis: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getCommunicationAssessmentByInterviewId(sql: Sql, args: getCommunicationAssessmentByInterviewIdArgs): Promise<getCommunicationAssessmentByInterviewIdRow | null> {
    const rows = await sql.unsafe(getCommunicationAssessmentByInterviewIdQuery, [args.interviewId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        status: row[3],
        audioKey: row[4],
        providerSessionId: row[5],
        providerConversationId: row[6],
        transcript: row[7],
        analysis: row[8],
        startedAt: row[9],
        completedAt: row[10],
        createdAt: row[11],
        updatedAt: row[12]
    };
}

export const getCommunicationAssessmentByApplicationIdQuery = `-- name: getCommunicationAssessmentByApplicationId :one
SELECT id, interview_id, application_id, status, audio_key, provider_session_id, provider_conversation_id, transcript, analysis, started_at, completed_at, created_at, updated_at
FROM communication_assessments
WHERE application_id = $1`;

export interface getCommunicationAssessmentByApplicationIdArgs {
    applicationId: string;
}

export interface getCommunicationAssessmentByApplicationIdRow {
    id: string;
    interviewId: string;
    applicationId: string;
    status: string;
    audioKey: string | null;
    providerSessionId: string | null;
    providerConversationId: string | null;
    transcript: any;
    analysis: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getCommunicationAssessmentByApplicationId(sql: Sql, args: getCommunicationAssessmentByApplicationIdArgs): Promise<getCommunicationAssessmentByApplicationIdRow | null> {
    const rows = await sql.unsafe(getCommunicationAssessmentByApplicationIdQuery, [args.applicationId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        status: row[3],
        audioKey: row[4],
        providerSessionId: row[5],
        providerConversationId: row[6],
        transcript: row[7],
        analysis: row[8],
        startedAt: row[9],
        completedAt: row[10],
        createdAt: row[11],
        updatedAt: row[12]
    };
}

export const getCommunicationAssessmentByProviderConversationIdQuery = `-- name: getCommunicationAssessmentByProviderConversationId :one
SELECT id, interview_id, application_id, status, audio_key, provider_session_id, provider_conversation_id, transcript, analysis, started_at, completed_at, created_at, updated_at
FROM communication_assessments
WHERE provider_conversation_id = $1`;

export interface getCommunicationAssessmentByProviderConversationIdArgs {
    providerConversationId: string | null;
}

export interface getCommunicationAssessmentByProviderConversationIdRow {
    id: string;
    interviewId: string;
    applicationId: string;
    status: string;
    audioKey: string | null;
    providerSessionId: string | null;
    providerConversationId: string | null;
    transcript: any;
    analysis: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getCommunicationAssessmentByProviderConversationId(sql: Sql, args: getCommunicationAssessmentByProviderConversationIdArgs): Promise<getCommunicationAssessmentByProviderConversationIdRow | null> {
    const rows = await sql.unsafe(getCommunicationAssessmentByProviderConversationIdQuery, [args.providerConversationId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        status: row[3],
        audioKey: row[4],
        providerSessionId: row[5],
        providerConversationId: row[6],
        transcript: row[7],
        analysis: row[8],
        startedAt: row[9],
        completedAt: row[10],
        createdAt: row[11],
        updatedAt: row[12]
    };
}

export const getCommunicationAssessmentByProviderSessionIdQuery = `-- name: getCommunicationAssessmentByProviderSessionId :one
SELECT id, interview_id, application_id, status, audio_key, provider_session_id, provider_conversation_id, transcript, analysis, started_at, completed_at, created_at, updated_at
FROM communication_assessments
WHERE provider_session_id = $1`;

export interface getCommunicationAssessmentByProviderSessionIdArgs {
    providerSessionId: string | null;
}

export interface getCommunicationAssessmentByProviderSessionIdRow {
    id: string;
    interviewId: string;
    applicationId: string;
    status: string;
    audioKey: string | null;
    providerSessionId: string | null;
    providerConversationId: string | null;
    transcript: any;
    analysis: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getCommunicationAssessmentByProviderSessionId(sql: Sql, args: getCommunicationAssessmentByProviderSessionIdArgs): Promise<getCommunicationAssessmentByProviderSessionIdRow | null> {
    const rows = await sql.unsafe(getCommunicationAssessmentByProviderSessionIdQuery, [args.providerSessionId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        status: row[3],
        audioKey: row[4],
        providerSessionId: row[5],
        providerConversationId: row[6],
        transcript: row[7],
        analysis: row[8],
        startedAt: row[9],
        completedAt: row[10],
        createdAt: row[11],
        updatedAt: row[12]
    };
}

export const registerCommunicationAssessmentSessionQuery = `-- name: registerCommunicationAssessmentSession :one
UPDATE communication_assessments
SET provider_session_id = $2,
    provider_conversation_id = NULL,
    updated_at = now()
WHERE interview_id = $1
RETURNING id, interview_id, application_id, status, audio_key, provider_session_id, provider_conversation_id, transcript, analysis, started_at, completed_at, created_at, updated_at`;

export interface registerCommunicationAssessmentSessionArgs {
    interviewId: string;
    providerSessionId: string | null;
}

export interface registerCommunicationAssessmentSessionRow {
    id: string;
    interviewId: string;
    applicationId: string;
    status: string;
    audioKey: string | null;
    providerSessionId: string | null;
    providerConversationId: string | null;
    transcript: any;
    analysis: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function registerCommunicationAssessmentSession(sql: Sql, args: registerCommunicationAssessmentSessionArgs): Promise<registerCommunicationAssessmentSessionRow | null> {
    const rows = await sql.unsafe(registerCommunicationAssessmentSessionQuery, [args.interviewId, args.providerSessionId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        status: row[3],
        audioKey: row[4],
        providerSessionId: row[5],
        providerConversationId: row[6],
        transcript: row[7],
        analysis: row[8],
        startedAt: row[9],
        completedAt: row[10],
        createdAt: row[11],
        updatedAt: row[12]
    };
}

export const registerCommunicationAssessmentConversationQuery = `-- name: registerCommunicationAssessmentConversation :one
UPDATE communication_assessments
SET provider_conversation_id = $2,
    updated_at = now()
WHERE interview_id = $1
RETURNING id, interview_id, application_id, status, audio_key, provider_session_id, provider_conversation_id, transcript, analysis, started_at, completed_at, created_at, updated_at`;

export interface registerCommunicationAssessmentConversationArgs {
    interviewId: string;
    providerConversationId: string | null;
}

export interface registerCommunicationAssessmentConversationRow {
    id: string;
    interviewId: string;
    applicationId: string;
    status: string;
    audioKey: string | null;
    providerSessionId: string | null;
    providerConversationId: string | null;
    transcript: any;
    analysis: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function registerCommunicationAssessmentConversation(sql: Sql, args: registerCommunicationAssessmentConversationArgs): Promise<registerCommunicationAssessmentConversationRow | null> {
    const rows = await sql.unsafe(registerCommunicationAssessmentConversationQuery, [args.interviewId, args.providerConversationId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        status: row[3],
        audioKey: row[4],
        providerSessionId: row[5],
        providerConversationId: row[6],
        transcript: row[7],
        analysis: row[8],
        startedAt: row[9],
        completedAt: row[10],
        createdAt: row[11],
        updatedAt: row[12]
    };
}

export const completeCommunicationAssessmentQuery = `-- name: completeCommunicationAssessment :one
UPDATE communication_assessments
SET status = 'completed',
    transcript = $2,
    analysis = $3,
    audio_key = $4,
    completed_at = now(),
    updated_at = now()
WHERE interview_id = $1
  AND status != 'completed'
  AND status != 'skipped'
RETURNING id, interview_id, application_id, status, audio_key, provider_session_id, provider_conversation_id, transcript, analysis, started_at, completed_at, created_at, updated_at`;

export interface completeCommunicationAssessmentArgs {
    interviewId: string;
    transcript: any;
    analysis: any | null;
    audioKey: string | null;
}

export interface completeCommunicationAssessmentRow {
    id: string;
    interviewId: string;
    applicationId: string;
    status: string;
    audioKey: string | null;
    providerSessionId: string | null;
    providerConversationId: string | null;
    transcript: any;
    analysis: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function completeCommunicationAssessment(sql: Sql, args: completeCommunicationAssessmentArgs): Promise<completeCommunicationAssessmentRow | null> {
    const rows = await sql.unsafe(completeCommunicationAssessmentQuery, [args.interviewId, args.transcript, args.analysis, args.audioKey]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        status: row[3],
        audioKey: row[4],
        providerSessionId: row[5],
        providerConversationId: row[6],
        transcript: row[7],
        analysis: row[8],
        startedAt: row[9],
        completedAt: row[10],
        createdAt: row[11],
        updatedAt: row[12]
    };
}

export const updateCommunicationAssessmentAnalysisQuery = `-- name: updateCommunicationAssessmentAnalysis :one
UPDATE communication_assessments
SET analysis = $2,
    updated_at = now()
WHERE interview_id = $1
  AND status = 'completed'
  AND analysis IS NULL
RETURNING id, interview_id, application_id, status, audio_key, provider_session_id, provider_conversation_id, transcript, analysis, started_at, completed_at, created_at, updated_at`;

export interface updateCommunicationAssessmentAnalysisArgs {
    interviewId: string;
    analysis: any | null;
}

export interface updateCommunicationAssessmentAnalysisRow {
    id: string;
    interviewId: string;
    applicationId: string;
    status: string;
    audioKey: string | null;
    providerSessionId: string | null;
    providerConversationId: string | null;
    transcript: any;
    analysis: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateCommunicationAssessmentAnalysis(sql: Sql, args: updateCommunicationAssessmentAnalysisArgs): Promise<updateCommunicationAssessmentAnalysisRow | null> {
    const rows = await sql.unsafe(updateCommunicationAssessmentAnalysisQuery, [args.interviewId, args.analysis]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        status: row[3],
        audioKey: row[4],
        providerSessionId: row[5],
        providerConversationId: row[6],
        transcript: row[7],
        analysis: row[8],
        startedAt: row[9],
        completedAt: row[10],
        createdAt: row[11],
        updatedAt: row[12]
    };
}

export const createInterviewMessageQuery = `-- name: createInterviewMessage :one
INSERT INTO interview_messages (interview_id, role, content)
VALUES ($1, $2, $3)
RETURNING id, interview_id, role, content, created_at, position`;

export interface createInterviewMessageArgs {
    interviewId: string;
    role: string;
    content: string;
}

export interface createInterviewMessageRow {
    id: string;
    interviewId: string;
    role: string;
    content: string;
    createdAt: Date;
    position: string | null;
}

export async function createInterviewMessage(sql: Sql, args: createInterviewMessageArgs): Promise<createInterviewMessageRow | null> {
    const rows = await sql.unsafe(createInterviewMessageQuery, [args.interviewId, args.role, args.content]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        role: row[2],
        content: row[3],
        createdAt: row[4],
        position: row[5]
    };
}

export const getInterviewMessagesByInterviewIdQuery = `-- name: getInterviewMessagesByInterviewId :many
SELECT id, interview_id, role, content, created_at, position
FROM interview_messages
WHERE interview_id = $1
ORDER BY position ASC`;

export interface getInterviewMessagesByInterviewIdArgs {
    interviewId: string;
}

export interface getInterviewMessagesByInterviewIdRow {
    id: string;
    interviewId: string;
    role: string;
    content: string;
    createdAt: Date;
    position: string | null;
}

export async function getInterviewMessagesByInterviewId(sql: Sql, args: getInterviewMessagesByInterviewIdArgs): Promise<getInterviewMessagesByInterviewIdRow[]> {
    return (await sql.unsafe(getInterviewMessagesByInterviewIdQuery, [args.interviewId]).values()).map(row => ({
        id: row[0],
        interviewId: row[1],
        role: row[2],
        content: row[3],
        createdAt: row[4],
        position: row[5]
    }));
}

