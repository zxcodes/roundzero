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
WHERE application_id = $1`;

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

export const getInterviewForCandidateByIdQuery = `-- name: getInterviewForCandidateById :one
SELECT i.id, i.application_id, i.agent_id, i.type, i.metadata, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
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
        invitedAt: row[6],
        startedAt: row[7],
        completedAt: row[8],
        expiredAt: row[9],
        cancelledAt: row[10],
        cancellationReason: row[11],
        createdAt: row[12],
        updatedAt: row[13],
        candidateId: row[14],
        applicationStatus: row[15],
        jobId: row[16],
        jobTitle: row[17],
        companyName: row[18]
    };
}

export const getInterviewsByCandidateQuery = `-- name: getInterviewsByCandidate :many
SELECT i.id, i.application_id, i.agent_id, i.type, i.metadata, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
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
}

export async function getInterviewsByCandidate(sql: Sql, args: getInterviewsByCandidateArgs): Promise<getInterviewsByCandidateRow[]> {
    return (await sql.unsafe(getInterviewsByCandidateQuery, [args.candidateId]).values()).map(row => ({
        id: row[0],
        applicationId: row[1],
        agentId: row[2],
        type: row[3],
        metadata: row[4],
        status: row[5],
        invitedAt: row[6],
        startedAt: row[7],
        completedAt: row[8],
        expiredAt: row[9],
        cancelledAt: row[10],
        cancellationReason: row[11],
        createdAt: row[12],
        updatedAt: row[13],
        candidateId: row[14],
        applicationStatus: row[15],
        jobId: row[16],
        jobTitle: row[17],
        companyName: row[18]
    }));
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

export const completeInterviewQuery = `-- name: completeInterview :one
UPDATE interviews
SET status = 'completed',
    completed_at = now(),
    updated_at = now()
WHERE id = $1
RETURNING id, application_id, batch_id, agent_id, type, metadata, status, invited_at, started_at, completed_at, expired_at, cancelled_at, cancellation_reason, created_at, updated_at`;

export interface completeInterviewArgs {
    id: string;
}

export interface completeInterviewRow {
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

export async function completeInterview(sql: Sql, args: completeInterviewArgs): Promise<completeInterviewRow | null> {
    const rows = await sql.unsafe(completeInterviewQuery, [args.id]).values();
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

export const createCommunicationAssessmentQuery = `-- name: createCommunicationAssessment :one
INSERT INTO communication_assessments (interview_id, application_id, status)
VALUES ($1, $2, $3)
RETURNING id, interview_id, application_id, status, audio_key, transcript, analysis, started_at, completed_at, created_at, updated_at`;

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
        transcript: row[5],
        analysis: row[6],
        startedAt: row[7],
        completedAt: row[8],
        createdAt: row[9],
        updatedAt: row[10]
    };
}

export const getCommunicationAssessmentByInterviewIdQuery = `-- name: getCommunicationAssessmentByInterviewId :one
SELECT id, interview_id, application_id, status, audio_key, transcript, analysis, started_at, completed_at, created_at, updated_at
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
        transcript: row[5],
        analysis: row[6],
        startedAt: row[7],
        completedAt: row[8],
        createdAt: row[9],
        updatedAt: row[10]
    };
}

export const getCommunicationAssessmentByApplicationIdQuery = `-- name: getCommunicationAssessmentByApplicationId :one
SELECT id, interview_id, application_id, status, audio_key, transcript, analysis, started_at, completed_at, created_at, updated_at
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
        transcript: row[5],
        analysis: row[6],
        startedAt: row[7],
        completedAt: row[8],
        createdAt: row[9],
        updatedAt: row[10]
    };
}

export const markCommunicationAssessmentStartedQuery = `-- name: markCommunicationAssessmentStarted :one
UPDATE communication_assessments
SET status = 'in_progress',
    started_at = COALESCE(started_at, now()),
    updated_at = now()
WHERE interview_id = $1
RETURNING id, interview_id, application_id, status, audio_key, transcript, analysis, started_at, completed_at, created_at, updated_at`;

export interface markCommunicationAssessmentStartedArgs {
    interviewId: string;
}

export interface markCommunicationAssessmentStartedRow {
    id: string;
    interviewId: string;
    applicationId: string;
    status: string;
    audioKey: string | null;
    transcript: any;
    analysis: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function markCommunicationAssessmentStarted(sql: Sql, args: markCommunicationAssessmentStartedArgs): Promise<markCommunicationAssessmentStartedRow | null> {
    const rows = await sql.unsafe(markCommunicationAssessmentStartedQuery, [args.interviewId]).values();
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
        transcript: row[5],
        analysis: row[6],
        startedAt: row[7],
        completedAt: row[8],
        createdAt: row[9],
        updatedAt: row[10]
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
RETURNING id, interview_id, application_id, status, audio_key, transcript, analysis, started_at, completed_at, created_at, updated_at`;

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
        transcript: row[5],
        analysis: row[6],
        startedAt: row[7],
        completedAt: row[8],
        createdAt: row[9],
        updatedAt: row[10]
    };
}

export const markCommunicationAssessmentSkippedQuery = `-- name: markCommunicationAssessmentSkipped :one
UPDATE communication_assessments
SET status = 'skipped',
    completed_at = now(),
    updated_at = now()
WHERE interview_id = $1
RETURNING id, interview_id, application_id, status, audio_key, transcript, analysis, started_at, completed_at, created_at, updated_at`;

export interface markCommunicationAssessmentSkippedArgs {
    interviewId: string;
}

export interface markCommunicationAssessmentSkippedRow {
    id: string;
    interviewId: string;
    applicationId: string;
    status: string;
    audioKey: string | null;
    transcript: any;
    analysis: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function markCommunicationAssessmentSkipped(sql: Sql, args: markCommunicationAssessmentSkippedArgs): Promise<markCommunicationAssessmentSkippedRow | null> {
    const rows = await sql.unsafe(markCommunicationAssessmentSkippedQuery, [args.interviewId]).values();
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
        transcript: row[5],
        analysis: row[6],
        startedAt: row[7],
        completedAt: row[8],
        createdAt: row[9],
        updatedAt: row[10]
    };
}

