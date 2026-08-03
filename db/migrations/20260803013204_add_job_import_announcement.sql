-- migrate:up

ALTER TABLE companies
ADD COLUMN job_import_prompt_dismissed_at TIMESTAMPTZ;

-- migrate:down
