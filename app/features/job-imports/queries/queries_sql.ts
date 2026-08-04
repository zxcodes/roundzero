import { Sql } from "postgres";

export const createJobImportBatchQuery = `-- name: createJobImportBatch :one
INSERT INTO job_import_batches (
  company_id, created_by, source_kind, source_label, status, discovered_count
)
VALUES ($1, $2, $3, $4, 'ready', $5)
RETURNING id, company_id, created_by, source_kind, source_label, status, discovered_count, imported_count, created_at, updated_at`;

export interface createJobImportBatchArgs {
    companyId: string;
    createdBy: string;
    sourceKind: string;
    sourceLabel: string;
    discoveredCount: number;
}

export interface createJobImportBatchRow {
    id: string;
    companyId: string;
    createdBy: string;
    sourceKind: string;
    sourceLabel: string;
    status: string;
    discoveredCount: number;
    importedCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export async function createJobImportBatch(sql: Sql, args: createJobImportBatchArgs): Promise<createJobImportBatchRow | null> {
    const rows = await sql.unsafe(createJobImportBatchQuery, [args.companyId, args.createdBy, args.sourceKind, args.sourceLabel, args.discoveredCount]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        createdBy: row[2],
        sourceKind: row[3],
        sourceLabel: row[4],
        status: row[5],
        discoveredCount: row[6],
        importedCount: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

export const deleteExpiredJobImportBatchesQuery = `-- name: deleteExpiredJobImportBatches :exec
DELETE FROM job_import_batches
WHERE id IN (
  SELECT b.id
  FROM job_import_batches b
  WHERE b.company_id = $1
    AND b.status <> 'completed'
    AND b.updated_at < now() - interval '30 days'
    AND NOT EXISTS (
      SELECT 1
      FROM job_import_items i
      WHERE i.batch_id = b.id
        AND i.enrichment_token IS NOT NULL
        AND i.enrichment_claimed_at >= now() - interval '15 minutes'
    )
  FOR UPDATE OF b SKIP LOCKED
)`;

export interface deleteExpiredJobImportBatchesArgs {
    companyId: string;
}

export async function deleteExpiredJobImportBatches(sql: Sql, args: deleteExpiredJobImportBatchesArgs): Promise<void> {
    await sql.unsafe(deleteExpiredJobImportBatchesQuery, [args.companyId]);
}

export const touchJobImportBatchQuery = `-- name: touchJobImportBatch :exec
UPDATE job_import_batches
SET updated_at = now()
WHERE id = $1
  AND company_id = $2
  AND status = 'ready'`;

export interface touchJobImportBatchArgs {
    id: string;
    companyId: string;
}

export async function touchJobImportBatch(sql: Sql, args: touchJobImportBatchArgs): Promise<void> {
    await sql.unsafe(touchJobImportBatchQuery, [args.id, args.companyId]);
}

export const createJobImportItemQuery = `-- name: createJobImportItem :one
INSERT INTO job_import_items (
  batch_id, source_platform, source_external_id, source_url, source_updated_at,
  normalized_payload, warnings, inferred_fields, status
)
VALUES (
  $1::uuid,
  $2,
  $3,
  $4,
  $5::timestamptz,
  $6::jsonb,
  $7::jsonb,
  $8::jsonb,
  CASE WHEN EXISTS (
    SELECT 1
    FROM jobs j
    JOIN job_import_batches b ON b.id = $1::uuid
    WHERE j.company_id = b.company_id
      AND j.source_platform = $2
      AND j.source_external_id = $3
  ) THEN 'duplicate' ELSE 'ready' END
)
RETURNING id, batch_id, source_platform, source_external_id, source_url, source_updated_at, normalized_payload, warnings, inferred_fields, status, error, imported_job_id, created_at, updated_at, enrichment_attempts, revision, enrichment_token, enrichment_claimed_at`;

export interface createJobImportItemArgs {
    batchId: string;
    sourcePlatform: string;
    sourceExternalId: string;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    normalizedPayload: any;
    warnings: any;
    inferredFields: any;
}

export interface createJobImportItemRow {
    id: string;
    batchId: string;
    sourcePlatform: string;
    sourceExternalId: string;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    normalizedPayload: any;
    warnings: any;
    inferredFields: any;
    status: string;
    error: string | null;
    importedJobId: string | null;
    createdAt: Date;
    updatedAt: Date;
    enrichmentAttempts: number;
    revision: string;
    enrichmentToken: string | null;
    enrichmentClaimedAt: Date | null;
}

export async function createJobImportItem(sql: Sql, args: createJobImportItemArgs): Promise<createJobImportItemRow | null> {
    const rows = await sql.unsafe(createJobImportItemQuery, [args.batchId, args.sourcePlatform, args.sourceExternalId, args.sourceUrl, args.sourceUpdatedAt, args.normalizedPayload, args.warnings, args.inferredFields]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        batchId: row[1],
        sourcePlatform: row[2],
        sourceExternalId: row[3],
        sourceUrl: row[4],
        sourceUpdatedAt: row[5],
        normalizedPayload: row[6],
        warnings: row[7],
        inferredFields: row[8],
        status: row[9],
        error: row[10],
        importedJobId: row[11],
        createdAt: row[12],
        updatedAt: row[13],
        enrichmentAttempts: row[14],
        revision: row[15],
        enrichmentToken: row[16],
        enrichmentClaimedAt: row[17]
    };
}

export const getJobImportBatchForUpdateQuery = `-- name: getJobImportBatchForUpdate :one
SELECT id, company_id, created_by, source_kind, source_label, status, discovered_count, imported_count, created_at, updated_at
FROM job_import_batches
WHERE id = $1 AND company_id = $2
FOR UPDATE`;

export interface getJobImportBatchForUpdateArgs {
    id: string;
    companyId: string;
}

export interface getJobImportBatchForUpdateRow {
    id: string;
    companyId: string;
    createdBy: string;
    sourceKind: string;
    sourceLabel: string;
    status: string;
    discoveredCount: number;
    importedCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export async function getJobImportBatchForUpdate(sql: Sql, args: getJobImportBatchForUpdateArgs): Promise<getJobImportBatchForUpdateRow | null> {
    const rows = await sql.unsafe(getJobImportBatchForUpdateQuery, [args.id, args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        createdBy: row[2],
        sourceKind: row[3],
        sourceLabel: row[4],
        status: row[5],
        discoveredCount: row[6],
        importedCount: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

export const lockJobImportCompanyQuery = `-- name: lockJobImportCompany :one
SELECT id
FROM companies
WHERE id = $1
FOR UPDATE`;

export interface lockJobImportCompanyArgs {
    id: string;
}

export interface lockJobImportCompanyRow {
    id: string;
}

export async function lockJobImportCompany(sql: Sql, args: lockJobImportCompanyArgs): Promise<lockJobImportCompanyRow | null> {
    const rows = await sql.unsafe(lockJobImportCompanyQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0]
    };
}

export const listJobImportItemsForCompanyQuery = `-- name: listJobImportItemsForCompany :many
SELECT i.id, i.batch_id, i.source_platform, i.source_external_id, i.source_url, i.source_updated_at, i.normalized_payload, i.warnings, i.inferred_fields, i.status, i.error, i.imported_job_id, i.created_at, i.updated_at, i.enrichment_attempts, i.revision, i.enrichment_token, i.enrichment_claimed_at
FROM job_import_items i
JOIN job_import_batches b ON b.id = i.batch_id
WHERE i.batch_id = $1
  AND b.company_id = $2
ORDER BY i.created_at, i.id`;

export interface listJobImportItemsForCompanyArgs {
    batchId: string;
    companyId: string;
}

export interface listJobImportItemsForCompanyRow {
    id: string;
    batchId: string;
    sourcePlatform: string;
    sourceExternalId: string;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    normalizedPayload: any;
    warnings: any;
    inferredFields: any;
    status: string;
    error: string | null;
    importedJobId: string | null;
    createdAt: Date;
    updatedAt: Date;
    enrichmentAttempts: number;
    revision: string;
    enrichmentToken: string | null;
    enrichmentClaimedAt: Date | null;
}

export async function listJobImportItemsForCompany(sql: Sql, args: listJobImportItemsForCompanyArgs): Promise<listJobImportItemsForCompanyRow[]> {
    return (await sql.unsafe(listJobImportItemsForCompanyQuery, [args.batchId, args.companyId]).values()).map(row => ({
        id: row[0],
        batchId: row[1],
        sourcePlatform: row[2],
        sourceExternalId: row[3],
        sourceUrl: row[4],
        sourceUpdatedAt: row[5],
        normalizedPayload: row[6],
        warnings: row[7],
        inferredFields: row[8],
        status: row[9],
        error: row[10],
        importedJobId: row[11],
        createdAt: row[12],
        updatedAt: row[13],
        enrichmentAttempts: row[14],
        revision: row[15],
        enrichmentToken: row[16],
        enrichmentClaimedAt: row[17]
    }));
}

export const listSelectedJobImportItemsForCompanyQuery = `-- name: listSelectedJobImportItemsForCompany :many
SELECT i.id, i.batch_id, i.source_platform, i.source_external_id, i.source_url, i.source_updated_at, i.normalized_payload, i.warnings, i.inferred_fields, i.status, i.error, i.imported_job_id, i.created_at, i.updated_at, i.enrichment_attempts, i.revision, i.enrichment_token, i.enrichment_claimed_at
FROM job_import_items i
JOIN job_import_batches b ON b.id = i.batch_id
WHERE i.batch_id = $1::uuid
  AND b.company_id = $2::uuid
  AND i.id = ANY(string_to_array($3, ',')::uuid[])
  AND i.status = 'ready'
ORDER BY i.created_at, i.id`;

export interface listSelectedJobImportItemsForCompanyArgs {
    batchId: string;
    companyId: string;
    itemIdsCsv: string;
}

export interface listSelectedJobImportItemsForCompanyRow {
    id: string;
    batchId: string;
    sourcePlatform: string;
    sourceExternalId: string;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    normalizedPayload: any;
    warnings: any;
    inferredFields: any;
    status: string;
    error: string | null;
    importedJobId: string | null;
    createdAt: Date;
    updatedAt: Date;
    enrichmentAttempts: number;
    revision: string;
    enrichmentToken: string | null;
    enrichmentClaimedAt: Date | null;
}

export async function listSelectedJobImportItemsForCompany(sql: Sql, args: listSelectedJobImportItemsForCompanyArgs): Promise<listSelectedJobImportItemsForCompanyRow[]> {
    return (await sql.unsafe(listSelectedJobImportItemsForCompanyQuery, [args.batchId, args.companyId, args.itemIdsCsv]).values()).map(row => ({
        id: row[0],
        batchId: row[1],
        sourcePlatform: row[2],
        sourceExternalId: row[3],
        sourceUrl: row[4],
        sourceUpdatedAt: row[5],
        normalizedPayload: row[6],
        warnings: row[7],
        inferredFields: row[8],
        status: row[9],
        error: row[10],
        importedJobId: row[11],
        createdAt: row[12],
        updatedAt: row[13],
        enrichmentAttempts: row[14],
        revision: row[15],
        enrichmentToken: row[16],
        enrichmentClaimedAt: row[17]
    }));
}

export const createImportedJobQuery = `-- name: createImportedJob :one
INSERT INTO jobs (
  company_id, title, description, requirements, screening_questions, status,
  location, workplace_type, employment_type, experience_level,
  salary_min, salary_max, salary_currency, team_size, headcount,
  final_report_target, expires_at, source_platform, source_external_id,
  source_url, source_updated_at, import_batch_id
)
VALUES (
  $1::uuid,
  $2,
  $3,
  $4::jsonb,
  '[]'::jsonb,
  'draft',
  $5,
  $6,
  $7,
  $8,
  $9::int,
  $10::int,
  $11,
  NULL,
  $12::int,
  $13::int,
  $14::timestamptz,
  $15,
  $16,
  $17,
  $18::timestamptz,
  $19::uuid
)
ON CONFLICT (company_id, source_platform, source_external_id)
  WHERE source_platform IS NOT NULL AND source_external_id IS NOT NULL
DO NOTHING
RETURNING id, company_id, title, description, requirements, screening_questions, status, location, workplace_type, employment_type, experience_level, salary_min, salary_max, salary_currency, team_size, headcount, final_report_target, expires_at, archived_at, created_at, updated_at, source_platform, source_external_id, source_url, source_updated_at, import_batch_id`;

export interface createImportedJobArgs {
    companyId: string;
    title: string;
    description: string;
    requirements: any;
    location: string | null;
    workplaceType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    headcount: number | null;
    finalReportTarget: number;
    expiresAt: Date | null;
    sourcePlatform: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    importBatchId: string;
}

export interface createImportedJobRow {
    id: string;
    companyId: string;
    title: string;
    description: string;
    requirements: any;
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

export async function createImportedJob(sql: Sql, args: createImportedJobArgs): Promise<createImportedJobRow | null> {
    const rows = await sql.unsafe(createImportedJobQuery, [args.companyId, args.title, args.description, args.requirements, args.location, args.workplaceType, args.employmentType, args.experienceLevel, args.salaryMin, args.salaryMax, args.salaryCurrency, args.headcount, args.finalReportTarget, args.expiresAt, args.sourcePlatform, args.sourceExternalId, args.sourceUrl, args.sourceUpdatedAt, args.importBatchId]).values();
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
        screeningQuestions: row[5],
        status: row[6],
        location: row[7],
        workplaceType: row[8],
        employmentType: row[9],
        experienceLevel: row[10],
        salaryMin: row[11],
        salaryMax: row[12],
        salaryCurrency: row[13],
        teamSize: row[14],
        headcount: row[15],
        finalReportTarget: row[16],
        expiresAt: row[17],
        archivedAt: row[18],
        createdAt: row[19],
        updatedAt: row[20],
        sourcePlatform: row[21],
        sourceExternalId: row[22],
        sourceUrl: row[23],
        sourceUpdatedAt: row[24],
        importBatchId: row[25]
    };
}

export const markJobImportItemImportedQuery = `-- name: markJobImportItemImported :one
UPDATE job_import_items
SET status = 'imported',
    imported_job_id = $2,
    error = NULL,
    updated_at = now()
WHERE id = $1
RETURNING id, batch_id, source_platform, source_external_id, source_url, source_updated_at, normalized_payload, warnings, inferred_fields, status, error, imported_job_id, created_at, updated_at, enrichment_attempts, revision, enrichment_token, enrichment_claimed_at`;

export interface markJobImportItemImportedArgs {
    id: string;
    importedJobId: string | null;
}

export interface markJobImportItemImportedRow {
    id: string;
    batchId: string;
    sourcePlatform: string;
    sourceExternalId: string;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    normalizedPayload: any;
    warnings: any;
    inferredFields: any;
    status: string;
    error: string | null;
    importedJobId: string | null;
    createdAt: Date;
    updatedAt: Date;
    enrichmentAttempts: number;
    revision: string;
    enrichmentToken: string | null;
    enrichmentClaimedAt: Date | null;
}

export async function markJobImportItemImported(sql: Sql, args: markJobImportItemImportedArgs): Promise<markJobImportItemImportedRow | null> {
    const rows = await sql.unsafe(markJobImportItemImportedQuery, [args.id, args.importedJobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        batchId: row[1],
        sourcePlatform: row[2],
        sourceExternalId: row[3],
        sourceUrl: row[4],
        sourceUpdatedAt: row[5],
        normalizedPayload: row[6],
        warnings: row[7],
        inferredFields: row[8],
        status: row[9],
        error: row[10],
        importedJobId: row[11],
        createdAt: row[12],
        updatedAt: row[13],
        enrichmentAttempts: row[14],
        revision: row[15],
        enrichmentToken: row[16],
        enrichmentClaimedAt: row[17]
    };
}

export const updateJobImportItemEnrichmentQuery = `-- name: updateJobImportItemEnrichment :one
UPDATE job_import_items
SET normalized_payload = $1::jsonb,
    warnings = $2::jsonb,
    inferred_fields = $3::jsonb,
    enrichment_token = NULL,
    enrichment_claimed_at = NULL,
    revision = revision + 1,
    updated_at = now()
WHERE id = $4::uuid
  AND batch_id = $5::uuid
  AND status = 'ready'
  AND enrichment_token = $6::uuid
  AND revision = $7::bigint
RETURNING id, batch_id, source_platform, source_external_id, source_url, source_updated_at, normalized_payload, warnings, inferred_fields, status, error, imported_job_id, created_at, updated_at, enrichment_attempts, revision, enrichment_token, enrichment_claimed_at`;

export interface updateJobImportItemEnrichmentArgs {
    normalizedPayload: any;
    warnings: any;
    inferredFields: any;
    id: string;
    batchId: string;
    enrichmentToken: string;
    expectedRevision: string;
}

export interface updateJobImportItemEnrichmentRow {
    id: string;
    batchId: string;
    sourcePlatform: string;
    sourceExternalId: string;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    normalizedPayload: any;
    warnings: any;
    inferredFields: any;
    status: string;
    error: string | null;
    importedJobId: string | null;
    createdAt: Date;
    updatedAt: Date;
    enrichmentAttempts: number;
    revision: string;
    enrichmentToken: string | null;
    enrichmentClaimedAt: Date | null;
}

export async function updateJobImportItemEnrichment(sql: Sql, args: updateJobImportItemEnrichmentArgs): Promise<updateJobImportItemEnrichmentRow | null> {
    const rows = await sql.unsafe(updateJobImportItemEnrichmentQuery, [args.normalizedPayload, args.warnings, args.inferredFields, args.id, args.batchId, args.enrichmentToken, args.expectedRevision]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        batchId: row[1],
        sourcePlatform: row[2],
        sourceExternalId: row[3],
        sourceUrl: row[4],
        sourceUpdatedAt: row[5],
        normalizedPayload: row[6],
        warnings: row[7],
        inferredFields: row[8],
        status: row[9],
        error: row[10],
        importedJobId: row[11],
        createdAt: row[12],
        updatedAt: row[13],
        enrichmentAttempts: row[14],
        revision: row[15],
        enrichmentToken: row[16],
        enrichmentClaimedAt: row[17]
    };
}

export const updateReadyJobImportItemQuery = `-- name: updateReadyJobImportItem :one
UPDATE job_import_items i
SET normalized_payload = $1::jsonb,
    warnings = $2::jsonb,
    inferred_fields = $3::jsonb,
    enrichment_token = NULL,
    enrichment_claimed_at = NULL,
    revision = i.revision + 1,
    updated_at = now()
FROM job_import_batches b
WHERE i.id = $4::uuid
  AND i.batch_id = $5::uuid
  AND b.id = i.batch_id
  AND b.company_id = $6::uuid
  AND b.status = 'ready'
  AND i.status = 'ready'
  AND i.revision = $7::bigint
RETURNING i.id, i.batch_id, i.source_platform, i.source_external_id, i.source_url, i.source_updated_at, i.normalized_payload, i.warnings, i.inferred_fields, i.status, i.error, i.imported_job_id, i.created_at, i.updated_at, i.enrichment_attempts, i.revision, i.enrichment_token, i.enrichment_claimed_at`;

export interface updateReadyJobImportItemArgs {
    normalizedPayload: any;
    warnings: any;
    inferredFields: any;
    id: string;
    batchId: string;
    companyId: string;
    expectedRevision: string;
}

export interface updateReadyJobImportItemRow {
    id: string;
    batchId: string;
    sourcePlatform: string;
    sourceExternalId: string;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    normalizedPayload: any;
    warnings: any;
    inferredFields: any;
    status: string;
    error: string | null;
    importedJobId: string | null;
    createdAt: Date;
    updatedAt: Date;
    enrichmentAttempts: number;
    revision: string;
    enrichmentToken: string | null;
    enrichmentClaimedAt: Date | null;
}

export async function updateReadyJobImportItem(sql: Sql, args: updateReadyJobImportItemArgs): Promise<updateReadyJobImportItemRow | null> {
    const rows = await sql.unsafe(updateReadyJobImportItemQuery, [args.normalizedPayload, args.warnings, args.inferredFields, args.id, args.batchId, args.companyId, args.expectedRevision]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        batchId: row[1],
        sourcePlatform: row[2],
        sourceExternalId: row[3],
        sourceUrl: row[4],
        sourceUpdatedAt: row[5],
        normalizedPayload: row[6],
        warnings: row[7],
        inferredFields: row[8],
        status: row[9],
        error: row[10],
        importedJobId: row[11],
        createdAt: row[12],
        updatedAt: row[13],
        enrichmentAttempts: row[14],
        revision: row[15],
        enrichmentToken: row[16],
        enrichmentClaimedAt: row[17]
    };
}

export const reserveJobImportEnrichmentAttemptsQuery = `-- name: reserveJobImportEnrichmentAttempts :many
WITH eligible AS (
  SELECT i.id
  FROM job_import_items i
  JOIN job_import_batches b ON b.id = i.batch_id
  WHERE i.batch_id = $1::uuid
    AND b.company_id = $2::uuid
    AND b.status = 'ready'
    AND i.status = 'ready'
    AND i.id = ANY(string_to_array($3, ',')::uuid[])
    AND i.enrichment_attempts < 2
    AND (i.enrichment_token IS NULL OR i.enrichment_claimed_at < now() - interval '15 minutes')
  ORDER BY i.created_at, i.id
  FOR UPDATE OF i
), reserved AS (
  UPDATE job_import_items i
  SET enrichment_attempts = enrichment_attempts + 1,
      enrichment_token = $4::uuid,
      enrichment_claimed_at = now(),
      revision = revision + 1,
      updated_at = now()
  FROM eligible e
  WHERE i.id = e.id
    AND (SELECT count(*) FROM job_import_enrichment_attempts WHERE company_id = $2::uuid AND created_at >= now() - interval '24 hours')
      + (SELECT count(*) FROM eligible) <= 100
  RETURNING i.id, i.batch_id, i.source_platform, i.source_external_id, i.source_url, i.source_updated_at, i.normalized_payload, i.warnings, i.inferred_fields, i.status, i.error, i.imported_job_id, i.created_at, i.updated_at, i.enrichment_attempts, i.revision, i.enrichment_token, i.enrichment_claimed_at
), attempts AS (
  INSERT INTO job_import_enrichment_attempts (item_id, company_id)
  SELECT id, $2::uuid FROM reserved
)
SELECT id, batch_id, source_platform, source_external_id, source_url, source_updated_at, normalized_payload, warnings, inferred_fields, status, error, imported_job_id, created_at, updated_at, enrichment_attempts, revision, enrichment_token, enrichment_claimed_at FROM reserved`;

export interface reserveJobImportEnrichmentAttemptsArgs {
    batchId: string;
    companyId: string;
    itemIdsCsv: string;
    enrichmentToken: string;
}

export interface reserveJobImportEnrichmentAttemptsRow {
    id: string;
    batchId: string;
    sourcePlatform: string;
    sourceExternalId: string;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    normalizedPayload: any;
    warnings: any;
    inferredFields: any;
    status: string;
    error: string | null;
    importedJobId: string | null;
    createdAt: Date;
    updatedAt: Date;
    enrichmentAttempts: number;
    revision: string;
    enrichmentToken: string | null;
    enrichmentClaimedAt: Date | null;
}

export async function reserveJobImportEnrichmentAttempts(sql: Sql, args: reserveJobImportEnrichmentAttemptsArgs): Promise<reserveJobImportEnrichmentAttemptsRow[]> {
    return (await sql.unsafe(reserveJobImportEnrichmentAttemptsQuery, [args.batchId, args.companyId, args.itemIdsCsv, args.enrichmentToken]).values()).map(row => ({
        id: row[0],
        batchId: row[1],
        sourcePlatform: row[2],
        sourceExternalId: row[3],
        sourceUrl: row[4],
        sourceUpdatedAt: row[5],
        normalizedPayload: row[6],
        warnings: row[7],
        inferredFields: row[8],
        status: row[9],
        error: row[10],
        importedJobId: row[11],
        createdAt: row[12],
        updatedAt: row[13],
        enrichmentAttempts: row[14],
        revision: row[15],
        enrichmentToken: row[16],
        enrichmentClaimedAt: row[17]
    }));
}

export const markJobImportItemDuplicateQuery = `-- name: markJobImportItemDuplicate :one
UPDATE job_import_items
SET status = 'duplicate',
    error = 'This source job has already been imported.',
    updated_at = now()
WHERE id = $1
RETURNING id, batch_id, source_platform, source_external_id, source_url, source_updated_at, normalized_payload, warnings, inferred_fields, status, error, imported_job_id, created_at, updated_at, enrichment_attempts, revision, enrichment_token, enrichment_claimed_at`;

export interface markJobImportItemDuplicateArgs {
    id: string;
}

export interface markJobImportItemDuplicateRow {
    id: string;
    batchId: string;
    sourcePlatform: string;
    sourceExternalId: string;
    sourceUrl: string | null;
    sourceUpdatedAt: Date | null;
    normalizedPayload: any;
    warnings: any;
    inferredFields: any;
    status: string;
    error: string | null;
    importedJobId: string | null;
    createdAt: Date;
    updatedAt: Date;
    enrichmentAttempts: number;
    revision: string;
    enrichmentToken: string | null;
    enrichmentClaimedAt: Date | null;
}

export async function markJobImportItemDuplicate(sql: Sql, args: markJobImportItemDuplicateArgs): Promise<markJobImportItemDuplicateRow | null> {
    const rows = await sql.unsafe(markJobImportItemDuplicateQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        batchId: row[1],
        sourcePlatform: row[2],
        sourceExternalId: row[3],
        sourceUrl: row[4],
        sourceUpdatedAt: row[5],
        normalizedPayload: row[6],
        warnings: row[7],
        inferredFields: row[8],
        status: row[9],
        error: row[10],
        importedJobId: row[11],
        createdAt: row[12],
        updatedAt: row[13],
        enrichmentAttempts: row[14],
        revision: row[15],
        enrichmentToken: row[16],
        enrichmentClaimedAt: row[17]
    };
}

export const finalizeJobImportBatchQuery = `-- name: finalizeJobImportBatch :one
UPDATE job_import_batches
SET status = CASE WHEN EXISTS (
      SELECT 1 FROM job_import_items i WHERE i.batch_id = $1 AND i.status = 'ready'
    ) THEN 'ready' ELSE 'completed' END,
    imported_count = (
      SELECT count(*)::int FROM job_import_items i WHERE i.batch_id = $1 AND i.status = 'imported'
    ),
    updated_at = now()
WHERE id = $1
RETURNING id, company_id, created_by, source_kind, source_label, status, discovered_count, imported_count, created_at, updated_at`;

export interface finalizeJobImportBatchArgs {
    batchId: string;
}

export interface finalizeJobImportBatchRow {
    id: string;
    companyId: string;
    createdBy: string;
    sourceKind: string;
    sourceLabel: string;
    status: string;
    discoveredCount: number;
    importedCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export async function finalizeJobImportBatch(sql: Sql, args: finalizeJobImportBatchArgs): Promise<finalizeJobImportBatchRow | null> {
    const rows = await sql.unsafe(finalizeJobImportBatchQuery, [args.batchId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        companyId: row[1],
        createdBy: row[2],
        sourceKind: row[3],
        sourceLabel: row[4],
        status: row[5],
        discoveredCount: row[6],
        importedCount: row[7],
        createdAt: row[8],
        updatedAt: row[9]
    };
}

