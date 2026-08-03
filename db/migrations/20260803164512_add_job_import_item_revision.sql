-- migrate:up

ALTER TABLE job_import_items
  ADD COLUMN revision BIGINT NOT NULL DEFAULT 0;

-- migrate:down
