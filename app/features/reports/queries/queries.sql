-- name: createReport :one
INSERT INTO reports (interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
RETURNING id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at;

-- name: getReportByApplicationId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at
FROM reports
WHERE application_id = $1;

-- name: getReportByInterviewId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at
FROM reports
WHERE interview_id = $1;


