-- name: createApplication :one
INSERT INTO applications (job_id, candidate_id, resume_key, metadata, status, queued_at)
VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 = 'queued_for_batch' THEN now() ELSE NULL END)
RETURNING id, job_id, candidate_id, resume_key, metadata, status, queued_at, created_at, updated_at;

-- name: getApplicationByJobAndCandidate :one
SELECT id, job_id, candidate_id, resume_key, metadata, status, created_at, updated_at
FROM applications
WHERE job_id = $1 AND candidate_id = $2;

-- name: getApplicationsByCandidate :many
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       j.title AS job_title, j.status AS job_status,
       c.name AS company_name,
       u.deleted_at IS NOT NULL AS company_owner_deleted,
       latest_interview.status AS interview_status,
       pe.next_step AS pre_evaluation_next_step
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id
LEFT JOIN pre_evaluations pe ON pe.application_id = a.id
LEFT JOIN LATERAL (
  SELECT i.status
  FROM interviews i
  WHERE i.application_id = a.id
  ORDER BY i.updated_at DESC
  LIMIT 1
) latest_interview ON TRUE
WHERE a.candidate_id = $1
  AND j.archived_at IS NULL
ORDER BY a.created_at DESC;

-- name: getRecentApplicationsByCandidate :many
-- Returns the most recently *updated* applications (by a.updated_at) for the
-- candidate dashboard "Recent activity" section. Limited at DB level.
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       j.title AS job_title, j.status AS job_status,
       c.name AS company_name,
       u.deleted_at IS NOT NULL AS company_owner_deleted,
       latest_interview.status AS interview_status,
       pe.next_step AS pre_evaluation_next_step
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id
LEFT JOIN pre_evaluations pe ON pe.application_id = a.id
LEFT JOIN LATERAL (
  SELECT i.status
  FROM interviews i
  WHERE i.application_id = a.id
  ORDER BY i.updated_at DESC
  LIMIT 1
) latest_interview ON TRUE
WHERE a.candidate_id = $1
  AND j.archived_at IS NULL
ORDER BY a.updated_at DESC
LIMIT 3;

-- name: getApplicationsByJob :many
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       u.name AS candidate_name, u.email AS candidate_email, u.picture AS candidate_picture,
       latest_released_report.id AS report_id,
       latest_released_report.recommendation AS report_recommendation,
       latest_released_report.scores AS report_scores,
       latest_released_report.released_at AS report_released_at,
       pe.score AS pre_evaluation_score
FROM applications a
JOIN users u ON u.id = a.candidate_id AND u.deleted_at IS NULL
LEFT JOIN LATERAL (
  SELECT r.id, r.recommendation, r.scores, r.released_at
  FROM reports r
  WHERE r.application_id = a.id
    AND r.released_at IS NOT NULL
  ORDER BY r.released_at DESC, r.created_at DESC
  LIMIT 1
) latest_released_report ON TRUE
LEFT JOIN pre_evaluations pe ON pe.application_id = a.id
WHERE a.job_id = $1
ORDER BY (latest_released_report.released_at IS NOT NULL) DESC, COALESCE((latest_released_report.scores->>'overall')::numeric, 0) DESC, a.created_at DESC;

-- name: getApplicationById :one
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       j.title AS job_title, j.status AS job_status,
       c.name AS company_name,
       u.deleted_at IS NOT NULL AS company_owner_deleted,
       pe.next_step AS pre_evaluation_next_step
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id
LEFT JOIN pre_evaluations pe ON pe.application_id = a.id
WHERE a.id = $1;

-- name: getApplicationReviewById :one
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       j.title AS job_title, j.status AS job_status, j.company_id,
       c.name AS company_name, c.slug AS company_slug,
       u.name AS candidate_name, u.email AS candidate_email, u.picture AS candidate_picture
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = a.candidate_id AND u.deleted_at IS NULL
WHERE a.id = $1;

-- name: updateApplicationStatus :one
UPDATE applications
SET status = $1,
    queued_at = CASE
      WHEN $1 = 'queued_for_batch' THEN COALESCE(queued_at, now())
      ELSE NULL
    END,
    updated_at = now()
WHERE id = $2
RETURNING id, job_id, candidate_id, resume_key, metadata, status, queued_at, created_at, updated_at;

-- name: updateApplicationStatusIfCurrent :one
UPDATE applications
SET status = sqlc.arg('status')::text,
    queued_at = CASE
      WHEN sqlc.arg('status')::text = 'queued_for_batch' THEN COALESCE(queued_at, now())
      ELSE NULL
    END,
    updated_at = now()
WHERE id = sqlc.arg('id')
  AND status = sqlc.arg('current_status')::text
RETURNING id, job_id, candidate_id, resume_key, metadata, status, queued_at, created_at, updated_at;

-- name: setShortlistDetails :one
-- Writes (or overwrites) metadata.shortlist and optionally flips the status to
-- 'shortlisted'. The status arg is NULL on edits of an already-shortlisted app.
UPDATE applications
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('shortlist', sqlc.arg('shortlist')::jsonb),
    status = COALESCE(sqlc.narg('status')::text, status),
    queued_at = CASE
      WHEN COALESCE(sqlc.narg('status')::text, status) = 'queued_for_batch' THEN COALESCE(queued_at, now())
      ELSE NULL
    END,
    updated_at = now()
WHERE id = sqlc.arg('id')
RETURNING id, job_id, candidate_id, resume_key, metadata, status, created_at, updated_at;

-- name: getShortlistedApplicantsByCompany :many
-- Every shortlisted application across all of a company's active jobs, with the
-- candidate contact details, job grouping, and latest released report score.
-- Ordered by job, then score desc, for the cross-role "shortlisted" view.
SELECT a.id, a.job_id, a.candidate_id, a.metadata, a.status, a.updated_at,
       j.title AS job_title,
       u.name AS candidate_name, u.email AS candidate_email, u.picture AS candidate_picture,
       latest_released_report.recommendation AS report_recommendation,
       latest_released_report.scores AS report_scores
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = a.candidate_id AND u.deleted_at IS NULL
LEFT JOIN LATERAL (
  SELECT r.recommendation, r.scores
  FROM reports r
  WHERE r.application_id = a.id
    AND r.released_at IS NOT NULL
  ORDER BY r.released_at DESC, r.created_at DESC
  LIMIT 1
) latest_released_report ON TRUE
WHERE c.id = $1
  AND a.status = 'shortlisted'
  AND j.archived_at IS NULL
ORDER BY j.title ASC, COALESCE((latest_released_report.scores->>'overall')::numeric, 0) DESC, a.updated_at DESC;

-- name: getApplicationCountByJob :one
SELECT count(*)::int AS count
FROM applications
WHERE job_id = $1;

-- name: countApplicationsByCompany :one
SELECT count(*)::int AS total_count
FROM applications a
JOIN jobs j ON j.id = a.job_id
WHERE j.company_id = $1
  AND j.archived_at IS NULL;

-- name: countApplicationsByCandidate :one
SELECT
  count(*)::int AS total_count,
  count(*) FILTER (WHERE a.status NOT IN ('rejected', 'withdrawn'))::int AS active_count,
  count(*) FILTER (WHERE a.status = 'interview_invited')::int AS interview_invited_count,
  count(*) FILTER (WHERE a.status = 'interview_in_progress')::int AS interview_in_progress_count,
  count(*) FILTER (WHERE a.status IN ('evaluated', 'evaluated_held'))::int AS evaluated_count
FROM applications a
JOIN jobs j ON j.id = a.job_id
WHERE a.candidate_id = $1
  AND j.archived_at IS NULL;

-- name: claimApplicationForRetry :one
-- Atomic claim used by the AI-eval retry path (cron sweep + manual retry).
-- The row is only updated when the application is still in `evaluation_failed`
-- AND the per-application retry counter is below the supplied cap (cap NULL =
-- uncapped, used by manual retries). Returning zero rows means another claim
-- has already won the race or the cap was hit.
UPDATE applications
SET status = sqlc.arg('nextStatus')::text,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'evalRetryCount', COALESCE((metadata->>'evalRetryCount')::int, 0) + 1,
      'evalLastRetryAt', to_jsonb(now()),
      'evalLastRetryKind', sqlc.arg('retryKind')::text,
      'evalLastRetrySource', sqlc.arg('retrySource')::text
    ),
    updated_at = now()
WHERE id = sqlc.arg('id')
  AND status = 'evaluation_failed'
  AND (
    sqlc.narg('cap')::int IS NULL
    OR COALESCE((metadata->>'evalRetryCount')::int, 0) < sqlc.narg('cap')::int
  )
RETURNING id, job_id, candidate_id, resume_key, metadata, status, created_at, updated_at;

-- name: listStaleEvaluationFailedApplications :many
-- Used by the scheduled handler to pick up applications that have been sitting
-- in `evaluation_failed` past the cool-down window and have not yet exhausted
-- the auto-retry cap. The cool-down is encoded in the query rather than passed
-- in because there is no caller that needs a different value.
SELECT id
FROM applications
WHERE status = 'evaluation_failed'
  AND updated_at < NOW() - INTERVAL '15 minutes'
  AND COALESCE((metadata->>'evalRetryCount')::int, 0) < sqlc.arg('cap')::int
ORDER BY updated_at ASC
LIMIT sqlc.arg('rowLimit')::int;
