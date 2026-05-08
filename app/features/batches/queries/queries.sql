-- name: createBatch :one
INSERT INTO job_batches (job_id, status, target_size)
VALUES ($1, 'forming', $2)
RETURNING id, job_id, status, target_size, created_at, launched_at, released_at;

-- name: getBatchById :one
SELECT id, job_id, status, target_size, created_at, launched_at, released_at
FROM job_batches
WHERE id = $1;

-- name: getActiveBatchForJob :one
SELECT id, job_id, status, target_size, created_at, launched_at, released_at
FROM job_batches
WHERE job_id = $1 AND status = 'active'
LIMIT 1;

-- name: getFormingBatchForJob :one
SELECT id, job_id, status, target_size, created_at, launched_at, released_at
FROM job_batches
WHERE job_id = $1 AND status IN ('forming', 'active')
LIMIT 1;

-- name: updateBatchStatus :one
UPDATE job_batches
SET status = $2,
    launched_at = CASE WHEN $2 = 'active' THEN COALESCE(launched_at, now()) ELSE launched_at END,
    released_at = CASE WHEN $2 = 'released' THEN COALESCE(released_at, now()) ELSE released_at END
WHERE id = $1
RETURNING id, job_id, status, target_size, created_at, launched_at, released_at;

-- name: getBatchesForJob :many
SELECT id, job_id, status, target_size, created_at, launched_at, released_at
FROM job_batches
WHERE job_id = $1
ORDER BY created_at DESC;

-- name: getBatchProgress :one
SELECT
  COUNT(*) FILTER (WHERE i.status IN ('completed', 'expired', 'cancelled'))::int AS resolved_count,
  COUNT(*)::int AS total_count
FROM interviews i
WHERE i.batch_id = $1;

-- name: getPoolCandidatesForJob :many
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
ORDER BY pe.score DESC NULLS LAST, a.created_at ASC;

-- name: addApplicationToPool :exec
UPDATE applications
SET status = 'queued_for_batch',
    updated_at = now()
WHERE id = $1;

-- name: launchBatchInterviews :exec
UPDATE interviews
SET status = 'pending',
    invited_at = now()
WHERE batch_id = $1;

-- name: getHeldReportsForBatch :many
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
  AND r.released_at IS NULL;

-- name: releaseBatchReports :exec
UPDATE reports
SET released_at = now()
WHERE id IN (
  SELECT r.id
  FROM reports r
  JOIN applications a ON a.id = r.application_id
  JOIN interviews i ON i.application_id = a.id
  WHERE i.batch_id = $1
    AND r.released_at IS NULL
);

-- name: releaseBatchApplications :exec
UPDATE applications
SET status = 'evaluated',
    updated_at = now()
WHERE id IN (
  SELECT a.id
  FROM applications a
  JOIN interviews i ON i.application_id = a.id
  WHERE i.batch_id = $1
    AND a.status = 'evaluated_held'
);

-- name: getReleasedReportsForJob :many
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
ORDER BY r.released_at DESC;

-- name: assignInterviewToBatch :exec
UPDATE interviews
SET batch_id = $2,
    updated_at = now()
WHERE id = $1;

-- name: getBatchInterviews :many
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
WHERE i.batch_id = $1;

-- name: getBatchDetail :one
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
WHERE jb.id = $1;

-- name: countReleasedReportsByJob :one
SELECT COUNT(*)::int AS count
FROM reports r
JOIN applications a ON a.id = r.application_id
WHERE a.job_id = $1 AND r.released_at IS NOT NULL;

-- name: getBatchForUpdate :one
SELECT id, job_id, status
FROM job_batches
WHERE id = $1
FOR UPDATE;

-- name: getCompanyOwnerForBatch :one
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
WHERE jb.id = $1;

-- name: getReportsByBatchId :many
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
ORDER BY COALESCE((r.scores->>'overall')::numeric, 0) DESC;

-- name: getInterviewsByBatchWithCandidate :many
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
ORDER BY i.invited_at ASC;
