-- name: createInterview :one
INSERT INTO interviews (application_id, agent_id, type, metadata, status, started_at, completed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: getInterviewByApplicationId :one
SELECT *
FROM interviews
WHERE application_id = $1;

-- name: countInterviewSlotsUsedByJob :one
SELECT count(*)::int AS count
FROM interviews i
JOIN applications a ON a.id = i.application_id
WHERE a.job_id = $1;
