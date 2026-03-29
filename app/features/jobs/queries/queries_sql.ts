import { Sql } from "postgres";

export const createJobQuery = `-- name: createJob :one
INSERT INTO jobs (
  company_id, title, description, requirements, status,
  location, workplace_type, employment_type, experience_level,
  salary_min, salary_max, salary_currency, team_size, headcount
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING id, company_id, title, description, requirements, status, location, workplace_type, employment_type, experience_level, salary_min, salary_max, salary_currency, team_size, headcount, created_at, updated_at`;

export interface createJobArgs {
    companyId: string;
    title: string;
    description: string;
    requirements: any;
    status: string;
    location: string | null;
    workplaceType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    teamSize: number | null;
    headcount: number | null;
}

export interface createJobRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    requirements: any;
    status: string;
    location: string | null;
    workplaceType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    teamSize: number | null;
    headcount: number | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function createJob(sql: Sql, args: createJobArgs): Promise<createJobRow | null> {
    const rows = await sql.unsafe(createJobQuery, [args.companyId, args.title, args.description, args.requirements, args.status, args.location, args.workplaceType, args.employmentType, args.experienceLevel, args.salaryMin, args.salaryMax, args.salaryCurrency, args.teamSize, args.headcount]).values();
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
        location: row[6],
        workplaceType: row[7],
        employmentType: row[8],
        experienceLevel: row[9],
        salaryMin: row[10],
        salaryMax: row[11],
        salaryCurrency: row[12],
        teamSize: row[13],
        headcount: row[14],
        createdAt: row[15],
        updatedAt: row[16]
    };
}

export const getJobsByCompanyIdQuery = `-- name: getJobsByCompanyId :many
SELECT id, company_id, title, description, requirements, status, location, workplace_type, employment_type, experience_level, salary_min, salary_max, salary_currency, team_size, headcount, created_at, updated_at
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
    location: string | null;
    workplaceType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    teamSize: number | null;
    headcount: number | null;
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
        location: row[6],
        workplaceType: row[7],
        employmentType: row[8],
        experienceLevel: row[9],
        salaryMin: row[10],
        salaryMax: row[11],
        salaryCurrency: row[12],
        teamSize: row[13],
        headcount: row[14],
        createdAt: row[15],
        updatedAt: row[16]
    }));
}

export const getJobByIdQuery = `-- name: getJobById :one
SELECT id, company_id, title, description, requirements, status, location, workplace_type, employment_type, experience_level, salary_min, salary_max, salary_currency, team_size, headcount, created_at, updated_at
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
    location: string | null;
    workplaceType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    teamSize: number | null;
    headcount: number | null;
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
        location: row[6],
        workplaceType: row[7],
        employmentType: row[8],
        experienceLevel: row[9],
        salaryMin: row[10],
        salaryMax: row[11],
        salaryCurrency: row[12],
        teamSize: row[13],
        headcount: row[14],
        createdAt: row[15],
        updatedAt: row[16]
    };
}

export const updateJobQuery = `-- name: updateJob :one
UPDATE jobs
SET title = $1,
    description = $2,
    requirements = $3,
    status = $4,
    location = $5,
    workplace_type = $6,
    employment_type = $7,
    experience_level = $8,
    salary_min = $9,
    salary_max = $10,
    salary_currency = $11,
    team_size = $12,
    headcount = $13,
    updated_at = now()
WHERE id = $14
  AND company_id = $15
RETURNING id, company_id, title, description, requirements, status, location, workplace_type, employment_type, experience_level, salary_min, salary_max, salary_currency, team_size, headcount, created_at, updated_at`;

export interface updateJobArgs {
    title: string;
    description: string;
    requirements: any;
    status: string;
    location: string | null;
    workplaceType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    teamSize: number | null;
    headcount: number | null;
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
    location: string | null;
    workplaceType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    teamSize: number | null;
    headcount: number | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateJob(sql: Sql, args: updateJobArgs): Promise<updateJobRow | null> {
    const rows = await sql.unsafe(updateJobQuery, [args.title, args.description, args.requirements, args.status, args.location, args.workplaceType, args.employmentType, args.experienceLevel, args.salaryMin, args.salaryMax, args.salaryCurrency, args.teamSize, args.headcount, args.id, args.companyId]).values();
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
        location: row[6],
        workplaceType: row[7],
        employmentType: row[8],
        experienceLevel: row[9],
        salaryMin: row[10],
        salaryMax: row[11],
        salaryCurrency: row[12],
        teamSize: row[13],
        headcount: row[14],
        createdAt: row[15],
        updatedAt: row[16]
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
SELECT j.id, j.company_id, j.title, j.description, j.requirements, j.status, j.location, j.workplace_type, j.employment_type, j.experience_level, j.salary_min, j.salary_max, j.salary_currency, j.team_size, j.headcount, j.created_at, j.updated_at,
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
    location: string | null;
    workplaceType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    teamSize: number | null;
    headcount: number | null;
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
        location: row[6],
        workplaceType: row[7],
        employmentType: row[8],
        experienceLevel: row[9],
        salaryMin: row[10],
        salaryMax: row[11],
        salaryCurrency: row[12],
        teamSize: row[13],
        headcount: row[14],
        createdAt: row[15],
        updatedAt: row[16],
        companyName: row[17]
    }));
}

