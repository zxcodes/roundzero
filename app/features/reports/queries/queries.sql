-- name: createReport :one
INSERT INTO reports (interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, answer_authenticity, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
RETURNING id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, answer_authenticity, created_at;

-- name: getReportByApplicationId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, answer_authenticity, created_at
FROM reports
WHERE application_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: getReleasedReportByApplicationId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, answer_authenticity, created_at
FROM reports
WHERE application_id = $1
  AND released_at IS NOT NULL
ORDER BY released_at DESC, created_at DESC
LIMIT 1;

-- name: getReportByInterviewId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, answer_authenticity, created_at
FROM reports
WHERE interview_id = $1;

