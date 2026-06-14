import { Sql } from "postgres";

export const createCompanyQuery = `-- name: createCompany :one
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
RETURNING id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, polar_customer_id, polar_subscription_id, polar_product_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at`;

export interface createCompanyArgs {
    ownerId: string;
    name: string;
    slug: string;
    description: string | null;
    logoKey: string | null;
    industry: string | null;
    companySize: string | null;
}

export interface createCompanyRow {
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

export async function createCompany(sql: Sql, args: createCompanyArgs): Promise<createCompanyRow | null> {
    const rows = await sql.unsafe(createCompanyQuery, [args.ownerId, args.name, args.slug, args.description, args.logoKey, args.industry, args.companySize]).values();
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

export const getCompanyByOwnerIdQuery = `-- name: getCompanyByOwnerId :one
SELECT id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, polar_customer_id, polar_subscription_id, polar_product_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at
FROM companies
WHERE owner_id = $1`;

export interface getCompanyByOwnerIdArgs {
    ownerId: string;
}

export interface getCompanyByOwnerIdRow {
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

export async function getCompanyByOwnerId(sql: Sql, args: getCompanyByOwnerIdArgs): Promise<getCompanyByOwnerIdRow | null> {
    const rows = await sql.unsafe(getCompanyByOwnerIdQuery, [args.ownerId]).values();
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

export const getCompanyByIdQuery = `-- name: getCompanyById :one
SELECT id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, polar_customer_id, polar_subscription_id, polar_product_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at
FROM companies
WHERE id = $1`;

export interface getCompanyByIdArgs {
    id: string;
}

export interface getCompanyByIdRow {
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

export async function getCompanyById(sql: Sql, args: getCompanyByIdArgs): Promise<getCompanyByIdRow | null> {
    const rows = await sql.unsafe(getCompanyByIdQuery, [args.id]).values();
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
RETURNING id`;

export interface removeCompanyMemberArgs {
    id: string;
    companyId: string;
}

export interface removeCompanyMemberRow {
    id: string;
}

export async function removeCompanyMember(sql: Sql, args: removeCompanyMemberArgs): Promise<removeCompanyMemberRow | null> {
    const rows = await sql.unsafe(removeCompanyMemberQuery, [args.id, args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0]
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
  AND revoked_at IS NULL`;

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

export const getCompanyBySlugQuery = `-- name: getCompanyBySlug :one
SELECT c.id, c.owner_id, c.name, c.slug, c.onboarding_completed_at, c.description, c.logo_key, c.website, c.industry, c.company_size, c.founded_year, c.location, c.tech_stack, c.culture, c.social_links, c.polar_customer_id, c.polar_subscription_id, c.polar_product_id, c.subscription_plan, c.subscription_status, c.subscription_current_period_end, c.subscription_cancel_at_period_end, c.created_at, c.updated_at,
       u.name AS owner_name,
       u.picture AS owner_picture
FROM companies c
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE c.slug = $1`;

export interface getCompanyBySlugArgs {
    slug: string;
}

export interface getCompanyBySlugRow {
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
    ownerName: string;
    ownerPicture: string | null;
}

export async function getCompanyBySlug(sql: Sql, args: getCompanyBySlugArgs): Promise<getCompanyBySlugRow | null> {
    const rows = await sql.unsafe(getCompanyBySlugQuery, [args.slug]).values();
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
        updatedAt: row[23],
        ownerName: row[24],
        ownerPicture: row[25]
    };
}

export const updateCompanyProfileQuery = `-- name: updateCompanyProfile :one
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
RETURNING id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, polar_customer_id, polar_subscription_id, polar_product_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at`;

export interface updateCompanyProfileArgs {
    name: string;
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
    id: string;
}

export interface updateCompanyProfileRow {
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

export async function updateCompanyProfile(sql: Sql, args: updateCompanyProfileArgs): Promise<updateCompanyProfileRow | null> {
    const rows = await sql.unsafe(updateCompanyProfileQuery, [args.name, args.description, args.logoKey, args.website, args.industry, args.companySize, args.foundedYear, args.location, args.techStack, args.culture, args.socialLinks, args.id]).values();
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

export const getAllCompaniesQuery = `-- name: getAllCompanies :many
SELECT c.id, c.owner_id, c.name, c.slug, c.onboarding_completed_at, c.description, c.logo_key, c.website, c.industry, c.company_size, c.founded_year, c.location, c.tech_stack, c.culture, c.social_links, c.polar_customer_id, c.polar_subscription_id, c.polar_product_id, c.subscription_plan, c.subscription_status, c.subscription_current_period_end, c.subscription_cancel_at_period_end, c.created_at, c.updated_at,
       (SELECT count(*)::int FROM jobs j WHERE j.company_id = c.id AND j.status = 'open' AND j.archived_at IS NULL) AS open_job_count
FROM companies c
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
ORDER BY c.created_at DESC`;

export interface getAllCompaniesRow {
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
    openJobCount: number;
}

export async function getAllCompanies(sql: Sql): Promise<getAllCompaniesRow[]> {
    return (await sql.unsafe(getAllCompaniesQuery, []).values()).map(row => ({
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
        updatedAt: row[23],
        openJobCount: row[24]
    }));
}

export const getAllCompaniesPaginatedQuery = `-- name: getAllCompaniesPaginated :many
SELECT c.id, c.owner_id, c.name, c.slug, c.onboarding_completed_at, c.description, c.logo_key, c.website, c.industry, c.company_size, c.founded_year, c.location, c.tech_stack, c.culture, c.social_links, c.polar_customer_id, c.polar_subscription_id, c.polar_product_id, c.subscription_plan, c.subscription_status, c.subscription_current_period_end, c.subscription_cancel_at_period_end, c.created_at, c.updated_at,
       (SELECT count(*)::int FROM jobs j WHERE j.company_id = c.id AND j.status = 'open' AND j.archived_at IS NULL) AS open_job_count
FROM companies c
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE ($1::text = '' OR c.name ILIKE '%' || $1 || '%' OR c.description ILIKE '%' || $1 || '%')
  AND ($2::text = 'all' OR c.industry = $2)
  AND ($3::text = 'all' OR c.company_size = $3)
ORDER BY c.created_at DESC
LIMIT $5::int OFFSET $4::int`;

export interface getAllCompaniesPaginatedArgs {
    search: string;
    industry: string;
    companySize: string;
    offset: number;
    limit: number;
}

export interface getAllCompaniesPaginatedRow {
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
    openJobCount: number;
}

export async function getAllCompaniesPaginated(sql: Sql, args: getAllCompaniesPaginatedArgs): Promise<getAllCompaniesPaginatedRow[]> {
    return (await sql.unsafe(getAllCompaniesPaginatedQuery, [args.search, args.industry, args.companySize, args.offset, args.limit]).values()).map(row => ({
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
        updatedAt: row[23],
        openJobCount: row[24]
    }));
}

export const countCompaniesFilteredQuery = `-- name: countCompaniesFiltered :one
SELECT count(*)::int AS total
FROM companies c
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE ($1::text = '' OR c.name ILIKE '%' || $1 || '%' OR c.description ILIKE '%' || $1 || '%')
  AND ($2::text = 'all' OR c.industry = $2)
  AND ($3::text = 'all' OR c.company_size = $3)`;

export interface countCompaniesFilteredArgs {
    search: string;
    industry: string;
    companySize: string;
}

export interface countCompaniesFilteredRow {
    total: number;
}

export async function countCompaniesFiltered(sql: Sql, args: countCompaniesFilteredArgs): Promise<countCompaniesFilteredRow | null> {
    const rows = await sql.unsafe(countCompaniesFilteredQuery, [args.search, args.industry, args.companySize]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        total: row[0]
    };
}

export const slugExistsQuery = `-- name: slugExists :one
SELECT EXISTS(SELECT 1 FROM companies WHERE slug = $1) AS exists`;

export interface slugExistsArgs {
    slug: string;
}

export interface slugExistsRow {
    exists: boolean;
}

export async function slugExists(sql: Sql, args: slugExistsArgs): Promise<slugExistsRow | null> {
    const rows = await sql.unsafe(slugExistsQuery, [args.slug]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        exists: row[0]
    };
}

export const getCompanyByPolarCustomerIdQuery = `-- name: getCompanyByPolarCustomerId :one
SELECT id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, polar_customer_id, polar_subscription_id, polar_product_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at
FROM companies
WHERE polar_customer_id = $1`;

export interface getCompanyByPolarCustomerIdArgs {
    polarCustomerId: string | null;
}

export interface getCompanyByPolarCustomerIdRow {
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

export async function getCompanyByPolarCustomerId(sql: Sql, args: getCompanyByPolarCustomerIdArgs): Promise<getCompanyByPolarCustomerIdRow | null> {
    const rows = await sql.unsafe(getCompanyByPolarCustomerIdQuery, [args.polarCustomerId]).values();
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

export const setCompanyPolarCustomerQuery = `-- name: setCompanyPolarCustomer :one
UPDATE companies
SET polar_customer_id = $1,
    updated_at = now()
WHERE id = $2
RETURNING id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, polar_customer_id, polar_subscription_id, polar_product_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at`;

export interface setCompanyPolarCustomerArgs {
    polarCustomerId: string | null;
    id: string;
}

export interface setCompanyPolarCustomerRow {
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

export async function setCompanyPolarCustomer(sql: Sql, args: setCompanyPolarCustomerArgs): Promise<setCompanyPolarCustomerRow | null> {
    const rows = await sql.unsafe(setCompanyPolarCustomerQuery, [args.polarCustomerId, args.id]).values();
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

export const updateCompanySubscriptionQuery = `-- name: updateCompanySubscription :one
UPDATE companies
SET polar_subscription_id = $1,
    polar_product_id = $2,
    subscription_plan = $3,
    subscription_status = $4,
    subscription_current_period_end = $5,
    subscription_cancel_at_period_end = $6,
    updated_at = now()
WHERE polar_customer_id = $7
RETURNING id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, polar_customer_id, polar_subscription_id, polar_product_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at`;

export interface updateCompanySubscriptionArgs {
    polarSubscriptionId: string | null;
    polarProductId: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionCurrentPeriodEnd: Date | null;
    subscriptionCancelAtPeriodEnd: boolean;
    polarCustomerId: string | null;
}

export interface updateCompanySubscriptionRow {
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

export async function updateCompanySubscription(sql: Sql, args: updateCompanySubscriptionArgs): Promise<updateCompanySubscriptionRow | null> {
    const rows = await sql.unsafe(updateCompanySubscriptionQuery, [args.polarSubscriptionId, args.polarProductId, args.subscriptionPlan, args.subscriptionStatus, args.subscriptionCurrentPeriodEnd, args.subscriptionCancelAtPeriodEnd, args.polarCustomerId]).values();
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

export const clearCompanySubscriptionQuery = `-- name: clearCompanySubscription :one
UPDATE companies
SET polar_subscription_id = NULL,
    polar_product_id = NULL,
    subscription_plan = 'free',
    subscription_status = 'canceled',
    subscription_current_period_end = NULL,
    subscription_cancel_at_period_end = false,
    updated_at = now()
WHERE polar_customer_id = $1
RETURNING id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, polar_customer_id, polar_subscription_id, polar_product_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at`;

export interface clearCompanySubscriptionArgs {
    polarCustomerId: string | null;
}

export interface clearCompanySubscriptionRow {
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

export async function clearCompanySubscription(sql: Sql, args: clearCompanySubscriptionArgs): Promise<clearCompanySubscriptionRow | null> {
    const rows = await sql.unsafe(clearCompanySubscriptionQuery, [args.polarCustomerId]).values();
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

