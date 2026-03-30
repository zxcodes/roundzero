import { Sql } from "postgres";

export const createCompanyQuery = `-- name: createCompany :one
INSERT INTO companies (owner_id, name, slug, description, industry, company_size)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, owner_id, name, slug, description, logo_url, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, created_at, updated_at`;

export interface createCompanyArgs {
    ownerId: string;
    name: string;
    slug: string;
    description: string | null;
    industry: string | null;
    companySize: string | null;
}

export interface createCompanyRow {
    id: string;
    ownerId: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    industry: string | null;
    companySize: string | null;
    foundedYear: number | null;
    location: string | null;
    techStack: any;
    culture: string | null;
    socialLinks: any;
    createdAt: Date;
    updatedAt: Date;
}

export async function createCompany(sql: Sql, args: createCompanyArgs): Promise<createCompanyRow | null> {
    const rows = await sql.unsafe(createCompanyQuery, [args.ownerId, args.name, args.slug, args.description, args.industry, args.companySize]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        ownerId: row[1],
        name: row[2],
        slug: row[3],
        description: row[4],
        logoUrl: row[5],
        website: row[6],
        industry: row[7],
        companySize: row[8],
        foundedYear: row[9],
        location: row[10],
        techStack: row[11],
        culture: row[12],
        socialLinks: row[13],
        createdAt: row[14],
        updatedAt: row[15]
    };
}

export const getCompanyByOwnerIdQuery = `-- name: getCompanyByOwnerId :one
SELECT id, owner_id, name, slug, description, logo_url, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, created_at, updated_at
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
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    industry: string | null;
    companySize: string | null;
    foundedYear: number | null;
    location: string | null;
    techStack: any;
    culture: string | null;
    socialLinks: any;
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
        description: row[4],
        logoUrl: row[5],
        website: row[6],
        industry: row[7],
        companySize: row[8],
        foundedYear: row[9],
        location: row[10],
        techStack: row[11],
        culture: row[12],
        socialLinks: row[13],
        createdAt: row[14],
        updatedAt: row[15]
    };
}

export const getCompanyByIdQuery = `-- name: getCompanyById :one
SELECT id, owner_id, name, slug, description, logo_url, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, created_at, updated_at
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
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    industry: string | null;
    companySize: string | null;
    foundedYear: number | null;
    location: string | null;
    techStack: any;
    culture: string | null;
    socialLinks: any;
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
        description: row[4],
        logoUrl: row[5],
        website: row[6],
        industry: row[7],
        companySize: row[8],
        foundedYear: row[9],
        location: row[10],
        techStack: row[11],
        culture: row[12],
        socialLinks: row[13],
        createdAt: row[14],
        updatedAt: row[15]
    };
}

export const getCompanyBySlugQuery = `-- name: getCompanyBySlug :one
SELECT c.id, c.owner_id, c.name, c.slug, c.description, c.logo_url, c.website, c.industry, c.company_size, c.founded_year, c.location, c.tech_stack, c.culture, c.social_links, c.created_at, c.updated_at,
       u.name AS owner_name,
       u.picture AS owner_picture
FROM companies c
JOIN users u ON u.id = c.owner_id
WHERE c.slug = $1`;

export interface getCompanyBySlugArgs {
    slug: string;
}

export interface getCompanyBySlugRow {
    id: string;
    ownerId: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    industry: string | null;
    companySize: string | null;
    foundedYear: number | null;
    location: string | null;
    techStack: any;
    culture: string | null;
    socialLinks: any;
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
        description: row[4],
        logoUrl: row[5],
        website: row[6],
        industry: row[7],
        companySize: row[8],
        foundedYear: row[9],
        location: row[10],
        techStack: row[11],
        culture: row[12],
        socialLinks: row[13],
        createdAt: row[14],
        updatedAt: row[15],
        ownerName: row[16],
        ownerPicture: row[17]
    };
}

export const updateCompanyProfileQuery = `-- name: updateCompanyProfile :one
UPDATE companies
SET name = $1,
    description = $2,
    logo_url = $3,
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
RETURNING id, owner_id, name, slug, description, logo_url, website, industry, company_size, founded_year, location, tech_stack, culture, social_links, created_at, updated_at`;

export interface updateCompanyProfileArgs {
    name: string;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    industry: string | null;
    companySize: string | null;
    foundedYear: number | null;
    location: string | null;
    techStack: any;
    culture: string | null;
    socialLinks: any;
    id: string;
    ownerId: string;
}

export interface updateCompanyProfileRow {
    id: string;
    ownerId: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    industry: string | null;
    companySize: string | null;
    foundedYear: number | null;
    location: string | null;
    techStack: any;
    culture: string | null;
    socialLinks: any;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateCompanyProfile(sql: Sql, args: updateCompanyProfileArgs): Promise<updateCompanyProfileRow | null> {
    const rows = await sql.unsafe(updateCompanyProfileQuery, [args.name, args.description, args.logoUrl, args.website, args.industry, args.companySize, args.foundedYear, args.location, args.techStack, args.culture, args.socialLinks, args.id, args.ownerId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        ownerId: row[1],
        name: row[2],
        slug: row[3],
        description: row[4],
        logoUrl: row[5],
        website: row[6],
        industry: row[7],
        companySize: row[8],
        foundedYear: row[9],
        location: row[10],
        techStack: row[11],
        culture: row[12],
        socialLinks: row[13],
        createdAt: row[14],
        updatedAt: row[15]
    };
}

export const getAllCompaniesQuery = `-- name: getAllCompanies :many
SELECT c.id, c.owner_id, c.name, c.slug, c.description, c.logo_url, c.website, c.industry, c.company_size, c.founded_year, c.location, c.tech_stack, c.culture, c.social_links, c.created_at, c.updated_at,
       (SELECT count(*)::int FROM jobs j WHERE j.company_id = c.id AND j.status = 'open' AND j.archived_at IS NULL) AS open_job_count
FROM companies c
ORDER BY c.created_at DESC`;

export interface getAllCompaniesRow {
    id: string;
    ownerId: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    industry: string | null;
    companySize: string | null;
    foundedYear: number | null;
    location: string | null;
    techStack: any;
    culture: string | null;
    socialLinks: any;
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
        description: row[4],
        logoUrl: row[5],
        website: row[6],
        industry: row[7],
        companySize: row[8],
        foundedYear: row[9],
        location: row[10],
        techStack: row[11],
        culture: row[12],
        socialLinks: row[13],
        createdAt: row[14],
        updatedAt: row[15],
        openJobCount: row[16]
    }));
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

