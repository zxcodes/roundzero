import { Sql } from "postgres";

export const createBatchQuery = `-- name: createBatch :one
INSERT INTO job_batches (job_id, status, target_size)
VALUES ($1, 'forming', $2)
RETURNING id, job_id, status, target_size, created_at, launched_at, released_at`;

export interface createBatchArgs {
    jobId: string;
    targetSize: number;
}

export interface createBatchRow {
    id: string;
    jobId: string;
    status: string;
    targetSize: number;
    createdAt: Date;
    launchedAt: Date | null;
    releasedAt: Date | null;
}

export async function createBatch(sql: Sql, args: createBatchArgs): Promise<createBatchRow | null> {
    const rows = await sql.unsafe(createBatchQuery, [args.jobId, args.targetSize]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        status: row[2],
        targetSize: row[3],
        createdAt: row[4],
        launchedAt: row[5],
        releasedAt: row[6]
    };
}

export const getBatchByIdQuery = `-- name: getBatchById :one
SELECT id, job_id, status, target_size, created_at, launched_at, released_at
FROM job_batches
WHERE id = $1`;

export interface getBatchByIdArgs {
    id: string;
}

export interface getBatchByIdRow {
    id: string;
    jobId: string;
    status: string;
    targetSize: number;
    createdAt: Date;
    launchedAt: Date | null;
    releasedAt: Date | null;
}

export async function getBatchById(sql: Sql, args: getBatchByIdArgs): Promise<getBatchByIdRow | null> {
    const rows = await sql.unsafe(getBatchByIdQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        status: row[2],
        targetSize: row[3],
        createdAt: row[4],
        launchedAt: row[5],
        releasedAt: row[6]
    };
}

export const getActiveBatchForJobQuery = `-- name: getActiveBatchForJob :one
SELECT id, job_id, status, target_size, created_at, launched_at, released_at
FROM job_batches
WHERE job_id = $1 AND status = 'active'
LIMIT 1`;

export interface getActiveBatchForJobArgs {
    jobId: string;
}

export interface getActiveBatchForJobRow {
    id: string;
    jobId: string;
    status: string;
    targetSize: number;
    createdAt: Date;
    launchedAt: Date | null;
    releasedAt: Date | null;
}

export async function getActiveBatchForJob(sql: Sql, args: getActiveBatchForJobArgs): Promise<getActiveBatchForJobRow | null> {
    const rows = await sql.unsafe(getActiveBatchForJobQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        status: row[2],
        targetSize: row[3],
        createdAt: row[4],
        launchedAt: row[5],
        releasedAt: row[6]
    };
}

export const getActiveBatchesByCompanyQuery = `-- name: getActiveBatchesByCompany :many
SELECT b.id, b.job_id, b.status, b.target_size, b.created_at, b.launched_at, b.released_at,
       j.title AS job_title
FROM job_batches b
JOIN jobs j ON j.id = b.job_id
WHERE j.company_id = $1 AND b.status = 'active'
ORDER BY b.launched_at DESC`;

export interface getActiveBatchesByCompanyArgs {
    companyId: string;
}

export interface getActiveBatchesByCompanyRow {
    id: string;
    jobId: string;
    status: string;
    targetSize: number;
    createdAt: Date;
    launchedAt: Date | null;
    releasedAt: Date | null;
    jobTitle: string;
}

export async function getActiveBatchesByCompany(sql: Sql, args: getActiveBatchesByCompanyArgs): Promise<getActiveBatchesByCompanyRow[]> {
    return (await sql.unsafe(getActiveBatchesByCompanyQuery, [args.companyId]).values()).map(row => ({
        id: row[0],
        jobId: row[1],
        status: row[2],
        targetSize: row[3],
        createdAt: row[4],
        launchedAt: row[5],
        releasedAt: row[6],
        jobTitle: row[7]
    }));
}

export const getFormingBatchForJobQuery = `-- name: getFormingBatchForJob :one
SELECT id, job_id, status, target_size, created_at, launched_at, released_at
FROM job_batches
WHERE job_id = $1 AND status IN ('forming', 'active')
LIMIT 1`;

export interface getFormingBatchForJobArgs {
    jobId: string;
}

export interface getFormingBatchForJobRow {
    id: string;
    jobId: string;
    status: string;
    targetSize: number;
    createdAt: Date;
    launchedAt: Date | null;
    releasedAt: Date | null;
}

export async function getFormingBatchForJob(sql: Sql, args: getFormingBatchForJobArgs): Promise<getFormingBatchForJobRow | null> {
    const rows = await sql.unsafe(getFormingBatchForJobQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        status: row[2],
        targetSize: row[3],
        createdAt: row[4],
        launchedAt: row[5],
        releasedAt: row[6]
    };
}

export const updateBatchStatusQuery = `-- name: updateBatchStatus :one
UPDATE job_batches
SET status = $2,
    launched_at = CASE WHEN $2 = 'active' THEN COALESCE(launched_at, now()) ELSE launched_at END,
    released_at = CASE WHEN $2 = 'released' THEN COALESCE(released_at, now()) ELSE released_at END
WHERE id = $1
RETURNING id, job_id, status, target_size, created_at, launched_at, released_at`;

export interface updateBatchStatusArgs {
    id: string;
    status: string;
}

export interface updateBatchStatusRow {
    id: string;
    jobId: string;
    status: string;
    targetSize: number;
    createdAt: Date;
    launchedAt: Date | null;
    releasedAt: Date | null;
}

export async function updateBatchStatus(sql: Sql, args: updateBatchStatusArgs): Promise<updateBatchStatusRow | null> {
    const rows = await sql.unsafe(updateBatchStatusQuery, [args.id, args.status]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        status: row[2],
        targetSize: row[3],
        createdAt: row[4],
        launchedAt: row[5],
        releasedAt: row[6]
    };
}

export const getBatchesForJobQuery = `-- name: getBatchesForJob :many
SELECT id, job_id, status, target_size, created_at, launched_at, released_at
FROM job_batches
WHERE job_id = $1
ORDER BY created_at DESC`;

export interface getBatchesForJobArgs {
    jobId: string;
}

export interface getBatchesForJobRow {
    id: string;
    jobId: string;
    status: string;
    targetSize: number;
    createdAt: Date;
    launchedAt: Date | null;
    releasedAt: Date | null;
}

export async function getBatchesForJob(sql: Sql, args: getBatchesForJobArgs): Promise<getBatchesForJobRow[]> {
    return (await sql.unsafe(getBatchesForJobQuery, [args.jobId]).values()).map(row => ({
        id: row[0],
        jobId: row[1],
        status: row[2],
        targetSize: row[3],
        createdAt: row[4],
        launchedAt: row[5],
        releasedAt: row[6]
    }));
}

export const getBatchProgressQuery = `-- name: getBatchProgress :one
SELECT
  COUNT(*) FILTER (WHERE i.status IN ('completed', 'expired', 'cancelled'))::int AS resolved_count,
  COUNT(*)::int AS total_count
FROM interviews i
WHERE i.batch_id = $1`;

export interface getBatchProgressArgs {
    batchId: string | null;
}

export interface getBatchProgressRow {
    resolvedCount: number;
    totalCount: number;
}

export async function getBatchProgress(sql: Sql, args: getBatchProgressArgs): Promise<getBatchProgressRow | null> {
    const rows = await sql.unsafe(getBatchProgressQuery, [args.batchId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        resolvedCount: row[0],
        totalCount: row[1]
    };
}

export const getPoolCandidatesForJobQuery = `-- name: getPoolCandidatesForJob :many
SELECT
  a.id,
  a.candidate_id,
  a.job_id,
  a.status,
  a.created_at,
  pe.score AS pre_evaluation_score
FROM applications a
LEFT JOIN pre_evaluations pe ON pe.application_id = a.id
WHERE a.job_id = $1
  AND a.status = 'queued_for_batch'
ORDER BY pe.score DESC NULLS LAST, a.created_at ASC`;

export interface getPoolCandidatesForJobArgs {
    jobId: string;
}

export interface getPoolCandidatesForJobRow {
    id: string;
    candidateId: string;
    jobId: string;
    status: string;
    createdAt: Date;
    preEvaluationScore: number | null;
}

export async function getPoolCandidatesForJob(sql: Sql, args: getPoolCandidatesForJobArgs): Promise<getPoolCandidatesForJobRow[]> {
    return (await sql.unsafe(getPoolCandidatesForJobQuery, [args.jobId]).values()).map(row => ({
        id: row[0],
        candidateId: row[1],
        jobId: row[2],
        status: row[3],
        createdAt: row[4],
        preEvaluationScore: row[5]
    }));
}

export const addApplicationToPoolQuery = `-- name: addApplicationToPool :exec
UPDATE applications
SET status = 'queued_for_batch',
    updated_at = now()
WHERE id = $1`;

export interface addApplicationToPoolArgs {
    id: string;
}

export async function addApplicationToPool(sql: Sql, args: addApplicationToPoolArgs): Promise<void> {
    await sql.unsafe(addApplicationToPoolQuery, [args.id]);
}

export const launchBatchInterviewsQuery = `-- name: launchBatchInterviews :exec
UPDATE interviews
SET status = 'pending',
    invited_at = now()
WHERE batch_id = $1`;

export interface launchBatchInterviewsArgs {
    batchId: string | null;
}

export async function launchBatchInterviews(sql: Sql, args: launchBatchInterviewsArgs): Promise<void> {
    await sql.unsafe(launchBatchInterviewsQuery, [args.batchId]);
}

export const getHeldReportsForBatchQuery = `-- name: getHeldReportsForBatch :many
SELECT
  r.id,
  r.application_id,
  r.summary,
  r.strengths,
  r.weaknesses,
  r.insights,
  r.evidence,
  r.screening_answers,
  r.scores,
  r.recommendation,
  r.created_at,
  a.candidate_id,
  u.name AS candidate_name
FROM reports r
JOIN applications a ON a.id = r.application_id
JOIN interviews i ON i.application_id = a.id
JOIN users u ON u.id = a.candidate_id
WHERE i.batch_id = $1
  AND r.released_at IS NULL`;

export interface getHeldReportsForBatchArgs {
    batchId: string | null;
}

export interface getHeldReportsForBatchRow {
    id: string;
    applicationId: string;
    summary: string;
    strengths: any;
    weaknesses: any;
    insights: any;
    evidence: any;
    screeningAnswers: any;
    scores: any;
    recommendation: string;
    createdAt: Date;
    candidateId: string;
    candidateName: string;
}

export async function getHeldReportsForBatch(sql: Sql, args: getHeldReportsForBatchArgs): Promise<getHeldReportsForBatchRow[]> {
    return (await sql.unsafe(getHeldReportsForBatchQuery, [args.batchId]).values()).map(row => ({
        id: row[0],
        applicationId: row[1],
        summary: row[2],
        strengths: row[3],
        weaknesses: row[4],
        insights: row[5],
        evidence: row[6],
        screeningAnswers: row[7],
        scores: row[8],
        recommendation: row[9],
        createdAt: row[10],
        candidateId: row[11],
        candidateName: row[12]
    }));
}

export const releaseBatchReportsQuery = `-- name: releaseBatchReports :exec
UPDATE reports
SET released_at = now()
WHERE id IN (
  SELECT r.id
  FROM reports r
  JOIN applications a ON a.id = r.application_id
  JOIN interviews i ON i.application_id = a.id
  WHERE i.batch_id = $1
    AND r.released_at IS NULL
)`;

export interface releaseBatchReportsArgs {
    batchId: string | null;
}

export async function releaseBatchReports(sql: Sql, args: releaseBatchReportsArgs): Promise<void> {
    await sql.unsafe(releaseBatchReportsQuery, [args.batchId]);
}

export const releaseBatchApplicationsQuery = `-- name: releaseBatchApplications :exec
UPDATE applications
SET status = 'evaluated',
    updated_at = now()
WHERE id IN (
  SELECT a.id
  FROM applications a
  JOIN interviews i ON i.application_id = a.id
  WHERE i.batch_id = $1
    AND a.status = 'evaluated_held'
)`;

export interface releaseBatchApplicationsArgs {
    batchId: string | null;
}

export async function releaseBatchApplications(sql: Sql, args: releaseBatchApplicationsArgs): Promise<void> {
    await sql.unsafe(releaseBatchApplicationsQuery, [args.batchId]);
}

export const getReleasedReportsForJobQuery = `-- name: getReleasedReportsForJob :many
SELECT
  r.id,
  r.application_id,
  r.summary,
  r.strengths,
  r.weaknesses,
  r.insights,
  r.evidence,
  r.screening_answers,
  r.scores,
  r.recommendation,
  r.released_at,
  r.created_at,
  u.name AS candidate_name,
  u.picture AS candidate_picture
FROM reports r
JOIN applications a ON a.id = r.application_id
JOIN users u ON u.id = a.candidate_id
WHERE a.job_id = $1
  AND r.released_at IS NOT NULL
ORDER BY r.released_at DESC`;

export interface getReleasedReportsForJobArgs {
    jobId: string;
}

export interface getReleasedReportsForJobRow {
    id: string;
    applicationId: string;
    summary: string;
    strengths: any;
    weaknesses: any;
    insights: any;
    evidence: any;
    screeningAnswers: any;
    scores: any;
    recommendation: string;
    releasedAt: Date | null;
    createdAt: Date;
    candidateName: string;
    candidatePicture: string | null;
}

export async function getReleasedReportsForJob(sql: Sql, args: getReleasedReportsForJobArgs): Promise<getReleasedReportsForJobRow[]> {
    return (await sql.unsafe(getReleasedReportsForJobQuery, [args.jobId]).values()).map(row => ({
        id: row[0],
        applicationId: row[1],
        summary: row[2],
        strengths: row[3],
        weaknesses: row[4],
        insights: row[5],
        evidence: row[6],
        screeningAnswers: row[7],
        scores: row[8],
        recommendation: row[9],
        releasedAt: row[10],
        createdAt: row[11],
        candidateName: row[12],
        candidatePicture: row[13]
    }));
}

export const assignInterviewToBatchQuery = `-- name: assignInterviewToBatch :exec
UPDATE interviews
SET batch_id = $2,
    updated_at = now()
WHERE id = $1`;

export interface assignInterviewToBatchArgs {
    id: string;
    batchId: string | null;
}

export async function assignInterviewToBatch(sql: Sql, args: assignInterviewToBatchArgs): Promise<void> {
    await sql.unsafe(assignInterviewToBatchQuery, [args.id, args.batchId]);
}

export const getBatchInterviewsQuery = `-- name: getBatchInterviews :many
SELECT
  i.id,
  i.application_id,
  i.batch_id,
  i.type,
  i.status,
  i.invited_at,
  i.started_at,
  i.completed_at,
  i.expired_at,
  i.cancelled_at
FROM interviews i
WHERE i.batch_id = $1`;

export interface getBatchInterviewsArgs {
    batchId: string | null;
}

export interface getBatchInterviewsRow {
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
}

export async function getBatchInterviews(sql: Sql, args: getBatchInterviewsArgs): Promise<getBatchInterviewsRow[]> {
    return (await sql.unsafe(getBatchInterviewsQuery, [args.batchId]).values()).map(row => ({
        id: row[0],
        applicationId: row[1],
        batchId: row[2],
        type: row[3],
        status: row[4],
        invitedAt: row[5],
        startedAt: row[6],
        completedAt: row[7],
        expiredAt: row[8],
        cancelledAt: row[9]
    }));
}

export const getBatchDetailQuery = `-- name: getBatchDetail :one
SELECT
  jb.id,
  jb.job_id,
  jb.status,
  jb.target_size,
  jb.created_at,
  jb.launched_at,
  jb.released_at,
  j.title AS job_title,
  c.name AS company_name
FROM job_batches jb
JOIN jobs j ON j.id = jb.job_id
JOIN companies c ON c.id = j.company_id
WHERE jb.id = $1`;

export interface getBatchDetailArgs {
    id: string;
}

export interface getBatchDetailRow {
    id: string;
    jobId: string;
    status: string;
    targetSize: number;
    createdAt: Date;
    launchedAt: Date | null;
    releasedAt: Date | null;
    jobTitle: string;
    companyName: string;
}

export async function getBatchDetail(sql: Sql, args: getBatchDetailArgs): Promise<getBatchDetailRow | null> {
    const rows = await sql.unsafe(getBatchDetailQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        status: row[2],
        targetSize: row[3],
        createdAt: row[4],
        launchedAt: row[5],
        releasedAt: row[6],
        jobTitle: row[7],
        companyName: row[8]
    };
}

export const countReleasedReportsByJobQuery = `-- name: countReleasedReportsByJob :one
SELECT COUNT(*)::int AS count
FROM reports r
JOIN applications a ON a.id = r.application_id
WHERE a.job_id = $1 AND r.released_at IS NOT NULL`;

export interface countReleasedReportsByJobArgs {
    jobId: string;
}

export interface countReleasedReportsByJobRow {
    count: number;
}

export async function countReleasedReportsByJob(sql: Sql, args: countReleasedReportsByJobArgs): Promise<countReleasedReportsByJobRow | null> {
    const rows = await sql.unsafe(countReleasedReportsByJobQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        count: row[0]
    };
}

export const getBatchForUpdateQuery = `-- name: getBatchForUpdate :one
SELECT id, job_id, status
FROM job_batches
WHERE id = $1
FOR UPDATE`;

export interface getBatchForUpdateArgs {
    id: string;
}

export interface getBatchForUpdateRow {
    id: string;
    jobId: string;
    status: string;
}

export async function getBatchForUpdate(sql: Sql, args: getBatchForUpdateArgs): Promise<getBatchForUpdateRow | null> {
    const rows = await sql.unsafe(getBatchForUpdateQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        jobId: row[1],
        status: row[2]
    };
}

export const getCompanyOwnerForBatchQuery = `-- name: getCompanyOwnerForBatch :one
SELECT
  jb.id AS batch_id,
  jb.job_id,
  j.title AS job_title,
  c.id AS company_id,
  c.owner_id,
  u.email AS owner_email,
  u.name AS owner_name
FROM job_batches jb
JOIN jobs j ON j.id = jb.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id
WHERE jb.id = $1`;

export interface getCompanyOwnerForBatchArgs {
    id: string;
}

export interface getCompanyOwnerForBatchRow {
    batchId: string;
    jobId: string;
    jobTitle: string;
    companyId: string;
    ownerId: string;
    ownerEmail: string;
    ownerName: string;
}

export async function getCompanyOwnerForBatch(sql: Sql, args: getCompanyOwnerForBatchArgs): Promise<getCompanyOwnerForBatchRow | null> {
    const rows = await sql.unsafe(getCompanyOwnerForBatchQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        batchId: row[0],
        jobId: row[1],
        jobTitle: row[2],
        companyId: row[3],
        ownerId: row[4],
        ownerEmail: row[5],
        ownerName: row[6]
    };
}

export const getReportsByBatchIdQuery = `-- name: getReportsByBatchId :many
SELECT
  r.id,
  r.application_id,
  r.summary,
  r.scores,
  r.recommendation,
  r.released_at,
  r.created_at,
  a.candidate_id,
  a.status AS application_status,
  u.name AS candidate_name,
  u.picture AS candidate_picture
FROM reports r
JOIN applications a ON a.id = r.application_id
JOIN interviews i ON i.application_id = a.id
JOIN users u ON u.id = a.candidate_id
WHERE i.batch_id = $1
ORDER BY COALESCE((r.scores->>'overall')::numeric, 0) DESC`;

export interface getReportsByBatchIdArgs {
    batchId: string | null;
}

export interface getReportsByBatchIdRow {
    id: string;
    applicationId: string;
    summary: string;
    scores: any;
    recommendation: string;
    releasedAt: Date | null;
    createdAt: Date;
    candidateId: string;
    applicationStatus: string;
    candidateName: string;
    candidatePicture: string | null;
}

export async function getReportsByBatchId(sql: Sql, args: getReportsByBatchIdArgs): Promise<getReportsByBatchIdRow[]> {
    return (await sql.unsafe(getReportsByBatchIdQuery, [args.batchId]).values()).map(row => ({
        id: row[0],
        applicationId: row[1],
        summary: row[2],
        scores: row[3],
        recommendation: row[4],
        releasedAt: row[5],
        createdAt: row[6],
        candidateId: row[7],
        applicationStatus: row[8],
        candidateName: row[9],
        candidatePicture: row[10]
    }));
}

export const getInterviewsByBatchWithCandidateQuery = `-- name: getInterviewsByBatchWithCandidate :many
SELECT
  i.id AS interview_id,
  i.application_id,
  i.status AS interview_status,
  i.started_at,
  i.completed_at,
  i.expired_at,
  a.status AS application_status,
  a.candidate_id,
  u.name AS candidate_name,
  u.picture AS candidate_picture
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN users u ON u.id = a.candidate_id
WHERE i.batch_id = $1
ORDER BY i.invited_at ASC`;

export interface getInterviewsByBatchWithCandidateArgs {
    batchId: string | null;
}

export interface getInterviewsByBatchWithCandidateRow {
    interviewId: string;
    applicationId: string;
    interviewStatus: string;
    startedAt: Date | null;
    completedAt: Date | null;
    expiredAt: Date | null;
    applicationStatus: string;
    candidateId: string;
    candidateName: string;
    candidatePicture: string | null;
}

export async function getInterviewsByBatchWithCandidate(sql: Sql, args: getInterviewsByBatchWithCandidateArgs): Promise<getInterviewsByBatchWithCandidateRow[]> {
    return (await sql.unsafe(getInterviewsByBatchWithCandidateQuery, [args.batchId]).values()).map(row => ({
        interviewId: row[0],
        applicationId: row[1],
        interviewStatus: row[2],
        startedAt: row[3],
        completedAt: row[4],
        expiredAt: row[5],
        applicationStatus: row[6],
        candidateId: row[7],
        candidateName: row[8],
        candidatePicture: row[9]
    }));
}

