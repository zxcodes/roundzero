-- name: createJob :one
INSERT INTO jobs (
  company_id, title, description, requirements, interview_questions, status,
  location, workplace_type, employment_type, experience_level,
  salary_min, salary_max, salary_currency, team_size, headcount, expires_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
RETURNING *;

-- name: getJobsByCompanyId :many
SELECT *
FROM jobs
WHERE company_id = $1
  AND archived_at IS NULL
ORDER BY created_at DESC;

-- name: getJobsWithPipelineByCompanyId :many
SELECT j.*,
       count(a.id)::int AS total_applicants,
       count(a.id) FILTER (WHERE a.status = 'applied')::int AS applied_count,
       count(a.id) FILTER (WHERE a.status = 'interviewing')::int AS interviewing_count,
       count(a.id) FILTER (WHERE a.status = 'evaluated')::int AS evaluated_count,
       count(a.id) FILTER (WHERE a.status = 'rejected')::int AS rejected_count
FROM jobs j
LEFT JOIN applications a ON a.job_id = j.id
WHERE j.company_id = $1
  AND j.archived_at IS NULL
GROUP BY j.id
ORDER BY j.created_at DESC;

-- name: getJobById :one
SELECT j.*,
       c.name AS company_name,
       c.slug AS company_slug
FROM jobs j
JOIN companies c ON c.id = j.company_id
WHERE j.id = $1;

-- name: updateJob :one
UPDATE jobs
SET title = $1,
    description = $2,
    requirements = $3,
    interview_questions = $4,
    status = $5,
    location = $6,
    workplace_type = $7,
    employment_type = $8,
    experience_level = $9,
    salary_min = $10,
    salary_max = $11,
    salary_currency = $12,
    team_size = $13,
    headcount = $14,
    expires_at = $15,
    updated_at = now()
WHERE id = $16
  AND company_id = $17
RETURNING *;

-- name: closeExpiredJobs :execrows
UPDATE jobs
SET status = 'closed',
    updated_at = now()
WHERE status = 'open'
  AND archived_at IS NULL
  AND expires_at IS NOT NULL
  AND expires_at <= now();

-- name: archiveJob :one
UPDATE jobs
SET archived_at = now(),
    status = 'closed',
    updated_at = now()
WHERE id = $1
  AND company_id = $2
  AND archived_at IS NULL
RETURNING *;

-- name: getOpenJobs :many
SELECT j.*,
       c.name AS company_name,
       c.slug AS company_slug
FROM jobs j
JOIN companies c ON c.id = j.company_id
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
ORDER BY j.created_at DESC;

-- name: countJobsByCompanyAndStatus :one
SELECT
  count(*) FILTER (WHERE status = 'open')::int AS open_count,
  count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
  count(*)::int AS total_count
FROM jobs
WHERE company_id = $1
  AND archived_at IS NULL;

-- name: getArchivedJobsByCompanyId :many
SELECT *
FROM jobs
WHERE company_id = $1
  AND archived_at IS NOT NULL
ORDER BY archived_at DESC;

-- name: getOpenJobsByCompanyId :many
SELECT j.*,
       c.name AS company_name,
       c.slug AS company_slug
FROM jobs j
JOIN companies c ON c.id = j.company_id
WHERE j.company_id = $1
  AND j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
ORDER BY j.created_at DESC;

-- name: getOpenJobsPaginated :many
SELECT j.*,
       c.name AS company_name,
       c.slug AS company_slug
FROM jobs j
JOIN companies c ON c.id = j.company_id
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND (sqlc.arg('search')::text = '' OR j.title ILIKE '%' || sqlc.arg('search') || '%' OR c.name ILIKE '%' || sqlc.arg('search') || '%' OR j.location ILIKE '%' || sqlc.arg('search') || '%')
  AND (sqlc.arg('employment_type')::text = 'all' OR j.employment_type = sqlc.arg('employment_type'))
  AND (sqlc.arg('experience_level')::text = 'all' OR j.experience_level = sqlc.arg('experience_level'))
  AND (sqlc.arg('workplace_type')::text = 'all' OR j.workplace_type = sqlc.arg('workplace_type'))
  AND (sqlc.arg('salary_currency')::text = 'all' OR j.salary_currency = sqlc.arg('salary_currency'))
  AND (sqlc.arg('salary_min')::int = 0 OR j.salary_max IS NULL OR j.salary_max >= sqlc.arg('salary_min')::int)
ORDER BY j.created_at DESC
LIMIT sqlc.arg('limit')::int OFFSET sqlc.arg('offset')::int;

-- name: countOpenJobsFiltered :one
SELECT count(*)::int AS total
FROM jobs j
JOIN companies c ON c.id = j.company_id
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND (sqlc.arg('search')::text = '' OR j.title ILIKE '%' || sqlc.arg('search') || '%' OR c.name ILIKE '%' || sqlc.arg('search') || '%' OR j.location ILIKE '%' || sqlc.arg('search') || '%')
  AND (sqlc.arg('employment_type')::text = 'all' OR j.employment_type = sqlc.arg('employment_type'))
  AND (sqlc.arg('experience_level')::text = 'all' OR j.experience_level = sqlc.arg('experience_level'))
  AND (sqlc.arg('workplace_type')::text = 'all' OR j.workplace_type = sqlc.arg('workplace_type'))
  AND (sqlc.arg('salary_currency')::text = 'all' OR j.salary_currency = sqlc.arg('salary_currency'))
  AND (sqlc.arg('salary_min')::int = 0 OR j.salary_max IS NULL OR j.salary_max >= sqlc.arg('salary_min')::int);
