-- name: upsertUserByGoogleId :one
INSERT INTO users (email, name, picture, google_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (google_id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      picture = EXCLUDED.picture,
      updated_at = now()
WHERE users.anonymized_at IS NULL
RETURNING id, email, name, picture, role, google_id, deleted_at, anonymized_at, created_at, updated_at;

-- name: getUserByGoogleId :one
SELECT id, email, name, picture, role, google_id, deleted_at, anonymized_at, created_at, updated_at
FROM users
WHERE google_id = $1;

-- name: getUserById :one
SELECT id, email, name, picture, role, google_id, deleted_at, created_at, updated_at
FROM users
WHERE id = $1 AND deleted_at IS NULL;

-- name: getUserByEmail :one
SELECT id, email, name, picture, role, google_id, deleted_at, created_at, updated_at
FROM users
WHERE lower(email) = lower(sqlc.arg('email'))
  AND deleted_at IS NULL;

-- name: setUserRole :one
UPDATE users
SET role = $1,
    updated_at = now()
WHERE id = $2
  AND role IS NULL
RETURNING id, email, name, picture, role, google_id, deleted_at, created_at, updated_at;

-- name: clearUserRole :one
UPDATE users
SET role = NULL,
    updated_at = now()
WHERE id = $1
RETURNING id, email, name, picture, role, google_id, deleted_at, created_at, updated_at;

-- name: updateUserName :one
UPDATE users
SET name = $1,
    updated_at = now()
WHERE id = $2
RETURNING id, email, name, picture, role, google_id, deleted_at, created_at, updated_at;

-- name: softDeleteUser :exec
UPDATE users
SET deleted_at = now(),
    updated_at = now()
WHERE id = $1 AND deleted_at IS NULL;

-- name: restoreUser :exec
-- Grace interval must match ACCOUNT_ERASURE_GRACE_DAYS in app/features/accounts/config.ts
UPDATE users
SET deleted_at = NULL,
    updated_at = now()
WHERE id = $1
  AND deleted_at IS NOT NULL
  AND deleted_at >= now() - interval '30 days'
  AND anonymized_at IS NULL;
