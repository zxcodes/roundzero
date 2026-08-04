-- name: createJobImportBatch :one
INSERT INTO job_import_batches (
  company_id, created_by, source_kind, source_label, status, discovered_count
)
VALUES ($1, $2, $3, $4, 'ready', $5)
RETURNING *;

-- name: deleteExpiredJobImportBatches :exec
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
);

-- name: touchJobImportBatch :exec
UPDATE job_import_batches
SET updated_at = now()
WHERE id = $1
  AND company_id = $2
  AND status = 'ready';

-- name: createJobImportItem :one
INSERT INTO job_import_items (
  batch_id, source_platform, source_external_id, source_url, source_updated_at,
  normalized_payload, warnings, inferred_fields, status
)
VALUES (
  sqlc.arg('batch_id')::uuid,
  sqlc.arg('source_platform'),
  sqlc.arg('source_external_id'),
  sqlc.narg('source_url'),
  sqlc.narg('source_updated_at')::timestamptz,
  sqlc.arg('normalized_payload')::jsonb,
  sqlc.arg('warnings')::jsonb,
  sqlc.arg('inferred_fields')::jsonb,
  CASE WHEN EXISTS (
    SELECT 1
    FROM jobs j
    JOIN job_import_batches b ON b.id = sqlc.arg('batch_id')::uuid
    WHERE j.company_id = b.company_id
      AND j.source_platform = sqlc.arg('source_platform')
      AND j.source_external_id = sqlc.arg('source_external_id')
  ) THEN 'duplicate' ELSE 'ready' END
)
RETURNING *;

-- name: getJobImportBatchForUpdate :one
SELECT *
FROM job_import_batches
WHERE id = $1 AND company_id = $2
FOR UPDATE;

-- name: lockJobImportCompany :one
SELECT id
FROM companies
WHERE id = $1
FOR UPDATE;

-- name: listJobImportItemsForCompany :many
SELECT i.*
FROM job_import_items i
JOIN job_import_batches b ON b.id = i.batch_id
WHERE i.batch_id = $1
  AND b.company_id = $2
ORDER BY i.created_at, i.id;

-- name: listSelectedJobImportItemsForCompany :many
SELECT i.*
FROM job_import_items i
JOIN job_import_batches b ON b.id = i.batch_id
WHERE i.batch_id = sqlc.arg('batch_id')::uuid
  AND b.company_id = sqlc.arg('company_id')::uuid
  AND i.id = ANY(string_to_array(sqlc.arg('item_ids_csv'), ',')::uuid[])
  AND i.status = 'ready'
ORDER BY i.created_at, i.id;

-- name: createImportedJob :one
INSERT INTO jobs (
  company_id, title, description, requirements, screening_questions, status,
  location, workplace_type, employment_type, experience_level,
  salary_min, salary_max, salary_currency, team_size, headcount,
  final_report_target, expires_at, source_platform, source_external_id,
  source_url, source_updated_at, import_batch_id
)
VALUES (
  sqlc.arg('company_id')::uuid,
  sqlc.arg('title'),
  sqlc.arg('description'),
  sqlc.arg('requirements')::jsonb,
  '[]'::jsonb,
  'draft',
  sqlc.narg('location'),
  sqlc.arg('workplace_type'),
  sqlc.arg('employment_type'),
  sqlc.arg('experience_level'),
  sqlc.narg('salary_min')::int,
  sqlc.narg('salary_max')::int,
  sqlc.arg('salary_currency'),
  NULL,
  sqlc.narg('headcount')::int,
  sqlc.arg('final_report_target')::int,
  sqlc.narg('expires_at')::timestamptz,
  sqlc.arg('source_platform'),
  sqlc.arg('source_external_id'),
  sqlc.narg('source_url'),
  sqlc.narg('source_updated_at')::timestamptz,
  sqlc.arg('import_batch_id')::uuid
)
ON CONFLICT (company_id, source_platform, source_external_id)
  WHERE source_platform IS NOT NULL AND source_external_id IS NOT NULL
DO NOTHING
RETURNING *;

-- name: markJobImportItemImported :one
UPDATE job_import_items
SET status = 'imported',
    imported_job_id = $2,
    error = NULL,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: updateJobImportItemEnrichment :one
UPDATE job_import_items
SET normalized_payload = sqlc.arg('normalized_payload')::jsonb,
    warnings = sqlc.arg('warnings')::jsonb,
    inferred_fields = sqlc.arg('inferred_fields')::jsonb,
    enrichment_token = NULL,
    enrichment_claimed_at = NULL,
    revision = revision + 1,
    updated_at = now()
WHERE id = sqlc.arg('id')::uuid
  AND batch_id = sqlc.arg('batch_id')::uuid
  AND status = 'ready'
  AND enrichment_token = sqlc.arg('enrichment_token')::uuid
  AND revision = sqlc.arg('expected_revision')::bigint
RETURNING *;

-- name: updateReadyJobImportItem :one
UPDATE job_import_items i
SET normalized_payload = sqlc.arg('normalized_payload')::jsonb,
    warnings = sqlc.arg('warnings')::jsonb,
    inferred_fields = sqlc.arg('inferred_fields')::jsonb,
    enrichment_token = NULL,
    enrichment_claimed_at = NULL,
    revision = i.revision + 1,
    updated_at = now()
FROM job_import_batches b
WHERE i.id = sqlc.arg('id')::uuid
  AND i.batch_id = sqlc.arg('batch_id')::uuid
  AND b.id = i.batch_id
  AND b.company_id = sqlc.arg('company_id')::uuid
  AND b.status = 'ready'
  AND i.status = 'ready'
  AND i.revision = sqlc.arg('expected_revision')::bigint
RETURNING i.*;

-- name: reserveJobImportEnrichmentAttempts :many
WITH eligible AS (
  SELECT i.id
  FROM job_import_items i
  JOIN job_import_batches b ON b.id = i.batch_id
  WHERE i.batch_id = sqlc.arg('batch_id')::uuid
    AND b.company_id = sqlc.arg('company_id')::uuid
    AND b.status = 'ready'
    AND i.status = 'ready'
    AND i.id = ANY(string_to_array(sqlc.arg('item_ids_csv'), ',')::uuid[])
    AND i.enrichment_attempts < 2
    AND (i.enrichment_token IS NULL OR i.enrichment_claimed_at < now() - interval '15 minutes')
  ORDER BY i.created_at, i.id
  FOR UPDATE OF i
), reserved AS (
  UPDATE job_import_items i
  SET enrichment_attempts = enrichment_attempts + 1,
      enrichment_token = sqlc.arg('enrichment_token')::uuid,
      enrichment_claimed_at = now(),
      revision = revision + 1,
      updated_at = now()
  FROM eligible e
  WHERE i.id = e.id
    AND (SELECT count(*) FROM job_import_enrichment_attempts WHERE company_id = sqlc.arg('company_id')::uuid AND created_at >= now() - interval '24 hours')
      + (SELECT count(*) FROM eligible) <= 100
  RETURNING i.*
), attempts AS (
  INSERT INTO job_import_enrichment_attempts (item_id, company_id)
  SELECT id, sqlc.arg('company_id')::uuid FROM reserved
)
SELECT * FROM reserved;

-- name: markJobImportItemDuplicate :one
UPDATE job_import_items
SET status = 'duplicate',
    error = 'This source job has already been imported.',
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: finalizeJobImportBatch :one
UPDATE job_import_batches
SET status = CASE WHEN EXISTS (
      SELECT 1 FROM job_import_items i WHERE i.batch_id = $1 AND i.status = 'ready'
    ) THEN 'ready' ELSE 'completed' END,
    imported_count = (
      SELECT count(*)::int FROM job_import_items i WHERE i.batch_id = $1 AND i.status = 'imported'
    ),
    updated_at = now()
WHERE id = $1
RETURNING *;
