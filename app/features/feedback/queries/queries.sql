-- name: createFeedback :one
INSERT INTO feedback (
  user_id,
  role,
  type,
  message
)
VALUES ($1, $2, $3, $4)
RETURNING *;
