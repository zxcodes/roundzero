import { Sql } from "postgres";

export const createJobQuery = `-- name: createJob :one
INSERT INTO jobs (company_id, title, description, requirements, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, company_id, title, description, requirements, status, created_at, updated_at`;

export interface createJobArgs {
    companyId: string;
    title: string;
    description: string;
    requirements: any;
    status: string;
}

export interface createJobRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    requirements: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export async function createJob(sql: Sql, args: createJobArgs): Promise<createJobRow | null> {
    const rows = await sql.unsafe(createJobQuery, [args.companyId, args.title, args.description, args.requirements, args.status]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        requirements: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    };
}

export const getJobsByCompanyIdQuery = `-- name: getJobsByCompanyId :many
SELECT id, company_id, title, description, requirements, status, created_at, updated_at
FROM jobs
WHERE company_id = $1
ORDER BY created_at DESC`;

export interface getJobsByCompanyIdArgs {
    companyId: string;
}

export interface getJobsByCompanyIdRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    requirements: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export async function getJobsByCompanyId(sql: Sql, args: getJobsByCompanyIdArgs): Promise<getJobsByCompanyIdRow[]> {
    return (await sql.unsafe(getJobsByCompanyIdQuery, [args.companyId]).values()).map(row => ({
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        requirements: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    }));
}

export const getJobByIdQuery = `-- name: getJobById :one
SELECT id, company_id, title, description, requirements, status, created_at, updated_at
FROM jobs
WHERE id = $1`;

export interface getJobByIdArgs {
    id: string;
}

export interface getJobByIdRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    requirements: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export async function getJobById(sql: Sql, args: getJobByIdArgs): Promise<getJobByIdRow | null> {
    const rows = await sql.unsafe(getJobByIdQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        requirements: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    };
}

export const updateJobQuery = `-- name: updateJob :one
UPDATE jobs
SET title = $1,
    description = $2,
    requirements = $3,
    status = $4,
    updated_at = now()
WHERE id = $5
  AND company_id = $6
RETURNING id, company_id, title, description, requirements, status, created_at, updated_at`;

export interface updateJobArgs {
    title: string;
    description: string;
    requirements: any;
    status: string;
    id: string;
    companyId: string;
}

export interface updateJobRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    requirements: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateJob(sql: Sql, args: updateJobArgs): Promise<updateJobRow | null> {
    const rows = await sql.unsafe(updateJobQuery, [args.title, args.description, args.requirements, args.status, args.id, args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        requirements: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    };
}

export const deleteJobQuery = `-- name: deleteJob :exec
DELETE FROM jobs
WHERE id = $1
  AND company_id = $2`;

export interface deleteJobArgs {
    id: string;
    companyId: string;
}

export async function deleteJob(sql: Sql, args: deleteJobArgs): Promise<void> {
    await sql.unsafe(deleteJobQuery, [args.id, args.companyId]);
}

export const getOpenJobsQuery = `-- name: getOpenJobs :many
SELECT j.id, j.company_id, j.title, j.description, j.requirements, j.status, j.created_at, j.updated_at,
       c.name AS company_name
FROM jobs j
JOIN companies c ON c.id = j.company_id
WHERE j.status = 'open'
ORDER BY j.created_at DESC`;

export interface getOpenJobsRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    requirements: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    companyName: string;
}

export async function getOpenJobs(sql: Sql): Promise<getOpenJobsRow[]> {
    return (await sql.unsafe(getOpenJobsQuery, []).values()).map(row => ({
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        requirements: row[4],
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7],
        companyName: row[8]
    }));
}

