-- migrate:up

CREATE TABLE company_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL,
  token       TEXT NOT NULL,
  invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_company_invitations_token ON company_invitations (token);
-- One pending (not accepted, not revoked) invite per company+email. Email is
-- normalized to lowercase in the application layer before insert.
CREATE UNIQUE INDEX idx_company_invitations_pending
  ON company_invitations (company_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX idx_company_invitations_company ON company_invitations (company_id);

-- migrate:down
