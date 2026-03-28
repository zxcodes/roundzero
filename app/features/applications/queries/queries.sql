-- name: createApplication :one
INSERT INTO applications (job_id, candidate_id, resume_url, links)
VALUES ($1, $2, $3, $4)
RETURNING id, job_id, candidate_id, resume_url, links, status, created_at;

-- name: getApplicationByJobAndCandidate :one
SELECT id, job_id, candidate_id, resume_url, links, status, created_at
FROM applications
WHERE job_id = $1 AND candidate_id = $2;

-- name: getApplicationsByCandidate :many
SELECT a.id, a.job_id, a.candidate_id, a.resume_url, a.links, a.status, a.created_at,
       j.title AS job_title, j.status AS job_status,
       c.name AS company_name
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE a.candidate_id = $1
ORDER BY a.created_at DESC;

-- name: getApplicationsByJob :many
SELECT a.id, a.job_id, a.candidate_id, a.resume_url, a.links, a.status, a.created_at,
       u.name AS candidate_name, u.email AS candidate_email, u.picture AS candidate_picture
FROM applications a
JOIN users u ON u.id = a.candidate_id
WHERE a.job_id = $1
ORDER BY a.created_at DESC;

-- name: getApplicationById :one
SELECT a.id, a.job_id, a.candidate_id, a.resume_url, a.links, a.status, a.created_at,
       j.title AS job_title, j.status AS job_status,
       c.name AS company_name
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE a.id = $1;

-- name: updateApplicationStatus :one
UPDATE applications
SET status = $1
WHERE id = $2
RETURNING id, job_id, candidate_id, resume_url, links, status, created_at;

-- name: getApplicationCountByJob :one
SELECT count(*)::int AS count
FROM applications
WHERE job_id = $1;
