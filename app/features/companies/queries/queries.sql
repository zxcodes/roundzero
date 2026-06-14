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

-- name: getActiveMembershipByUserId :one
SELECT id, company_id, user_id, role, status
FROM company_members
WHERE user_id = $1
  AND status = 'active';

-- name: getCompanyByMemberUserId :one
SELECT c.*
FROM company_members cm
JOIN companies c ON c.id = cm.company_id
WHERE cm.user_id = $1
  AND cm.status = 'active';

-- name: createCompanyMember :one
INSERT INTO company_members (company_id, user_id, role, status, invited_by)
VALUES ($1, $2, $3, 'active', $4)
RETURNING *;

-- name: getMembershipById :one
SELECT id, company_id, user_id, role, status
FROM company_members
WHERE id = $1;

-- name: listActiveMembersByCompany :many
SELECT cm.id, cm.role, cm.status, cm.joined_at,
       u.id AS user_id, u.name AS user_name, u.email AS user_email, u.picture AS user_picture
FROM company_members cm
JOIN users u ON u.id = cm.user_id
WHERE cm.company_id = $1
  AND cm.status = 'active'
ORDER BY
  CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
  cm.joined_at ASC;

-- name: removeCompanyMember :one
UPDATE company_members
SET status = 'removed',
    updated_at = now()
WHERE id = $1
  AND company_id = $2
  AND role <> 'owner'
RETURNING id;

-- name: createInvitation :one
INSERT INTO company_invitations (company_id, email, role, token, invited_by, expires_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: getPendingInvitationByEmail :one
SELECT id
FROM company_invitations
WHERE company_id = $1
  AND email = $2
  AND accepted_at IS NULL
  AND revoked_at IS NULL;

-- name: getActiveMemberByCompanyEmail :one
SELECT cm.id
FROM company_members cm
JOIN users u ON u.id = cm.user_id
WHERE cm.company_id = $1
  AND cm.status = 'active'
  AND lower(u.email) = $2;

-- name: getInvitationByToken :one
SELECT i.id, i.company_id, i.email, i.role, i.token, i.expires_at,
       i.accepted_at, i.revoked_at, i.invited_by,
       c.name AS company_name
FROM company_invitations i
JOIN companies c ON c.id = i.company_id
WHERE i.token = $1;

-- name: listPendingInvitationsByCompany :many
SELECT id, email, role, expires_at, created_at
FROM company_invitations
WHERE company_id = $1
  AND accepted_at IS NULL
  AND revoked_at IS NULL
ORDER BY created_at DESC;

-- name: revokeInvitation :one
UPDATE company_invitations
SET revoked_at = now(),
    updated_at = now()
WHERE id = $1
  AND company_id = $2
  AND accepted_at IS NULL
  AND revoked_at IS NULL
RETURNING id;

-- name: resetInvitationForResend :one
UPDATE company_invitations
SET token = $3,
    expires_at = $4,
    updated_at = now()
WHERE id = $1
  AND company_id = $2
  AND accepted_at IS NULL
  AND revoked_at IS NULL
RETURNING id, email, role, token;

-- name: markInvitationAccepted :one
UPDATE company_invitations
SET accepted_at = now(),
    updated_at = now()
WHERE id = $1
  AND accepted_at IS NULL
  AND revoked_at IS NULL
RETURNING id;

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
