-- migrate:up

CREATE TABLE job_import_batches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  created_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source_kind      TEXT NOT NULL,
  source_label     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'ready',
  discovered_count INTEGER NOT NULL DEFAULT 0,
  imported_count   INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_import_batches_company_created
  ON job_import_batches(company_id, created_at DESC);

ALTER TABLE jobs
  ADD COLUMN source_platform TEXT,
  ADD COLUMN source_external_id TEXT,
  ADD COLUMN source_url TEXT,
  ADD COLUMN source_updated_at TIMESTAMPTZ,
  ADD COLUMN import_batch_id UUID REFERENCES job_import_batches(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX idx_jobs_unique_import_origin
  ON jobs(company_id, source_platform, source_external_id)
  WHERE source_platform IS NOT NULL AND source_external_id IS NOT NULL;

CREATE TABLE job_import_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id           UUID NOT NULL REFERENCES job_import_batches(id) ON DELETE CASCADE,
  source_platform    TEXT NOT NULL,
  source_external_id TEXT NOT NULL,
  source_url         TEXT,
  source_updated_at  TIMESTAMPTZ,
  normalized_payload JSONB NOT NULL,
  warnings           JSONB NOT NULL DEFAULT '[]',
  inferred_fields    JSONB NOT NULL DEFAULT '[]',
  status             TEXT NOT NULL DEFAULT 'ready',
  error              TEXT,
  imported_job_id    UUID REFERENCES jobs(id) ON DELETE RESTRICT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_id, source_platform, source_external_id)
);

CREATE INDEX idx_job_import_items_batch ON job_import_items(batch_id, created_at);

-- migrate:down
