-- name: createCompany :one
INSERT INTO companies (owner_id, name, description)
VALUES ($1, $2, $3)
RETURNING id, owner_id, name, description, created_at;

-- name: getCompanyByOwnerId :one
SELECT id, owner_id, name, description, created_at
FROM companies
WHERE owner_id = $1;

-- name: getCompanyById :one
SELECT id, owner_id, name, description, created_at
FROM companies
WHERE id = $1;

-- name: updateCompany :one
UPDATE companies
SET name = $1,
    description = $2
WHERE id = $3
  AND owner_id = $4
RETURNING id, owner_id, name, description, created_at;
