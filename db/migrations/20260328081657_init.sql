-- migrate:up

-- Users: both company admins and candidates
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  picture     TEXT,
  role        TEXT,
  google_id   TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email ON users(LOWER(email));

-- Companies
CREATE TABLE companies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  onboarding_completed_at TIMESTAMPTZ,
  description    TEXT,
  logo_key       TEXT,
  website        TEXT,
  industry       TEXT,
  company_size   TEXT,
  founded_year   INTEGER,
  location       TEXT,
  tech_stack     JSONB DEFAULT '[]',
  culture        TEXT,
  social_links   JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_owner ON companies(owner_id);

-- Candidate profiles
CREATE TABLE candidate_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  onboarding_completed_at TIMESTAMPTZ,
  headline      TEXT,
  resume_key    TEXT,
  resume_updated_at TIMESTAMPTZ,
  bio           TEXT,
  skills        JSONB DEFAULT '[]',
  links         JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_profiles_user ON candidate_profiles(user_id);

CREATE TABLE candidate_work_history (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id     UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE RESTRICT,
  company                  TEXT NOT NULL,
  title                    TEXT NOT NULL,
  start_month              TEXT NOT NULL,
  end_month                TEXT,
  currently_working_here   BOOLEAN NOT NULL DEFAULT false,
  description              TEXT,
  sort_order               INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_work_history_profile
  ON candidate_work_history(candidate_profile_id, sort_order);

-- Jobs
CREATE TABLE jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  requirements     JSONB NOT NULL DEFAULT '[]',
  interview_questions JSONB NOT NULL DEFAULT '[]',
  status           TEXT NOT NULL DEFAULT 'draft',
  location         TEXT,
  workplace_type   TEXT,
  employment_type  TEXT,
  experience_level TEXT,
  salary_min       INTEGER,
  salary_max       INTEGER,
  salary_currency  TEXT NOT NULL DEFAULT 'USD',
  team_size        INTEGER,
  headcount        INTEGER DEFAULT 1,
  expires_at       TIMESTAMPTZ,
  archived_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_archived ON jobs(archived_at) WHERE archived_at IS NULL;

-- Applications
CREATE TABLE applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  candidate_id  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  resume_key    TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);

-- Notifications
CREATE TABLE notifications (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type                       TEXT NOT NULL,
  payload                    JSONB NOT NULL DEFAULT '{}',
  read_at                    TIMESTAMPTZ,
  email_delivery_status      TEXT,
  email_delivery_error       TEXT,
  email_delivery_attempted_at TIMESTAMPTZ,
  email_delivery_sent_at     TIMESTAMPTZ,
  email_provider_message_id  TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX idx_notifications_unread
  ON notifications(user_id, read_at)
  WHERE read_at IS NULL;

-- Interviews: each maps to a Durable Object instance
CREATE TABLE interviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  agent_id        TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interviews_application ON interviews(application_id);

-- Reports: final output of the evaluation pipeline
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id    UUID NOT NULL REFERENCES interviews(id) ON DELETE RESTRICT UNIQUE,
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  summary         TEXT NOT NULL,
  strengths       JSONB NOT NULL DEFAULT '[]',
  weaknesses      JSONB NOT NULL DEFAULT '[]',
  insights        JSONB NOT NULL DEFAULT '[]',
  evidence        JSONB NOT NULL DEFAULT '[]',
  scores          JSONB NOT NULL,
  recommendation  TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_application ON reports(application_id);

-- migrate:down
