-- name: getPolarWebhookReceipt :one
SELECT *
FROM polar_webhook_receipts
WHERE id = $1;

-- name: markPolarWebhookProcessing :one
INSERT INTO polar_webhook_receipts (
  id,
  event_type,
  event_timestamp,
  status
) VALUES (
  $1,
  $2,
  $3,
  'processing'
)
ON CONFLICT (id) DO UPDATE
SET event_type = EXCLUDED.event_type,
    event_timestamp = EXCLUDED.event_timestamp,
    status = 'processing',
    attempt_count = polar_webhook_receipts.attempt_count + 1,
    last_error = NULL,
    updated_at = now()
RETURNING *;

-- name: markPolarWebhookCompleted :one
UPDATE polar_webhook_receipts
SET status = 'completed',
    last_error = NULL,
    processed_at = now(),
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: markPolarWebhookFailed :one
INSERT INTO polar_webhook_receipts (
  id,
  event_type,
  event_timestamp,
  status,
  last_error
) VALUES (
  $1,
  $2,
  $3,
  'failed',
  $4
)
ON CONFLICT (id) DO UPDATE
SET event_type = EXCLUDED.event_type,
    event_timestamp = EXCLUDED.event_timestamp,
    status = 'failed',
    attempt_count = polar_webhook_receipts.attempt_count + 1,
    last_error = EXCLUDED.last_error,
    updated_at = now()
RETURNING *;
