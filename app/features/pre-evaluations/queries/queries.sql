-- name: createPreEvaluation :one
INSERT INTO pre_evaluations (application_id, score, missing_requirements, confidence, next_step, consistency_score, raw_response, model, prompt_version)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: getPreEvaluationByApplicationId :one
SELECT *
FROM pre_evaluations
WHERE application_id = $1;
