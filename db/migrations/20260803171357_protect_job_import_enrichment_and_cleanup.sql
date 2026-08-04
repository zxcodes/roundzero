-- migrate:up

ALTER TABLE jobs
  DROP CONSTRAINT jobs_import_batch_id_fkey,
  ADD CONSTRAINT jobs_import_batch_id_fkey
    FOREIGN KEY (import_batch_id) REFERENCES job_import_batches(id) ON DELETE SET NULL;

ALTER TABLE job_import_items
  ADD COLUMN enrichment_token UUID,
  ADD COLUMN enrichment_claimed_at TIMESTAMPTZ;

-- migrate:down
