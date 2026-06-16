-- name: getActiveMembershipByUserId :one
SELECT id, company_id, user_id, role, status
FROM company_members
WHERE user_id = $1
  AND status = 'active';

-- name: getAnyMembershipByUserId :one
SELECT id, company_id, user_id, role, status
FROM company_members
WHERE user_id = $1
LIMIT 1;

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

-- name: getMembershipByCompanyAndUser :one
SELECT id, company_id, user_id, role, status
FROM company_members
WHERE company_id = $1
  AND user_id = $2;

-- name: reactivateCompanyMember :one
UPDATE company_members
SET role = $1,
    status = 'active',
    invited_by = $2,
    updated_at = now()
WHERE company_id = $3
  AND user_id = $4
  AND status = 'removed'
RETURNING id, company_id, user_id, role, status;

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
RETURNING id, user_id;

-- name: listCompanyNotificationRecipients :many
SELECT u.id AS user_id, u.email
FROM company_members cm
JOIN users u ON u.id = cm.user_id AND u.deleted_at IS NULL
WHERE cm.company_id = $1
  AND cm.status = 'active'
  AND cm.role IN ('owner', 'admin')
ORDER BY CASE cm.role WHEN 'owner' THEN 0 ELSE 1 END, cm.joined_at ASC;

-- name: updateCompanyMemberRole :one
UPDATE company_members
SET role = $1,
    updated_at = now()
WHERE id = $2
  AND company_id = $3
  AND status = 'active'
RETURNING id, user_id, role;

-- name: updateCompanyOwner :one
UPDATE companies
SET owner_id = $1,
    updated_at = now()
WHERE id = $2
RETURNING id, owner_id;

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
  AND revoked_at IS NULL
  AND expires_at > now();

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
  AND expires_at > now()
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

-- name: revokeExpiredInvitationsByEmail :exec
UPDATE company_invitations
SET revoked_at = now(),
    updated_at = now()
WHERE company_id = $1
  AND email = $2
  AND accepted_at IS NULL
  AND revoked_at IS NULL
  AND expires_at <= now();

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