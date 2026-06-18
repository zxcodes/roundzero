import { Sql } from "postgres";

export const getActiveMembershipByUserIdQuery = `-- name: getActiveMembershipByUserId :one
SELECT id, company_id, user_id, role, status
FROM company_members
WHERE user_id = $1
  AND status = 'active'`;

export interface getActiveMembershipByUserIdArgs {
    userId: string;
}

export interface getActiveMembershipByUserIdRow {
    id: string;
    companyId: string;
    userId: string;
    role: string;
    status: string;
}

export async function getActiveMembershipByUserId(sql: Sql, args: getActiveMembershipByUserIdArgs): Promise<getActiveMembershipByUserIdRow | null> {
    const rows = await sql.unsafe(getActiveMembershipByUserIdQuery, [args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        userId: row[2],
        role: row[3],
        status: row[4]
    };
}

export const getAnyMembershipByUserIdQuery = `-- name: getAnyMembershipByUserId :one
SELECT id, company_id, user_id, role, status
FROM company_members
WHERE user_id = $1
LIMIT 1`;

export interface getAnyMembershipByUserIdArgs {
    userId: string;
}

export interface getAnyMembershipByUserIdRow {
    id: string;
    companyId: string;
    userId: string;
    role: string;
    status: string;
}

export async function getAnyMembershipByUserId(sql: Sql, args: getAnyMembershipByUserIdArgs): Promise<getAnyMembershipByUserIdRow | null> {
    const rows = await sql.unsafe(getAnyMembershipByUserIdQuery, [args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        userId: row[2],
        role: row[3],
        status: row[4]
    };
}

export const getCompanyByMemberUserIdQuery = `-- name: getCompanyByMemberUserId :one
SELECT c.id, c.owner_id, c.name, c.slug, c.onboarding_completed_at, c.description, c.logo_key, c.website, c.industry, c.company_size, c.founded_year, c.location, c.tech_stack, c.culture, c.social_links, c.polar_customer_id, c.polar_subscription_id, c.polar_product_id, c.subscription_plan, c.subscription_status, c.subscription_current_period_end, c.subscription_cancel_at_period_end, c.created_at, c.updated_at
FROM company_members cm
JOIN companies c ON c.id = cm.company_id
WHERE cm.user_id = $1
  AND cm.status = 'active'`;

export interface getCompanyByMemberUserIdArgs {
    userId: string;
}

export interface getCompanyByMemberUserIdRow {
    id: string;
    ownerId: string;
    name: string;
    slug: string;
    onboardingCompletedAt: Date | null;
    description: string | null;
    logoKey: string | null;
    website: string | null;
    industry: string | null;
    companySize: string | null;
    foundedYear: number | null;
    location: string | null;
    techStack: any | null;
    culture: string | null;
    socialLinks: any | null;
    polarCustomerId: string | null;
    polarSubscriptionId: string | null;
    polarProductId: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionCurrentPeriodEnd: Date | null;
    subscriptionCancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export async function getCompanyByMemberUserId(sql: Sql, args: getCompanyByMemberUserIdArgs): Promise<getCompanyByMemberUserIdRow | null> {
    const rows = await sql.unsafe(getCompanyByMemberUserIdQuery, [args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        ownerId: row[1],
        name: row[2],
        slug: row[3],
        onboardingCompletedAt: row[4],
        description: row[5],
        logoKey: row[6],
        website: row[7],
        industry: row[8],
        companySize: row[9],
        foundedYear: row[10],
        location: row[11],
        techStack: row[12],
        culture: row[13],
        socialLinks: row[14],
        polarCustomerId: row[15],
        polarSubscriptionId: row[16],
        polarProductId: row[17],
        subscriptionPlan: row[18],
        subscriptionStatus: row[19],
        subscriptionCurrentPeriodEnd: row[20],
        subscriptionCancelAtPeriodEnd: row[21],
        createdAt: row[22],
        updatedAt: row[23]
    };
}

export const createCompanyMemberQuery = `-- name: createCompanyMember :one
INSERT INTO company_members (company_id, user_id, role, status, invited_by)
VALUES ($1, $2, $3, 'active', $4)
RETURNING id, company_id, user_id, role, status, invited_by, joined_at, created_at, updated_at`;

export interface createCompanyMemberArgs {
    companyId: string;
    userId: string;
    role: string;
    invitedBy: string | null;
}

export interface createCompanyMemberRow {
    id: string;
    companyId: string;
    userId: string;
    role: string;
    status: string;
    invitedBy: string | null;
    joinedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export async function createCompanyMember(sql: Sql, args: createCompanyMemberArgs): Promise<createCompanyMemberRow | null> {
    const rows = await sql.unsafe(createCompanyMemberQuery, [args.companyId, args.userId, args.role, args.invitedBy]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        userId: row[2],
        role: row[3],
        status: row[4],
        invitedBy: row[5],
        joinedAt: row[6],
        createdAt: row[7],
        updatedAt: row[8]
    };
}

export const getMembershipByIdQuery = `-- name: getMembershipById :one
SELECT id, company_id, user_id, role, status
FROM company_members
WHERE id = $1`;

export interface getMembershipByIdArgs {
    id: string;
}

export interface getMembershipByIdRow {
    id: string;
    companyId: string;
    userId: string;
    role: string;
    status: string;
}

export async function getMembershipById(sql: Sql, args: getMembershipByIdArgs): Promise<getMembershipByIdRow | null> {
    const rows = await sql.unsafe(getMembershipByIdQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        userId: row[2],
        role: row[3],
        status: row[4]
    };
}

export const getMembershipByCompanyAndUserQuery = `-- name: getMembershipByCompanyAndUser :one
SELECT id, company_id, user_id, role, status
FROM company_members
WHERE company_id = $1
  AND user_id = $2`;

export interface getMembershipByCompanyAndUserArgs {
    companyId: string;
    userId: string;
}

export interface getMembershipByCompanyAndUserRow {
    id: string;
    companyId: string;
    userId: string;
    role: string;
    status: string;
}

export async function getMembershipByCompanyAndUser(sql: Sql, args: getMembershipByCompanyAndUserArgs): Promise<getMembershipByCompanyAndUserRow | null> {
    const rows = await sql.unsafe(getMembershipByCompanyAndUserQuery, [args.companyId, args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        userId: row[2],
        role: row[3],
        status: row[4]
    };
}

export const reactivateCompanyMemberQuery = `-- name: reactivateCompanyMember :one
UPDATE company_members
SET role = $1,
    status = 'active',
    invited_by = $2,
    updated_at = now()
WHERE company_id = $3
  AND user_id = $4
  AND status = 'removed'
RETURNING id, company_id, user_id, role, status`;

export interface reactivateCompanyMemberArgs {
    role: string;
    invitedBy: string | null;
    companyId: string;
    userId: string;
}

export interface reactivateCompanyMemberRow {
    id: string;
    companyId: string;
    userId: string;
    role: string;
    status: string;
}

export async function reactivateCompanyMember(sql: Sql, args: reactivateCompanyMemberArgs): Promise<reactivateCompanyMemberRow | null> {
    const rows = await sql.unsafe(reactivateCompanyMemberQuery, [args.role, args.invitedBy, args.companyId, args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        userId: row[2],
        role: row[3],
        status: row[4]
    };
}

export const listActiveMembersByCompanyQuery = `-- name: listActiveMembersByCompany :many
SELECT cm.id, cm.role, cm.status, cm.joined_at,
       u.id AS user_id, u.name AS user_name, u.email AS user_email, u.picture AS user_picture
FROM company_members cm
JOIN users u ON u.id = cm.user_id
WHERE cm.company_id = $1
  AND cm.status = 'active'
ORDER BY
  CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
  cm.joined_at ASC`;

export interface listActiveMembersByCompanyArgs {
    companyId: string;
}

export interface listActiveMembersByCompanyRow {
    id: string;
    role: string;
    status: string;
    joinedAt: Date;
    userId: string;
    userName: string;
    userEmail: string;
    userPicture: string | null;
}

export async function listActiveMembersByCompany(sql: Sql, args: listActiveMembersByCompanyArgs): Promise<listActiveMembersByCompanyRow[]> {
    return (await sql.unsafe(listActiveMembersByCompanyQuery, [args.companyId]).values()).map(row => ({
        id: row[0],
        role: row[1],
        status: row[2],
        joinedAt: row[3],
        userId: row[4],
        userName: row[5],
        userEmail: row[6],
        userPicture: row[7]
    }));
}

export const removeCompanyMemberQuery = `-- name: removeCompanyMember :one
UPDATE company_members
SET status = 'removed',
    updated_at = now()
WHERE id = $1
  AND company_id = $2
  AND role <> 'owner'
RETURNING id, user_id`;

export interface removeCompanyMemberArgs {
    id: string;
    companyId: string;
}

export interface removeCompanyMemberRow {
    id: string;
    userId: string;
}

export async function removeCompanyMember(sql: Sql, args: removeCompanyMemberArgs): Promise<removeCompanyMemberRow | null> {
    const rows = await sql.unsafe(removeCompanyMemberQuery, [args.id, args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1]
    };
}

export const listCompanyNotificationRecipientsQuery = `-- name: listCompanyNotificationRecipients :many
SELECT u.id AS user_id, u.email
FROM company_members cm
JOIN users u ON u.id = cm.user_id AND u.deleted_at IS NULL
WHERE cm.company_id = $1
  AND cm.status = 'active'
  AND cm.role IN ('owner', 'admin')
ORDER BY CASE cm.role WHEN 'owner' THEN 0 ELSE 1 END, cm.joined_at ASC`;

export interface listCompanyNotificationRecipientsArgs {
    companyId: string;
}

export interface listCompanyNotificationRecipientsRow {
    userId: string;
    email: string;
}

export async function listCompanyNotificationRecipients(sql: Sql, args: listCompanyNotificationRecipientsArgs): Promise<listCompanyNotificationRecipientsRow[]> {
    return (await sql.unsafe(listCompanyNotificationRecipientsQuery, [args.companyId]).values()).map(row => ({
        userId: row[0],
        email: row[1]
    }));
}

export const updateCompanyMemberRoleQuery = `-- name: updateCompanyMemberRole :one
UPDATE company_members
SET role = $1,
    updated_at = now()
WHERE id = $2
  AND company_id = $3
  AND status = 'active'
RETURNING id, user_id, role`;

export interface updateCompanyMemberRoleArgs {
    role: string;
    id: string;
    companyId: string;
}

export interface updateCompanyMemberRoleRow {
    id: string;
    userId: string;
    role: string;
}

export async function updateCompanyMemberRole(sql: Sql, args: updateCompanyMemberRoleArgs): Promise<updateCompanyMemberRoleRow | null> {
    const rows = await sql.unsafe(updateCompanyMemberRoleQuery, [args.role, args.id, args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        role: row[2]
    };
}

export const updateCompanyOwnerQuery = `-- name: updateCompanyOwner :one
UPDATE companies
SET owner_id = $1,
    updated_at = now()
WHERE id = $2
RETURNING id, owner_id`;

export interface updateCompanyOwnerArgs {
    ownerId: string;
    id: string;
}

export interface updateCompanyOwnerRow {
    id: string;
    ownerId: string;
}

export async function updateCompanyOwner(sql: Sql, args: updateCompanyOwnerArgs): Promise<updateCompanyOwnerRow | null> {
    const rows = await sql.unsafe(updateCompanyOwnerQuery, [args.ownerId, args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        ownerId: row[1]
    };
}

export const createInvitationQuery = `-- name: createInvitation :one
INSERT INTO company_invitations (company_id, email, role, token, invited_by, expires_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, company_id, email, role, token, invited_by, expires_at, accepted_at, revoked_at, created_at, updated_at`;

export interface createInvitationArgs {
    companyId: string;
    email: string;
    role: string;
    token: string;
    invitedBy: string | null;
    expiresAt: Date;
}

export interface createInvitationRow {
    id: string;
    companyId: string;
    email: string;
    role: string;
    token: string;
    invitedBy: string | null;
    expiresAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function createInvitation(sql: Sql, args: createInvitationArgs): Promise<createInvitationRow | null> {
    const rows = await sql.unsafe(createInvitationQuery, [args.companyId, args.email, args.role, args.token, args.invitedBy, args.expiresAt]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        email: row[2],
        role: row[3],
        token: row[4],
        invitedBy: row[5],
        expiresAt: row[6],
        acceptedAt: row[7],
        revokedAt: row[8],
        createdAt: row[9],
        updatedAt: row[10]
    };
}

export const getPendingInvitationByEmailQuery = `-- name: getPendingInvitationByEmail :one
SELECT id
FROM company_invitations
WHERE company_id = $1
  AND email = $2
  AND accepted_at IS NULL
  AND revoked_at IS NULL
  AND expires_at > now()`;

export interface getPendingInvitationByEmailArgs {
    companyId: string;
    email: string;
}

export interface getPendingInvitationByEmailRow {
    id: string;
}

export async function getPendingInvitationByEmail(sql: Sql, args: getPendingInvitationByEmailArgs): Promise<getPendingInvitationByEmailRow | null> {
    const rows = await sql.unsafe(getPendingInvitationByEmailQuery, [args.companyId, args.email]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0]
    };
}

export const getActiveMemberByCompanyEmailQuery = `-- name: getActiveMemberByCompanyEmail :one
SELECT cm.id
FROM company_members cm
JOIN users u ON u.id = cm.user_id
WHERE cm.company_id = $1
  AND cm.status = 'active'
  AND lower(u.email) = $2`;

export interface getActiveMemberByCompanyEmailArgs {
    companyId: string;
    email: string;
}

export interface getActiveMemberByCompanyEmailRow {
    id: string;
}

export async function getActiveMemberByCompanyEmail(sql: Sql, args: getActiveMemberByCompanyEmailArgs): Promise<getActiveMemberByCompanyEmailRow | null> {
    const rows = await sql.unsafe(getActiveMemberByCompanyEmailQuery, [args.companyId, args.email]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0]
    };
}

export const getInvitationByTokenQuery = `-- name: getInvitationByToken :one
SELECT i.id, i.company_id, i.email, i.role, i.token, i.expires_at,
       i.accepted_at, i.revoked_at, i.invited_by,
       c.name AS company_name
FROM company_invitations i
JOIN companies c ON c.id = i.company_id
WHERE i.token = $1`;

export interface getInvitationByTokenArgs {
    token: string;
}

export interface getInvitationByTokenRow {
    id: string;
    companyId: string;
    email: string;
    role: string;
    token: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    invitedBy: string | null;
    companyName: string;
}

export async function getInvitationByToken(sql: Sql, args: getInvitationByTokenArgs): Promise<getInvitationByTokenRow | null> {
    const rows = await sql.unsafe(getInvitationByTokenQuery, [args.token]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        email: row[2],
        role: row[3],
        token: row[4],
        expiresAt: row[5],
        acceptedAt: row[6],
        revokedAt: row[7],
        invitedBy: row[8],
        companyName: row[9]
    };
}

export const listPendingInvitationsByCompanyQuery = `-- name: listPendingInvitationsByCompany :many
SELECT id, email, role, expires_at, created_at
FROM company_invitations
WHERE company_id = $1
  AND accepted_at IS NULL
  AND revoked_at IS NULL
  AND expires_at > now()
ORDER BY created_at DESC`;

export interface listPendingInvitationsByCompanyArgs {
    companyId: string;
}

export interface listPendingInvitationsByCompanyRow {
    id: string;
    email: string;
    role: string;
    expiresAt: Date;
    createdAt: Date;
}

export async function listPendingInvitationsByCompany(sql: Sql, args: listPendingInvitationsByCompanyArgs): Promise<listPendingInvitationsByCompanyRow[]> {
    return (await sql.unsafe(listPendingInvitationsByCompanyQuery, [args.companyId]).values()).map(row => ({
        id: row[0],
        email: row[1],
        role: row[2],
        expiresAt: row[3],
        createdAt: row[4]
    }));
}

export const revokeInvitationQuery = `-- name: revokeInvitation :one
UPDATE company_invitations
SET revoked_at = now(),
    updated_at = now()
WHERE id = $1
  AND company_id = $2
  AND accepted_at IS NULL
  AND revoked_at IS NULL
RETURNING id`;

export interface revokeInvitationArgs {
    id: string;
    companyId: string;
}

export interface revokeInvitationRow {
    id: string;
}

export async function revokeInvitation(sql: Sql, args: revokeInvitationArgs): Promise<revokeInvitationRow | null> {
    const rows = await sql.unsafe(revokeInvitationQuery, [args.id, args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0]
    };
}

export const revokeExpiredInvitationsByEmailQuery = `-- name: revokeExpiredInvitationsByEmail :exec
UPDATE company_invitations
SET revoked_at = now(),
    updated_at = now()
WHERE company_id = $1
  AND email = $2
  AND accepted_at IS NULL
  AND revoked_at IS NULL
  AND expires_at <= now()`;

export interface revokeExpiredInvitationsByEmailArgs {
    companyId: string;
    email: string;
}

export async function revokeExpiredInvitationsByEmail(sql: Sql, args: revokeExpiredInvitationsByEmailArgs): Promise<void> {
    await sql.unsafe(revokeExpiredInvitationsByEmailQuery, [args.companyId, args.email]);
}

export const resetInvitationForResendQuery = `-- name: resetInvitationForResend :one
UPDATE company_invitations
SET token = $3,
    expires_at = $4,
    updated_at = now()
WHERE id = $1
  AND company_id = $2
  AND accepted_at IS NULL
  AND revoked_at IS NULL
RETURNING id, email, role, token`;

export interface resetInvitationForResendArgs {
    id: string;
    companyId: string;
    token: string;
    expiresAt: Date;
}

export interface resetInvitationForResendRow {
    id: string;
    email: string;
    role: string;
    token: string;
}

export async function resetInvitationForResend(sql: Sql, args: resetInvitationForResendArgs): Promise<resetInvitationForResendRow | null> {
    const rows = await sql.unsafe(resetInvitationForResendQuery, [args.id, args.companyId, args.token, args.expiresAt]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        email: row[1],
        role: row[2],
        token: row[3]
    };
}

export const markInvitationAcceptedQuery = `-- name: markInvitationAccepted :one
UPDATE company_invitations
SET accepted_at = now(),
    updated_at = now()
WHERE id = $1
  AND accepted_at IS NULL
  AND revoked_at IS NULL
RETURNING id`;

export interface markInvitationAcceptedArgs {
    id: string;
}

export interface markInvitationAcceptedRow {
    id: string;
}

export async function markInvitationAccepted(sql: Sql, args: markInvitationAcceptedArgs): Promise<markInvitationAcceptedRow | null> {
    const rows = await sql.unsafe(markInvitationAcceptedQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0]
    };
}

export const countTeamSlotsByCompanyQuery = `-- name: countTeamSlotsByCompany :one
SELECT
  (SELECT COUNT(*)::int
   FROM company_members cm
   WHERE cm.company_id = $1
     AND cm.status = 'active'
     AND cm.role <> 'owner') AS invited_member_count,
  (SELECT COUNT(*)::int
   FROM company_invitations ci
   WHERE ci.company_id = $1
     AND ci.accepted_at IS NULL
     AND ci.revoked_at IS NULL
     AND ci.expires_at > now()) AS pending_invite_count`;

export interface countTeamSlotsByCompanyArgs {
    companyId: string;
}

export interface countTeamSlotsByCompanyRow {
    invitedMemberCount: number;
    pendingInviteCount: number;
}

export async function countTeamSlotsByCompany(sql: Sql, args: countTeamSlotsByCompanyArgs): Promise<countTeamSlotsByCompanyRow | null> {
    const rows = await sql.unsafe(countTeamSlotsByCompanyQuery, [args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        invitedMemberCount: row[0],
        pendingInviteCount: row[1]
    };
}

