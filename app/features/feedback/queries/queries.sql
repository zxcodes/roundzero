-- name: createFeedback :one
INSERT INTO feedback (
  user_id,
  role,
  type,
  message,
  company_id
)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: countFeedbackForPlatformAdmin :one
SELECT count(*)::int AS total
FROM feedback;

-- name: listFeedbackForPlatformAdmin :many
SELECT
  f.id,
  f.user_id,
  f.role,
  f.type,
  f.message,
  f.created_at,
  u.name AS user_name,
  u.email AS user_email,
  c.name AS company_name,
  c.slug AS company_slug
FROM feedback f
INNER JOIN users u ON u.id = f.user_id
LEFT JOIN companies c ON c.id = f.company_id
ORDER BY f.created_at DESC
LIMIT sqlc.arg('limit')::int
OFFSET sqlc.arg('offset')::int;