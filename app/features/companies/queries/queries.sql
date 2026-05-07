-- name: createCompany :one
INSERT INTO companies (
  owner_id,
  name,
  slug,
  description,
  logo_key,
  industry,
  company_size,
  onboarding_completed_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, now())
RETURNING *;

-- name: getCompanyByOwnerId :one
SELECT *
FROM companies
WHERE owner_id = $1;

-- name: getCompanyById :one
SELECT *
FROM companies
WHERE id = $1;

-- name: getCompanyBySlug :one
SELECT c.*,
       u.name AS owner_name,
       u.picture AS owner_picture
FROM companies c
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE c.slug = $1;

-- name: updateCompanyProfile :one
UPDATE companies
SET name = $1,
    description = $2,
    logo_key = $3,
    website = $4,
    industry = $5,
    company_size = $6,
    founded_year = $7,
    location = $8,
    tech_stack = $9,
    culture = $10,
    social_links = $11,
    updated_at = now()
WHERE id = $12
  AND owner_id = $13
RETURNING *;

-- name: updateCompanyLogoByOwnerId :one
UPDATE companies
SET logo_key = $1,
    updated_at = now()
WHERE owner_id = $2
RETURNING *;

-- name: getAllCompanies :many
SELECT c.*,
       (SELECT count(*)::int FROM jobs j WHERE j.company_id = c.id AND j.status = 'open' AND j.archived_at IS NULL) AS open_job_count
FROM companies c
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
ORDER BY c.created_at DESC;

-- name: getAllCompaniesPaginated :many
SELECT c.*,
       (SELECT count(*)::int FROM jobs j WHERE j.company_id = c.id AND j.status = 'open' AND j.archived_at IS NULL) AS open_job_count
FROM companies c
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE (sqlc.arg('search')::text = '' OR c.name ILIKE '%' || sqlc.arg('search') || '%' OR c.description ILIKE '%' || sqlc.arg('search') || '%')
  AND (sqlc.arg('industry')::text = 'all' OR c.industry = sqlc.arg('industry'))
  AND (sqlc.arg('company_size')::text = 'all' OR c.company_size = sqlc.arg('company_size'))
ORDER BY c.created_at DESC
LIMIT sqlc.arg('limit')::int OFFSET sqlc.arg('offset')::int;

-- name: countCompaniesFiltered :one
SELECT count(*)::int AS total
FROM companies c
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE (sqlc.arg('search')::text = '' OR c.name ILIKE '%' || sqlc.arg('search') || '%' OR c.description ILIKE '%' || sqlc.arg('search') || '%')
  AND (sqlc.arg('industry')::text = 'all' OR c.industry = sqlc.arg('industry'))
  AND (sqlc.arg('company_size')::text = 'all' OR c.company_size = sqlc.arg('company_size'));

-- name: slugExists :one
SELECT EXISTS(SELECT 1 FROM companies WHERE slug = $1) AS exists;

-- name: getCompanyByPolarCustomerId :one
SELECT *
FROM companies
WHERE polar_customer_id = $1;

-- name: setCompanyPolarCustomer :one
UPDATE companies
SET polar_customer_id = $1,
    updated_at = now()
WHERE id = $2
RETURNING *;

-- name: updateCompanySubscription :one
UPDATE companies
SET polar_subscription_id = $1,
    polar_product_id = $2,
    subscription_plan = $3,
    subscription_status = $4,
    subscription_current_period_end = $5,
    subscription_cancel_at_period_end = $6,
    updated_at = now()
WHERE polar_customer_id = $7
RETURNING *;

-- name: clearCompanySubscription :one
UPDATE companies
SET polar_subscription_id = NULL,
    polar_product_id = NULL,
    subscription_plan = 'free',
    subscription_status = 'canceled',
    subscription_current_period_end = NULL,
    subscription_cancel_at_period_end = false,
    updated_at = now()
WHERE polar_customer_id = $1
RETURNING *;
