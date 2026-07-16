-- name: createBatch :one
INSERT INTO job_batches (job_id, status, target_size)
VALUES ($1, 'forming', $2)
RETURNING id, job_id, status, target_size, created_at, launched_at, released_at;

-- name: getActiveBatchForJob :one
SELECT id, job_id, status, target_size, created_at, launched_at, released_at
FROM job_batches
WHERE job_id = $1 AND status = 'active'
LIMIT 1;

-- name: getActiveBatchesByCompany :many
SELECT b.id, b.job_id, b.status, b.target_size, b.created_at, b.launched_at, b.released_at,
       j.title AS job_title
FROM job_batches b
JOIN jobs j ON j.id = b.job_id
WHERE j.company_id = $1 AND b.status = 'active'
ORDER BY b.launched_at DESC;

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

-- name: getJobsWithQueuedCandidates :many
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
  );

-- name: getBatchInviteNotificationDeliveries :many
SELECT n.id, n.type, n.payload, n.email_delivery_status, u.email
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN users u ON u.id = a.candidate_id
JOIN notifications n
  ON n.user_id = u.id
 AND n.type = 'interview_invited'
 AND n.dedupe_key = 'interview:' || i.id::text
WHERE i.batch_id = $1
ORDER BY i.invited_at ASC;

-- name: getBatchDigestNotificationDeliveries :many
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
WHERE b.id = sqlc.arg('batch_id')
GROUP BY n.id, n.email_delivery_status, u.email, j.title
ORDER BY n.id;

-- name: getPoolCandidatesForJob :many
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
ORDER BY pe.score DESC NULLS LAST, a.queued_at ASC;

-- name: claimQueuedApplication :one
UPDATE applications
SET status = 'interview_invited',
    queued_at = NULL,
    updated_at = now()
WHERE id = $1
  AND job_id = $2
  AND status = 'queued_for_batch'
RETURNING id, candidate_id;

-- name: getOldestQueuedAtForJob :one
SELECT min(queued_at) AS oldest_queued_at
FROM applications
WHERE job_id = $1
  AND status = 'queued_for_batch';

-- name: getJobCapacityForUpdate :one
SELECT id, title, final_report_target, status, archived_at, expires_at
FROM jobs
WHERE id = $1
FOR UPDATE;

-- name: getJobCapacityCounts :one
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
WHERE a.job_id = $1;

-- name: getJobReportProgress :one
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
WHERE a.job_id = $1;

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

-- name: assignInterviewToBatch :one
UPDATE interviews
SET batch_id = $2,
    updated_at = now()
WHERE id = $1
  AND batch_id IS NULL
RETURNING id;

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
