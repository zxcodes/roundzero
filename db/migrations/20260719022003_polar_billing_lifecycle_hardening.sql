-- migrate:up
ALTER TABLE companies
  ADD COLUMN polar_subscription_modified_at TIMESTAMPTZ,
  ADD COLUMN subscription_pending_plan TEXT,
  ADD COLUMN subscription_pending_change_at TIMESTAMPTZ;

CREATE TABLE polar_webhook_receipts (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- migrate:down
