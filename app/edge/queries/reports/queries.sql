-- name: createReport :one
INSERT INTO reports (interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: getReportByInterviewId :one
SELECT *
FROM reports
WHERE interview_id = $1;
