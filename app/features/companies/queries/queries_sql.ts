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
RETURNING id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at`;

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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
        subscriptionPlan: row[18],
        subscriptionStatus: row[19],
        subscriptionCurrentPeriodEnd: row[20],
        subscriptionCancelAtPeriodEnd: row[21],
        createdAt: row[22],
        updatedAt: row[23]
    };
}

export const getCompanyByOwnerIdQuery = `-- name: getCompanyByOwnerId :one
SELECT id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
        subscriptionPlan: row[18],
        subscriptionStatus: row[19],
        subscriptionCurrentPeriodEnd: row[20],
        subscriptionCancelAtPeriodEnd: row[21],
        createdAt: row[22],
        updatedAt: row[23]
    };
}

export const getCompanyByIdQuery = `-- name: getCompanyById :one
SELECT id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
        subscriptionPlan: row[18],
        subscriptionStatus: row[19],
        subscriptionCurrentPeriodEnd: row[20],
        subscriptionCancelAtPeriodEnd: row[21],
        createdAt: row[22],
        updatedAt: row[23]
    };
}

export const getCompanyBySlugQuery = `-- name: getCompanyBySlug :one
SELECT c.id, c.owner_id, c.name, c.slug, c.onboarding_completed_at, c.description, c.logo_key, c.website, c.industry, c.company_size, c.founded_year, c.location, c.tech_stack, c.culture, c.social_links, c.stripe_customer_id, c.stripe_subscription_id, c.stripe_price_id, c.subscription_plan, c.subscription_status, c.subscription_current_period_end, c.subscription_cancel_at_period_end, c.created_at, c.updated_at,
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
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
  AND owner_id = $13
RETURNING id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at`;

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
    ownerId: string;
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionCurrentPeriodEnd: Date | null;
    subscriptionCancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateCompanyProfile(sql: Sql, args: updateCompanyProfileArgs): Promise<updateCompanyProfileRow | null> {
    const rows = await sql.unsafe(updateCompanyProfileQuery, [args.name, args.description, args.logoKey, args.website, args.industry, args.companySize, args.foundedYear, args.location, args.techStack, args.culture, args.socialLinks, args.id, args.ownerId]).values();
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
        subscriptionPlan: row[18],
        subscriptionStatus: row[19],
        subscriptionCurrentPeriodEnd: row[20],
        subscriptionCancelAtPeriodEnd: row[21],
        createdAt: row[22],
        updatedAt: row[23]
    };
}

export const updateCompanyLogoByOwnerIdQuery = `-- name: updateCompanyLogoByOwnerId :one
UPDATE companies
SET logo_key = $1,
    updated_at = now()
WHERE owner_id = $2
RETURNING id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at`;

export interface updateCompanyLogoByOwnerIdArgs {
    logoKey: string | null;
    ownerId: string;
}

export interface updateCompanyLogoByOwnerIdRow {
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionCurrentPeriodEnd: Date | null;
    subscriptionCancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateCompanyLogoByOwnerId(sql: Sql, args: updateCompanyLogoByOwnerIdArgs): Promise<updateCompanyLogoByOwnerIdRow | null> {
    const rows = await sql.unsafe(updateCompanyLogoByOwnerIdQuery, [args.logoKey, args.ownerId]).values();
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
        subscriptionPlan: row[18],
        subscriptionStatus: row[19],
        subscriptionCurrentPeriodEnd: row[20],
        subscriptionCancelAtPeriodEnd: row[21],
        createdAt: row[22],
        updatedAt: row[23]
    };
}

export const getAllCompaniesQuery = `-- name: getAllCompanies :many
SELECT c.id, c.owner_id, c.name, c.slug, c.onboarding_completed_at, c.description, c.logo_key, c.website, c.industry, c.company_size, c.founded_year, c.location, c.tech_stack, c.culture, c.social_links, c.stripe_customer_id, c.stripe_subscription_id, c.stripe_price_id, c.subscription_plan, c.subscription_status, c.subscription_current_period_end, c.subscription_cancel_at_period_end, c.created_at, c.updated_at,
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
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
SELECT c.id, c.owner_id, c.name, c.slug, c.onboarding_completed_at, c.description, c.logo_key, c.website, c.industry, c.company_size, c.founded_year, c.location, c.tech_stack, c.culture, c.social_links, c.stripe_customer_id, c.stripe_subscription_id, c.stripe_price_id, c.subscription_plan, c.subscription_status, c.subscription_current_period_end, c.subscription_cancel_at_period_end, c.created_at, c.updated_at,
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
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

export const getCompanyByStripeCustomerIdQuery = `-- name: getCompanyByStripeCustomerId :one
SELECT id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at
FROM companies
WHERE stripe_customer_id = $1`;

export interface getCompanyByStripeCustomerIdArgs {
    stripeCustomerId: string | null;
}

export interface getCompanyByStripeCustomerIdRow {
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionCurrentPeriodEnd: Date | null;
    subscriptionCancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export async function getCompanyByStripeCustomerId(sql: Sql, args: getCompanyByStripeCustomerIdArgs): Promise<getCompanyByStripeCustomerIdRow | null> {
    const rows = await sql.unsafe(getCompanyByStripeCustomerIdQuery, [args.stripeCustomerId]).values();
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
        subscriptionPlan: row[18],
        subscriptionStatus: row[19],
        subscriptionCurrentPeriodEnd: row[20],
        subscriptionCancelAtPeriodEnd: row[21],
        createdAt: row[22],
        updatedAt: row[23]
    };
}

export const setCompanyStripeCustomerQuery = `-- name: setCompanyStripeCustomer :one
UPDATE companies
SET stripe_customer_id = $1,
    updated_at = now()
WHERE id = $2
RETURNING id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at`;

export interface setCompanyStripeCustomerArgs {
    stripeCustomerId: string | null;
    id: string;
}

export interface setCompanyStripeCustomerRow {
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionCurrentPeriodEnd: Date | null;
    subscriptionCancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export async function setCompanyStripeCustomer(sql: Sql, args: setCompanyStripeCustomerArgs): Promise<setCompanyStripeCustomerRow | null> {
    const rows = await sql.unsafe(setCompanyStripeCustomerQuery, [args.stripeCustomerId, args.id]).values();
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
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
SET stripe_subscription_id = $1,
    stripe_price_id = $2,
    subscription_plan = $3,
    subscription_status = $4,
    subscription_current_period_end = $5,
    subscription_cancel_at_period_end = $6,
    updated_at = now()
WHERE stripe_customer_id = $7
RETURNING id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at`;

export interface updateCompanySubscriptionArgs {
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionCurrentPeriodEnd: Date | null;
    subscriptionCancelAtPeriodEnd: boolean;
    stripeCustomerId: string | null;
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionCurrentPeriodEnd: Date | null;
    subscriptionCancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateCompanySubscription(sql: Sql, args: updateCompanySubscriptionArgs): Promise<updateCompanySubscriptionRow | null> {
    const rows = await sql.unsafe(updateCompanySubscriptionQuery, [args.stripeSubscriptionId, args.stripePriceId, args.subscriptionPlan, args.subscriptionStatus, args.subscriptionCurrentPeriodEnd, args.subscriptionCancelAtPeriodEnd, args.stripeCustomerId]).values();
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
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
SET stripe_subscription_id = NULL,
    stripe_price_id = NULL,
    subscription_plan = 'free',
    subscription_status = 'canceled',
    subscription_current_period_end = NULL,
    subscription_cancel_at_period_end = false,
    updated_at = now()
WHERE stripe_customer_id = $1
RETURNING id, owner_id, name, slug, onboarding_completed_at, description, logo_key, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, created_at, updated_at`;

export interface clearCompanySubscriptionArgs {
    stripeCustomerId: string | null;
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionCurrentPeriodEnd: Date | null;
    subscriptionCancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export async function clearCompanySubscription(sql: Sql, args: clearCompanySubscriptionArgs): Promise<clearCompanySubscriptionRow | null> {
    const rows = await sql.unsafe(clearCompanySubscriptionQuery, [args.stripeCustomerId]).values();
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
        stripeCustomerId: row[15],
        stripeSubscriptionId: row[16],
        stripePriceId: row[17],
        subscriptionPlan: row[18],
        subscriptionStatus: row[19],
        subscriptionCurrentPeriodEnd: row[20],
        subscriptionCancelAtPeriodEnd: row[21],
        createdAt: row[22],
        updatedAt: row[23]
    };
}

