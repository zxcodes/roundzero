-- name: getReportByApplicationId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, created_at
FROM reports
WHERE application_id = $1;

-- name: getReportById :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, created_at
FROM reports
WHERE id = $1;

-- name: getReportsByJobId :many
SELECT r.id, r.interview_id, r.application_id, r.summary, r.strengths, r.weaknesses, r.insights, r.evidence, r.screening_answers, r.scores, r.recommendation, r.created_at,
       a.job_id
FROM reports r
JOIN applications a ON a.id = r.application_id
WHERE a.job_id = $1
ORDER BY r.created_at DESC;
