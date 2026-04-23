-- name: createPreEvaluation :one
INSERT INTO pre_evaluations (application_id, score, missing_requirements, confidence, next_step)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: getPreEvaluationByApplicationId :one
SELECT *
FROM pre_evaluations
WHERE application_id = $1;
