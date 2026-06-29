-- migrate:up
ALTER TABLE users ADD COLUMN anonymized_at TIMESTAMPTZ;

CREATE INDEX idx_users_pending_erasure ON users (deleted_at)
  WHERE deleted_at IS NOT NULL AND anonymized_at IS NULL;

-- migrate:down