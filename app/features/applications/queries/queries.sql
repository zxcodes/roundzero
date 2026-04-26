-- name: createApplication :one
INSERT INTO applications (job_id, candidate_id, resume_key, metadata, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, job_id, candidate_id, resume_key, metadata, status, created_at, updated_at;

-- name: getApplicationByJobAndCandidate :one
SELECT id, job_id, candidate_id, resume_key, metadata, status, created_at, updated_at
FROM applications
WHERE job_id = $1 AND candidate_id = $2;

-- name: getApplicationsByCandidate :many
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       j.title AS job_title, j.status AS job_status,
       c.name AS company_name,
       u.deleted_at IS NOT NULL AS company_owner_deleted,
       latest_interview.status AS interview_status
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id
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

-- name: getApplicationsByJob :many
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       u.name AS candidate_name, u.email AS candidate_email, u.picture AS candidate_picture,
       r.id AS report_id, r.recommendation AS report_recommendation, r.scores AS report_scores
FROM applications a
JOIN users u ON u.id = a.candidate_id AND u.deleted_at IS NULL
LEFT JOIN reports r ON r.application_id = a.id
WHERE a.job_id = $1
ORDER BY (r.id IS NOT NULL) DESC, COALESCE((r.scores->>'overall')::numeric, 0) DESC, a.created_at DESC;

-- name: getApplicationById :one
SELECT a.id, a.job_id, a.candidate_id, a.resume_key, a.metadata, a.status, a.created_at, a.updated_at,
       j.title AS job_title, j.status AS job_status,
       c.name AS company_name,
       u.deleted_at IS NOT NULL AS company_owner_deleted
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id
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
    updated_at = now()
WHERE id = $2
RETURNING id, job_id, candidate_id, resume_key, metadata, status, created_at, updated_at;

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
  count(*) FILTER (WHERE a.status = 'evaluated')::int AS evaluated_count
FROM applications a
JOIN jobs j ON j.id = a.job_id
WHERE a.candidate_id = $1
  AND j.archived_at IS NULL;
