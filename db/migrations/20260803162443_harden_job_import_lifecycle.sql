-- migrate:up

ALTER TABLE job_import_items
  ADD COLUMN enrichment_attempts INTEGER NOT NULL DEFAULT 0;

CREATE TABLE job_import_enrichment_attempts (
  item_id    UUID NOT NULL REFERENCES job_import_items(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_import_enrichment_attempts_company_created
  ON job_import_enrichment_attempts(company_id, created_at);

-- migrate:down
