-- name: createReport :one
INSERT INTO reports (interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
RETURNING id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at;

-- name: getReportByApplicationId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at
FROM reports
WHERE application_id = $1;

-- name: getReportById :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at
FROM reports
WHERE id = $1;

-- name: getReportByInterviewId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at
FROM reports
WHERE interview_id = $1;

-- name: getReportsByJobId :many
SELECT r.id, r.interview_id, r.application_id, r.summary, r.strengths, r.weaknesses, r.insights, r.evidence, r.screening_answers, r.scores, r.recommendation, r.model, r.prompt_version, r.refine_version, r.created_at,
       a.job_id
FROM reports r
JOIN applications a ON a.id = r.application_id
WHERE a.job_id = $1
ORDER BY r.created_at DESC;
