-- name: createJob :one
INSERT INTO jobs (
  company_id, title, description, requirements, status,
  location, workplace_type, employment_type, experience_level,
  salary_min, salary_max, salary_currency, team_size, headcount
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING *;

-- name: getJobsByCompanyId :many
SELECT *
FROM jobs
WHERE company_id = $1
  AND archived_at IS NULL
ORDER BY created_at DESC;

-- name: getJobById :one
SELECT j.*,
       c.name AS company_name
FROM jobs j
JOIN companies c ON c.id = j.company_id
WHERE j.id = $1;

-- name: updateJob :one
UPDATE jobs
SET title = $1,
    description = $2,
    requirements = $3,
    status = $4,
    location = $5,
    workplace_type = $6,
    employment_type = $7,
    experience_level = $8,
    salary_min = $9,
    salary_max = $10,
    salary_currency = $11,
    team_size = $12,
    headcount = $13,
    updated_at = now()
WHERE id = $14
  AND company_id = $15
RETURNING *;

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
       c.name AS company_name
FROM jobs j
JOIN companies c ON c.id = j.company_id
WHERE j.status = 'open'
  AND j.archived_at IS NULL
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
