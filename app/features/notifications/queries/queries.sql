-- name: createNotification :one
INSERT INTO notifications (user_id, type, payload)
VALUES ($1, $2, $3)
RETURNING id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at;

-- name: getNotificationsByUser :many
SELECT id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at
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
RETURNING id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at;

-- name: markAllNotificationsReadByUser :exec
UPDATE notifications
SET read_at = now()
WHERE user_id = $1
  AND read_at IS NULL;

-- name: markNotificationEmailDelivered :one
UPDATE notifications
SET email_delivery_status = 'sent',
    email_delivery_error = NULL,
    email_delivery_attempted_at = now(),
    email_delivery_sent_at = now(),
    email_provider_message_id = sqlc.arg('provider_message_id')
WHERE id = $1
RETURNING id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at;

-- name: markNotificationEmailFailed :one
UPDATE notifications
SET email_delivery_status = 'failed',
    email_delivery_error = sqlc.arg('error_message'),
    email_delivery_attempted_at = now(),
    email_delivery_sent_at = NULL,
    email_provider_message_id = NULL
WHERE id = $1
RETURNING id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at;

-- name: markNotificationEmailSkipped :one
UPDATE notifications
SET email_delivery_status = 'skipped',
    email_delivery_error = sqlc.arg('reason'),
    email_delivery_attempted_at = now(),
    email_delivery_sent_at = NULL,
    email_provider_message_id = NULL
WHERE id = $1
RETURNING id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at;
