-- name: createNotification :one
INSERT INTO notifications (user_id, type, payload)
VALUES ($1, $2, $3)
RETURNING id, user_id, type, payload, read_at, created_at;

-- name: getNotificationsByUser :many
SELECT id, user_id, type, payload, read_at, created_at
FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2;

-- name: countUnreadNotificationsByUser :one
SELECT count(*)::int AS unread_count
FROM notifications
WHERE user_id = $1
  AND read_at IS NULL;

-- name: markNotificationReadByUser :one
UPDATE notifications
SET read_at = COALESCE(read_at, now())
WHERE id = $1
  AND user_id = $2
RETURNING id, user_id, type, payload, read_at, created_at;

-- name: markAllNotificationsReadByUser :exec
UPDATE notifications
SET read_at = now()
WHERE user_id = $1
  AND read_at IS NULL;
