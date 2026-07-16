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

export const getJobsWithQueuedCandidatesQuery = `-- name: getJobsWithQueuedCandidates :many
SELECT DISTINCT j.id
FROM jobs j
WHERE j.status = 'open'
  AND (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.job_id = j.id AND a.status = 'queued_for_batch'
    )
    OR EXISTS (
      SELECT 1 FROM job_batches b
      WHERE b.job_id = j.id AND b.status IN ('forming', 'active')
    )
  )`;

export interface getJobsWithQueuedCandidatesRow {
    id: string;
}

export async function getJobsWithQueuedCandidates(sql: Sql): Promise<getJobsWithQueuedCandidatesRow[]> {
    return (await sql.unsafe(getJobsWithQueuedCandidatesQuery, []).values()).map(row => ({
        id: row[0]
    }));
}

export const getBatchInviteNotificationDeliveriesQuery = `-- name: getBatchInviteNotificationDeliveries :many
SELECT n.id, n.type, n.payload, n.email_delivery_status, u.email
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN users u ON u.id = a.candidate_id
JOIN notifications n
  ON n.user_id = u.id
 AND n.type = 'interview_invited'
 AND n.dedupe_key = 'interview:' || i.id::text
WHERE i.batch_id = $1
ORDER BY i.invited_at ASC`;

export interface getBatchInviteNotificationDeliveriesArgs {
    batchId: string | null;
}

export interface getBatchInviteNotificationDeliveriesRow {
    id: string;
    type: string;
    payload: any;
    emailDeliveryStatus: string | null;
    email: string;
}

export async function getBatchInviteNotificationDeliveries(sql: Sql, args: getBatchInviteNotificationDeliveriesArgs): Promise<getBatchInviteNotificationDeliveriesRow[]> {
    return (await sql.unsafe(getBatchInviteNotificationDeliveriesQuery, [args.batchId]).values()).map(row => ({
        id: row[0],
        type: row[1],
        payload: row[2],
        emailDeliveryStatus: row[3],
        email: row[4]
    }));
}

export const getBatchDigestNotificationDeliveriesQuery = `-- name: getBatchDigestNotificationDeliveries :many
SELECT
  n.id AS notification_id,
  n.email_delivery_status,
  u.email,
  j.title AS job_title,
  count(DISTINCT r.id)::int AS report_count,
  max((r.scores->>'overall')::double precision)::double precision AS top_score,
  (array_agg(cu.name ORDER BY (r.scores->>'overall')::double precision DESC NULLS LAST))[1] AS top_candidate_name
FROM job_batches b
JOIN jobs j ON j.id = b.job_id
JOIN notifications n ON n.type = 'batch_ready' AND n.dedupe_key = 'batch:' || b.id::text
JOIN users u ON u.id = n.user_id
LEFT JOIN interviews i ON i.batch_id = b.id
LEFT JOIN reports r ON r.interview_id = i.id AND r.released_at IS NOT NULL
LEFT JOIN applications a ON a.id = r.application_id
LEFT JOIN users cu ON cu.id = a.candidate_id
WHERE b.id = $1
GROUP BY n.id, n.email_delivery_status, u.email, j.title
ORDER BY n.id`;

export interface getBatchDigestNotificationDeliveriesArgs {
    batchId: string;
}

export interface getBatchDigestNotificationDeliveriesRow {
    notificationId: string;
    emailDeliveryStatus: string | null;
    email: string;
    jobTitle: string;
    reportCount: number;
    topScore: number;
    topCandidateName: string | null;
}

export async function getBatchDigestNotificationDeliveries(sql: Sql, args: getBatchDigestNotificationDeliveriesArgs): Promise<getBatchDigestNotificationDeliveriesRow[]> {
    return (await sql.unsafe(getBatchDigestNotificationDeliveriesQuery, [args.batchId]).values()).map(row => ({
        notificationId: row[0],
        emailDeliveryStatus: row[1],
        email: row[2],
        jobTitle: row[3],
        reportCount: row[4],
        topScore: row[5],
        topCandidateName: row[6]
    }));
}

export const getPoolCandidatesForJobQuery = `-- name: getPoolCandidatesForJob :many
SELECT
  a.id,
  a.candidate_id,
  a.job_id,
  a.status,
  a.queued_at,
  a.created_at,
  pe.score AS pre_evaluation_score
FROM applications a
LEFT JOIN pre_evaluations pe ON pe.application_id = a.id
WHERE a.job_id = $1
  AND a.status = 'queued_for_batch'
ORDER BY pe.score DESC NULLS LAST, a.queued_at ASC`;

export interface getPoolCandidatesForJobArgs {
    jobId: string;
}

export interface getPoolCandidatesForJobRow {
    id: string;
    candidateId: string;
    jobId: string;
    status: string;
    queuedAt: Date | null;
    createdAt: Date;
    preEvaluationScore: number | null;
}

export async function getPoolCandidatesForJob(sql: Sql, args: getPoolCandidatesForJobArgs): Promise<getPoolCandidatesForJobRow[]> {
    return (await sql.unsafe(getPoolCandidatesForJobQuery, [args.jobId]).values()).map(row => ({
        id: row[0],
        candidateId: row[1],
        jobId: row[2],
        status: row[3],
        queuedAt: row[4],
        createdAt: row[5],
        preEvaluationScore: row[6]
    }));
}

export const claimQueuedApplicationQuery = `-- name: claimQueuedApplication :one
UPDATE applications
SET status = 'interview_invited',
    queued_at = NULL,
    updated_at = now()
WHERE id = $1
  AND job_id = $2
  AND status = 'queued_for_batch'
RETURNING id, candidate_id`;

export interface claimQueuedApplicationArgs {
    id: string;
    jobId: string;
}

export interface claimQueuedApplicationRow {
    id: string;
    candidateId: string;
}

export async function claimQueuedApplication(sql: Sql, args: claimQueuedApplicationArgs): Promise<claimQueuedApplicationRow | null> {
    const rows = await sql.unsafe(claimQueuedApplicationQuery, [args.id, args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        candidateId: row[1]
    };
}

export const getOldestQueuedAtForJobQuery = `-- name: getOldestQueuedAtForJob :one
SELECT min(queued_at) AS oldest_queued_at
FROM applications
WHERE job_id = $1
  AND status = 'queued_for_batch'`;

export interface getOldestQueuedAtForJobArgs {
    jobId: string;
}

export interface getOldestQueuedAtForJobRow {
    oldestQueuedAt: string;
}

export async function getOldestQueuedAtForJob(sql: Sql, args: getOldestQueuedAtForJobArgs): Promise<getOldestQueuedAtForJobRow | null> {
    const rows = await sql.unsafe(getOldestQueuedAtForJobQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        oldestQueuedAt: row[0]
    };
}

export const getJobCapacityForUpdateQuery = `-- name: getJobCapacityForUpdate :one
SELECT id, title, final_report_target, status, archived_at, expires_at
FROM jobs
WHERE id = $1
FOR UPDATE`;

export interface getJobCapacityForUpdateArgs {
    id: string;
}

export interface getJobCapacityForUpdateRow {
    id: string;
    title: string;
    finalReportTarget: number;
    status: string;
    archivedAt: Date | null;
    expiresAt: Date | null;
}

export async function getJobCapacityForUpdate(sql: Sql, args: getJobCapacityForUpdateArgs): Promise<getJobCapacityForUpdateRow | null> {
    const rows = await sql.unsafe(getJobCapacityForUpdateQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        title: row[1],
        finalReportTarget: row[2],
        status: row[3],
        archivedAt: row[4],
        expiresAt: row[5]
    };
}

export const getJobCapacityCountsQuery = `-- name: getJobCapacityCounts :one
SELECT
  count(DISTINCT a.id) FILTER (WHERE r.application_id IS NOT NULL)::int AS delivered_count,
  count(DISTINCT a.id) FILTER (
    WHERE r.application_id IS NULL
      AND i.status IN ('pending', 'in_progress', 'awaiting_voice', 'completed')
  )::int AS reserved_count
FROM applications a
LEFT JOIN interviews i ON i.application_id = a.id
LEFT JOIN (
  SELECT DISTINCT application_id
  FROM reports
  WHERE released_at IS NOT NULL
) r ON r.application_id = a.id
WHERE a.job_id = $1`;

export interface getJobCapacityCountsArgs {
    jobId: string;
}

export interface getJobCapacityCountsRow {
    deliveredCount: number;
    reservedCount: number;
}

export async function getJobCapacityCounts(sql: Sql, args: getJobCapacityCountsArgs): Promise<getJobCapacityCountsRow | null> {
    const rows = await sql.unsafe(getJobCapacityCountsQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        deliveredCount: row[0],
        reservedCount: row[1]
    };
}

export const getJobReportProgressQuery = `-- name: getJobReportProgress :one
SELECT
  count(DISTINCT a.id) FILTER (WHERE r.application_id IS NOT NULL)::int AS delivered_count,
  count(DISTINCT a.id) FILTER (
    WHERE r.application_id IS NULL AND i.status = 'completed'
  )::int AS processing_count,
  count(DISTINCT a.id) FILTER (
    WHERE r.application_id IS NULL AND i.status IN ('pending', 'in_progress', 'awaiting_voice')
  )::int AS underway_count,
  count(DISTINCT a.id) FILTER (WHERE a.status = 'queued_for_batch')::int AS waitlisted_count
FROM applications a
LEFT JOIN interviews i ON i.application_id = a.id
LEFT JOIN (
  SELECT DISTINCT application_id
  FROM reports
  WHERE released_at IS NOT NULL
) r ON r.application_id = a.id
WHERE a.job_id = $1`;

export interface getJobReportProgressArgs {
    jobId: string;
}

export interface getJobReportProgressRow {
    deliveredCount: number;
    processingCount: number;
    underwayCount: number;
    waitlistedCount: number;
}

export async function getJobReportProgress(sql: Sql, args: getJobReportProgressArgs): Promise<getJobReportProgressRow | null> {
    const rows = await sql.unsafe(getJobReportProgressQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        deliveredCount: row[0],
        processingCount: row[1],
        underwayCount: row[2],
        waitlistedCount: row[3]
    };
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

export const assignInterviewToBatchQuery = `-- name: assignInterviewToBatch :one
UPDATE interviews
SET batch_id = $2,
    updated_at = now()
WHERE id = $1
  AND batch_id IS NULL
RETURNING id`;

export interface assignInterviewToBatchArgs {
    id: string;
    batchId: string | null;
}

export interface assignInterviewToBatchRow {
    id: string;
}

export async function assignInterviewToBatch(sql: Sql, args: assignInterviewToBatchArgs): Promise<assignInterviewToBatchRow | null> {
    const rows = await sql.unsafe(assignInterviewToBatchQuery, [args.id, args.batchId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0]
    };
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

