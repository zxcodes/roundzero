import { Sql } from "postgres";

export const createJobQuery = `-- name: createJob :one
INSERT INTO jobs (
  company_id, title, description, screening_questions, status,
  location, workplace_type, employment_type, experience_level,
  salary_min, salary_max, salary_currency, team_size, headcount, final_report_target, expires_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
RETURNING id, company_id, title, description, screening_questions, status, location, workplace_type, employment_type, experience_level, salary_min, salary_max, salary_currency, team_size, headcount, final_report_target, expires_at, archived_at, created_at, updated_at, source_platform, source_external_id, source_url, source_updated_at, import_batch_id`;

export interface createJobArgs {
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
}

export interface createJobRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
}

export async function createJob(sql: Sql, args: createJobArgs): Promise<createJobRow | null> {
    const rows = await sql.unsafe(createJobQuery, [args.companyId, args.title, args.description, args.screeningQuestions, args.status, args.location, args.workplaceType, args.employmentType, args.experienceLevel, args.salaryMin, args.salaryMax, args.salaryCurrency, args.teamSize, args.headcount, args.finalReportTarget, args.expiresAt]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24]
    };
}

export const getJobsByCompanyIdQuery = `-- name: getJobsByCompanyId :many
SELECT id, company_id, title, description, screening_questions, status, location, workplace_type, employment_type, experience_level, salary_min, salary_max, salary_currency, team_size, headcount, final_report_target, expires_at, archived_at, created_at, updated_at, source_platform, source_external_id, source_url, source_updated_at, import_batch_id
FROM jobs
WHERE company_id = $1
  AND archived_at IS NULL
ORDER BY created_at DESC`;

export interface getJobsByCompanyIdArgs {
    companyId: string;
}

export interface getJobsByCompanyIdRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
}

export async function getJobsByCompanyId(sql: Sql, args: getJobsByCompanyIdArgs): Promise<getJobsByCompanyIdRow[]> {
    return (await sql.unsafe(getJobsByCompanyIdQuery, [args.companyId]).values()).map(row => ({
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24]
    }));
}

export const getJobsWithPipelineByCompanyIdQuery = `-- name: getJobsWithPipelineByCompanyId :many
SELECT j.id, j.company_id, j.title, j.description, j.screening_questions, j.status, j.location, j.workplace_type, j.employment_type, j.experience_level, j.salary_min, j.salary_max, j.salary_currency, j.team_size, j.headcount, j.final_report_target, j.expires_at, j.archived_at, j.created_at, j.updated_at, j.source_platform, j.source_external_id, j.source_url, j.source_updated_at, j.import_batch_id,
       count(a.id)::int AS total_applicants,
       count(a.id) FILTER (WHERE a.status = 'applied')::int AS applied_count,
       count(a.id) FILTER (WHERE a.status = 'pre_screening')::int AS pre_screening_count,
       count(a.id) FILTER (WHERE a.status = 'queued_for_batch')::int AS queued_for_batch_count,
       count(a.id) FILTER (WHERE a.status = 'interview_invited')::int AS interview_invited_count,
       count(a.id) FILTER (WHERE a.status = 'interview_in_progress')::int AS interview_in_progress_count,
       count(a.id) FILTER (WHERE a.status = 'evaluated_held')::int AS evaluated_held_count,
       count(a.id) FILTER (WHERE a.status = 'evaluated')::int AS evaluated_count,
       count(a.id) FILTER (WHERE a.status = 'shortlisted')::int AS shortlisted_count,
       count(a.id) FILTER (WHERE a.status = 'rejected')::int AS rejected_count,
       (SELECT count(*)::int
        FROM reports r
        JOIN applications a2 ON a2.id = r.application_id
        WHERE a2.job_id = j.id
          AND r.released_at IS NOT NULL) AS reports_ready_count
FROM jobs j
LEFT JOIN applications a ON a.job_id = j.id
WHERE j.company_id = $1
  AND j.archived_at IS NULL
GROUP BY j.id
ORDER BY j.created_at DESC`;

export interface getJobsWithPipelineByCompanyIdArgs {
    companyId: string;
}

export interface getJobsWithPipelineByCompanyIdRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
    totalApplicants: number;
    appliedCount: number;
    preScreeningCount: number;
    queuedForBatchCount: number;
    interviewInvitedCount: number;
    interviewInProgressCount: number;
    evaluatedHeldCount: number;
    evaluatedCount: number;
    shortlistedCount: number;
    rejectedCount: number;
    reportsReadyCount: number;
}

export async function getJobsWithPipelineByCompanyId(sql: Sql, args: getJobsWithPipelineByCompanyIdArgs): Promise<getJobsWithPipelineByCompanyIdRow[]> {
    return (await sql.unsafe(getJobsWithPipelineByCompanyIdQuery, [args.companyId]).values()).map(row => ({
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24],
        totalApplicants: row[25],
        appliedCount: row[26],
        preScreeningCount: row[27],
        queuedForBatchCount: row[28],
        interviewInvitedCount: row[29],
        interviewInProgressCount: row[30],
        evaluatedHeldCount: row[31],
        evaluatedCount: row[32],
        shortlistedCount: row[33],
        rejectedCount: row[34],
        reportsReadyCount: row[35]
    }));
}

export const getJobByIdQuery = `-- name: getJobById :one
SELECT j.id, j.company_id, j.title, j.description, j.screening_questions, j.status, j.location, j.workplace_type, j.employment_type, j.experience_level, j.salary_min, j.salary_max, j.salary_currency, j.team_size, j.headcount, j.final_report_target, j.expires_at, j.archived_at, j.created_at, j.updated_at, j.source_platform, j.source_external_id, j.source_url, j.source_updated_at, j.import_batch_id,
       c.name AS company_name,
       c.slug AS company_slug,
       c.logo_key AS company_logo_key,
       (SELECT count(*)::int FROM applications a WHERE a.job_id = j.id) AS applicant_count
FROM jobs j
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE j.id = $1`;

export interface getJobByIdArgs {
    id: string;
}

export interface getJobByIdRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
    companyName: string;
    companySlug: string;
    companyLogoKey: string | null;
    applicantCount: number;
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
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24],
        companyName: row[25],
        companySlug: row[26],
        companyLogoKey: row[27],
        applicantCount: row[28]
    };
}

export const updateJobQuery = `-- name: updateJob :one
UPDATE jobs
SET title = $1,
    description = $2,
    screening_questions = $3,
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
    final_report_target = $14,
    expires_at = $15,
    updated_at = now()
WHERE id = $16
  AND company_id = $17
  AND $14 >= final_report_target
RETURNING id, company_id, title, description, screening_questions, status, location, workplace_type, employment_type, experience_level, salary_min, salary_max, salary_currency, team_size, headcount, final_report_target, expires_at, archived_at, created_at, updated_at, source_platform, source_external_id, source_url, source_updated_at, import_batch_id`;

export interface updateJobArgs {
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    id: string;
    companyId: string;
}

export interface updateJobRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
}

export async function updateJob(sql: Sql, args: updateJobArgs): Promise<updateJobRow | null> {
    const rows = await sql.unsafe(updateJobQuery, [args.title, args.description, args.screeningQuestions, args.status, args.location, args.workplaceType, args.employmentType, args.experienceLevel, args.salaryMin, args.salaryMax, args.salaryCurrency, args.teamSize, args.headcount, args.finalReportTarget, args.expiresAt, args.id, args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24]
    };
}

export const getOwnedJobForUpdateQuery = `-- name: getOwnedJobForUpdate :one
SELECT id, company_id, title, description, screening_questions, status, location, workplace_type, employment_type, experience_level, salary_min, salary_max, salary_currency, team_size, headcount, final_report_target, expires_at, archived_at, created_at, updated_at, source_platform, source_external_id, source_url, source_updated_at, import_batch_id
FROM jobs
WHERE id = $1
  AND company_id = $2
FOR UPDATE`;

export interface getOwnedJobForUpdateArgs {
    id: string;
    companyId: string;
}

export interface getOwnedJobForUpdateRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
}

export async function getOwnedJobForUpdate(sql: Sql, args: getOwnedJobForUpdateArgs): Promise<getOwnedJobForUpdateRow | null> {
    const rows = await sql.unsafe(getOwnedJobForUpdateQuery, [args.id, args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24]
    };
}

export const closeExpiredJobsQuery = `-- name: closeExpiredJobs :execrows
UPDATE jobs
SET status = 'closed',
    updated_at = now()
WHERE status = 'open'
  AND archived_at IS NULL
  AND expires_at IS NOT NULL
  AND expires_at <= now()`;

export const archiveJobQuery = `-- name: archiveJob :one
UPDATE jobs
SET archived_at = now(),
    status = 'closed',
    updated_at = now()
WHERE id = $1
  AND company_id = $2
  AND archived_at IS NULL
RETURNING id, company_id, title, description, screening_questions, status, location, workplace_type, employment_type, experience_level, salary_min, salary_max, salary_currency, team_size, headcount, final_report_target, expires_at, archived_at, created_at, updated_at, source_platform, source_external_id, source_url, source_updated_at, import_batch_id`;

export interface archiveJobArgs {
    id: string;
    companyId: string;
}

export interface archiveJobRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
}

export async function archiveJob(sql: Sql, args: archiveJobArgs): Promise<archiveJobRow | null> {
    const rows = await sql.unsafe(archiveJobQuery, [args.id, args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24]
    };
}

export const getOpenJobsQuery = `-- name: getOpenJobs :many
SELECT j.id, j.company_id, j.title, j.description, j.screening_questions, j.status, j.location, j.workplace_type, j.employment_type, j.experience_level, j.salary_min, j.salary_max, j.salary_currency, j.team_size, j.headcount, j.final_report_target, j.expires_at, j.archived_at, j.created_at, j.updated_at, j.source_platform, j.source_external_id, j.source_url, j.source_updated_at, j.import_batch_id,
       c.name AS company_name,
       c.slug AS company_slug
FROM jobs j
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
ORDER BY j.created_at DESC`;

export interface getOpenJobsRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
    companyName: string;
    companySlug: string;
}

export async function getOpenJobs(sql: Sql): Promise<getOpenJobsRow[]> {
    return (await sql.unsafe(getOpenJobsQuery, []).values()).map(row => ({
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24],
        companyName: row[25],
        companySlug: row[26]
    }));
}

export const countJobsByCompanyAndStatusQuery = `-- name: countJobsByCompanyAndStatus :one
SELECT
  count(*) FILTER (WHERE status = 'open')::int AS open_count,
  count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
  count(*)::int AS total_count
FROM jobs
WHERE company_id = $1
  AND archived_at IS NULL`;

export interface countJobsByCompanyAndStatusArgs {
    companyId: string;
}

export interface countJobsByCompanyAndStatusRow {
    openCount: number;
    draftCount: number;
    totalCount: number;
}

export async function countJobsByCompanyAndStatus(sql: Sql, args: countJobsByCompanyAndStatusArgs): Promise<countJobsByCompanyAndStatusRow | null> {
    const rows = await sql.unsafe(countJobsByCompanyAndStatusQuery, [args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        openCount: row[0],
        draftCount: row[1],
        totalCount: row[2]
    };
}

export const getArchivedJobsByCompanyIdQuery = `-- name: getArchivedJobsByCompanyId :many
SELECT id, company_id, title, description, screening_questions, status, location, workplace_type, employment_type, experience_level, salary_min, salary_max, salary_currency, team_size, headcount, final_report_target, expires_at, archived_at, created_at, updated_at, source_platform, source_external_id, source_url, source_updated_at, import_batch_id
FROM jobs
WHERE company_id = $1
  AND archived_at IS NOT NULL
ORDER BY archived_at DESC`;

export interface getArchivedJobsByCompanyIdArgs {
    companyId: string;
}

export interface getArchivedJobsByCompanyIdRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
}

export async function getArchivedJobsByCompanyId(sql: Sql, args: getArchivedJobsByCompanyIdArgs): Promise<getArchivedJobsByCompanyIdRow[]> {
    return (await sql.unsafe(getArchivedJobsByCompanyIdQuery, [args.companyId]).values()).map(row => ({
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24]
    }));
}

export const getOpenJobsByCompanyIdQuery = `-- name: getOpenJobsByCompanyId :many
SELECT j.id, j.company_id, j.title, j.description, j.screening_questions, j.status, j.location, j.workplace_type, j.employment_type, j.experience_level, j.salary_min, j.salary_max, j.salary_currency, j.team_size, j.headcount, j.final_report_target, j.expires_at, j.archived_at, j.created_at, j.updated_at, j.source_platform, j.source_external_id, j.source_url, j.source_updated_at, j.import_batch_id,
       c.name AS company_name,
       c.slug AS company_slug
FROM jobs j
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE j.company_id = $1
  AND j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
ORDER BY j.created_at DESC`;

export interface getOpenJobsByCompanyIdArgs {
    companyId: string;
}

export interface getOpenJobsByCompanyIdRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
    companyName: string;
    companySlug: string;
}

export async function getOpenJobsByCompanyId(sql: Sql, args: getOpenJobsByCompanyIdArgs): Promise<getOpenJobsByCompanyIdRow[]> {
    return (await sql.unsafe(getOpenJobsByCompanyIdQuery, [args.companyId]).values()).map(row => ({
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24],
        companyName: row[25],
        companySlug: row[26]
    }));
}

export const getOpenJobCompaniesQuery = `-- name: getOpenJobCompanies :many
SELECT DISTINCT c.id, c.name, c.slug
FROM companies c
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
JOIN jobs j ON j.company_id = c.id
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
ORDER BY c.name`;

export interface getOpenJobCompaniesRow {
    id: string;
    name: string;
    slug: string;
}

export async function getOpenJobCompanies(sql: Sql): Promise<getOpenJobCompaniesRow[]> {
    return (await sql.unsafe(getOpenJobCompaniesQuery, []).values()).map(row => ({
        id: row[0],
        name: row[1],
        slug: row[2]
    }));
}

export const getOpenJobsPaginatedQuery = `-- name: getOpenJobsPaginated :many
SELECT j.id, j.company_id, j.title, j.description, j.screening_questions, j.status, j.location, j.workplace_type, j.employment_type, j.experience_level, j.salary_min, j.salary_max, j.salary_currency, j.team_size, j.headcount, j.final_report_target, j.expires_at, j.archived_at, j.created_at, j.updated_at, j.source_platform, j.source_external_id, j.source_url, j.source_updated_at, j.import_batch_id,
       c.name AS company_name,
       c.slug AS company_slug
FROM jobs j
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND ($1::text = '' OR j.title ILIKE '%' || $1 || '%' OR c.name ILIKE '%' || $1 || '%' OR j.location ILIKE '%' || $1 || '%')
  AND ($2::text = 'all' OR j.employment_type = $2)
  AND ($3::text = 'all' OR j.experience_level = $3)
  AND ($4::text = 'all' OR j.workplace_type = $4)
  AND ($5::text = 'all' OR j.salary_currency = $5)
  AND ($6::int = 0 OR j.salary_max IS NULL OR j.salary_max >= $6::int)
  AND ($7::text = 'all' OR c.slug = $7)
ORDER BY j.created_at DESC
LIMIT $9::int OFFSET $8::int`;

export interface getOpenJobsPaginatedArgs {
    search: string;
    employmentType: string;
    experienceLevel: string;
    workplaceType: string;
    salaryCurrency: string;
    salaryMin: number;
    companySlug: string;
    offset: number;
    limit: number;
}

export interface getOpenJobsPaginatedRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
    companyName: string;
    companySlug: string;
}

export async function getOpenJobsPaginated(sql: Sql, args: getOpenJobsPaginatedArgs): Promise<getOpenJobsPaginatedRow[]> {
    return (await sql.unsafe(getOpenJobsPaginatedQuery, [args.search, args.employmentType, args.experienceLevel, args.workplaceType, args.salaryCurrency, args.salaryMin, args.companySlug, args.offset, args.limit]).values()).map(row => ({
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24],
        companyName: row[25],
        companySlug: row[26]
    }));
}

export const countOpenJobsFilteredQuery = `-- name: countOpenJobsFiltered :one
SELECT count(*)::int AS total
FROM jobs j
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND ($1::text = '' OR j.title ILIKE '%' || $1 || '%' OR c.name ILIKE '%' || $1 || '%' OR j.location ILIKE '%' || $1 || '%')
  AND ($2::text = 'all' OR j.employment_type = $2)
  AND ($3::text = 'all' OR j.experience_level = $3)
  AND ($4::text = 'all' OR j.workplace_type = $4)
  AND ($5::text = 'all' OR j.salary_currency = $5)
  AND ($6::int = 0 OR j.salary_max IS NULL OR j.salary_max >= $6::int)
  AND ($7::text = 'all' OR c.slug = $7)`;

export interface countOpenJobsFilteredArgs {
    search: string;
    employmentType: string;
    experienceLevel: string;
    workplaceType: string;
    salaryCurrency: string;
    salaryMin: number;
    companySlug: string;
}

export interface countOpenJobsFilteredRow {
    total: number;
}

export async function countOpenJobsFiltered(sql: Sql, args: countOpenJobsFilteredArgs): Promise<countOpenJobsFilteredRow | null> {
    const rows = await sql.unsafe(countOpenJobsFilteredQuery, [args.search, args.employmentType, args.experienceLevel, args.workplaceType, args.salaryCurrency, args.salaryMin, args.companySlug]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        total: row[0]
    };
}

export const getCandidateOpenJobsPaginatedQuery = `-- name: getCandidateOpenJobsPaginated :many
SELECT j.id, j.company_id, j.title, j.description, j.screening_questions, j.status, j.location, j.workplace_type, j.employment_type, j.experience_level, j.salary_min, j.salary_max, j.salary_currency, j.team_size, j.headcount, j.final_report_target, j.expires_at, j.archived_at, j.created_at, j.updated_at, j.source_platform, j.source_external_id, j.source_url, j.source_updated_at, j.import_batch_id,
       c.name AS company_name,
       c.slug AS company_slug
FROM jobs j
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND NOT EXISTS (
    SELECT 1
    FROM applications a
    WHERE a.job_id = j.id
      AND a.candidate_id = $1::uuid
  )
  AND ($2::text = '' OR j.title ILIKE '%' || $2 || '%' OR c.name ILIKE '%' || $2 || '%' OR j.location ILIKE '%' || $2 || '%')
  AND ($3::text = 'all' OR j.employment_type = $3)
  AND ($4::text = 'all' OR j.experience_level = $4)
  AND ($5::text = 'all' OR j.workplace_type = $5)
  AND ($6::text = 'all' OR j.salary_currency = $6)
  AND ($7::int = 0 OR j.salary_max IS NULL OR j.salary_max >= $7::int)
  AND ($8::text = 'all' OR c.slug = $8)
ORDER BY j.created_at DESC
LIMIT $10::int OFFSET $9::int`;

export interface getCandidateOpenJobsPaginatedArgs {
    candidateId: string;
    search: string;
    employmentType: string;
    experienceLevel: string;
    workplaceType: string;
    salaryCurrency: string;
    salaryMin: number;
    companySlug: string;
    offset: number;
    limit: number;
}

export interface getCandidateOpenJobsPaginatedRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    screeningQuestions: any;
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
    finalReportTarget: number;
    expiresAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string | null;
    companyName: string;
    companySlug: string;
}

export async function getCandidateOpenJobsPaginated(sql: Sql, args: getCandidateOpenJobsPaginatedArgs): Promise<getCandidateOpenJobsPaginatedRow[]> {
    return (await sql.unsafe(getCandidateOpenJobsPaginatedQuery, [args.candidateId, args.search, args.employmentType, args.experienceLevel, args.workplaceType, args.salaryCurrency, args.salaryMin, args.companySlug, args.offset, args.limit]).values()).map(row => ({
        id: row[0],
        companyId: row[1],
        title: row[2],
        description: row[3],
        screeningQuestions: row[4],
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
        finalReportTarget: row[15],
        expiresAt: row[16],
        archivedAt: row[17],
        createdAt: row[18],
        updatedAt: row[19],
        sourcePlatform: row[20],
        sourceExternalId: row[21],
        sourceUrl: row[22],
        sourceUpdatedAt: row[23],
        importBatchId: row[24],
        companyName: row[25],
        companySlug: row[26]
    }));
}

export const countCandidateOpenJobsFilteredQuery = `-- name: countCandidateOpenJobsFiltered :one
SELECT count(*)::int AS total
FROM jobs j
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = c.owner_id AND u.deleted_at IS NULL
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND NOT EXISTS (
    SELECT 1
    FROM applications a
    WHERE a.job_id = j.id
      AND a.candidate_id = $1::uuid
  )
  AND ($2::text = '' OR j.title ILIKE '%' || $2 || '%' OR c.name ILIKE '%' || $2 || '%' OR j.location ILIKE '%' || $2 || '%')
  AND ($3::text = 'all' OR j.employment_type = $3)
  AND ($4::text = 'all' OR j.experience_level = $4)
  AND ($5::text = 'all' OR j.workplace_type = $5)
  AND ($6::text = 'all' OR j.salary_currency = $6)
  AND ($7::int = 0 OR j.salary_max IS NULL OR j.salary_max >= $7::int)
  AND ($8::text = 'all' OR c.slug = $8)`;

export interface countCandidateOpenJobsFilteredArgs {
    candidateId: string;
    search: string;
    employmentType: string;
    experienceLevel: string;
    workplaceType: string;
    salaryCurrency: string;
    salaryMin: number;
    companySlug: string;
}

export interface countCandidateOpenJobsFilteredRow {
    total: number;
}

export async function countCandidateOpenJobsFiltered(sql: Sql, args: countCandidateOpenJobsFilteredArgs): Promise<countCandidateOpenJobsFilteredRow | null> {
    const rows = await sql.unsafe(countCandidateOpenJobsFilteredQuery, [args.candidateId, args.search, args.employmentType, args.experienceLevel, args.workplaceType, args.salaryCurrency, args.salaryMin, args.companySlug]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        total: row[0]
    };
}

