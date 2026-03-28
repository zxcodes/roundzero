import { Sql } from "postgres";

export const createCompanyQuery = `-- name: createCompany :one
INSERT INTO companies (owner_id, name, description)
VALUES ($1, $2, $3)
RETURNING id, owner_id, name, description, created_at`;

export interface createCompanyArgs {
    ownerId: string;
    name: string;
    description: string | null;
}

export interface createCompanyRow {
    id: string;
    ownerId: string;
    name: string;
    description: string | null;
    createdAt: Date;
}

export async function createCompany(sql: Sql, args: createCompanyArgs): Promise<createCompanyRow | null> {
    const rows = await sql.unsafe(createCompanyQuery, [args.ownerId, args.name, args.description]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        ownerId: row[1],
        name: row[2],
        description: row[3],
        createdAt: row[4]
    };
}

export const getCompanyByOwnerIdQuery = `-- name: getCompanyByOwnerId :one
SELECT id, owner_id, name, description, created_at
FROM companies
WHERE owner_id = $1`;

export interface getCompanyByOwnerIdArgs {
    ownerId: string;
}

export interface getCompanyByOwnerIdRow {
    id: string;
    ownerId: string;
    name: string;
    description: string | null;
    createdAt: Date;
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
        description: row[3],
        createdAt: row[4]
    };
}

export const getCompanyByIdQuery = `-- name: getCompanyById :one
SELECT id, owner_id, name, description, created_at
FROM companies
WHERE id = $1`;

export interface getCompanyByIdArgs {
    id: string;
}

export interface getCompanyByIdRow {
    id: string;
    ownerId: string;
    name: string;
    description: string | null;
    createdAt: Date;
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
        description: row[3],
        createdAt: row[4]
    };
}

export const updateCompanyQuery = `-- name: updateCompany :one
UPDATE companies
SET name = $1,
    description = $2
WHERE id = $3
  AND owner_id = $4
RETURNING id, owner_id, name, description, created_at`;

export interface updateCompanyArgs {
    name: string;
    description: string | null;
    id: string;
    ownerId: string;
}

export interface updateCompanyRow {
    id: string;
    ownerId: string;
    name: string;
    description: string | null;
    createdAt: Date;
}

export async function updateCompany(sql: Sql, args: updateCompanyArgs): Promise<updateCompanyRow | null> {
    const rows = await sql.unsafe(updateCompanyQuery, [args.name, args.description, args.id, args.ownerId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        ownerId: row[1],
        name: row[2],
        description: row[3],
        createdAt: row[4]
    };
}

