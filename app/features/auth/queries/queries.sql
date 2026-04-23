-- name: upsertUserByGoogleId :one
INSERT INTO users (email, name, picture, google_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (google_id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      picture = EXCLUDED.picture,
      updated_at = now()
RETURNING id, email, name, picture, role, google_id, deleted_at, created_at, updated_at;

-- name: getUserById :one
SELECT id, email, name, picture, role, google_id, deleted_at, created_at, updated_at
FROM users
WHERE id = $1 AND deleted_at IS NULL;

-- name: setUserRole :one
UPDATE users
SET role = $1,
    updated_at = now()
WHERE id = $2
  AND role IS NULL
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
UPDATE users
SET deleted_at = NULL,
    updated_at = now()
WHERE id = $1 AND deleted_at IS NOT NULL;
