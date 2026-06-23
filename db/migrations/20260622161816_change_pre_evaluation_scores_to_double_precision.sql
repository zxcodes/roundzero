-- migrate:up
ALTER TABLE pre_evaluations
  ALTER COLUMN score TYPE DOUBLE PRECISION,
  ALTER COLUMN consistency_score TYPE DOUBLE PRECISION;

-- migrate:down

