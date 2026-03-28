-- name: createJob :one
INSERT INTO jobs (company_id, title, description, requirements, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, company_id, title, description, requirements, status, created_at, updated_at;

-- name: getJobsByCompanyId :many
SELECT id, company_id, title, description, requirements, status, created_at, updated_at
FROM jobs
WHERE company_id = $1
ORDER BY created_at DESC;

-- name: getJobById :one
SELECT id, company_id, title, description, requirements, status, created_at, updated_at
FROM jobs
WHERE id = $1;

-- name: updateJob :one
UPDATE jobs
SET title = $1,
    description = $2,
    requirements = $3,
    status = $4,
    updated_at = now()
WHERE id = $5
  AND company_id = $6
RETURNING id, company_id, title, description, requirements, status, created_at, updated_at;

-- name: deleteJob :exec
DELETE FROM jobs
WHERE id = $1
  AND company_id = $2;

-- name: getOpenJobs :many
SELECT j.id, j.company_id, j.title, j.description, j.requirements, j.status, j.created_at, j.updated_at,
       c.name AS company_name
FROM jobs j
JOIN companies c ON c.id = j.company_id
WHERE j.status = 'open'
ORDER BY j.created_at DESC;
