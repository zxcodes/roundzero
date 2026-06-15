-- migrate:up

CREATE TABLE company_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill existing company owners as `owner` members. Runs before the
-- partial unique indexes so any pre-existing data is validated by them.
-- Today's 1:1 owner_id model guarantees one membership per user here.
INSERT INTO company_members (company_id, user_id, role, status, joined_at, created_at, updated_at)
SELECT id, owner_id, 'owner', 'active', created_at, now(), now()
FROM companies;

CREATE UNIQUE INDEX idx_company_members_company_user ON company_members (company_id, user_id);
CREATE UNIQUE INDEX idx_company_members_one_owner ON company_members (company_id) WHERE role = 'owner';
CREATE UNIQUE INDEX idx_company_members_one_active ON company_members (user_id) WHERE status = 'active';
CREATE INDEX idx_company_members_user ON company_members (user_id);
CREATE INDEX idx_company_members_company ON company_members (company_id);

-- migrate:down
