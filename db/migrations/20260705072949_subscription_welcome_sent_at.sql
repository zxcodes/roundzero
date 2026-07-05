-- migrate:up
ALTER TABLE companies
  ADD COLUMN subscription_welcome_polar_subscription_id TEXT;

-- migrate:down