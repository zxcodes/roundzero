-- migrate:up

-- Users: both company admins and candidates
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  picture     TEXT,
  role        TEXT,
  google_id   TEXT UNIQUE,
  deleted_at  TIMESTAMPTZ,
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
  -- Polar billing
  polar_customer_id               TEXT,
  polar_subscription_id           TEXT,
  polar_product_id                TEXT,
  subscription_plan               TEXT NOT NULL DEFAULT 'free',
  subscription_status             TEXT NOT NULL DEFAULT 'inactive',
  subscription_current_period_end TIMESTAMPTZ,
  subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE UNIQUE INDEX idx_companies_polar_customer
  ON companies(polar_customer_id) WHERE polar_customer_id IS NOT NULL;

-- Candidate profiles
CREATE TABLE candidate_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  onboarding_completed_at TIMESTAMPTZ,
  headline      TEXT,
  resume_key    TEXT,
  resume_updated_at TIMESTAMPTZ,
  skills        JSONB DEFAULT '[]',
  links         JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_profiles_user ON candidate_profiles(user_id);

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
  final_report_target INTEGER NOT NULL DEFAULT 5,
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

-- Job Batches: groups of interviews launched together
CREATE TABLE job_batches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  status        TEXT NOT NULL DEFAULT 'forming',
  target_size   INTEGER NOT NULL DEFAULT 5,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  launched_at   TIMESTAMPTZ,
  released_at   TIMESTAMPTZ
);

CREATE INDEX idx_job_batches_job ON job_batches(job_id);
CREATE INDEX idx_job_batches_status ON job_batches(status) WHERE status IN ('forming', 'active');

-- Interviews: each maps to a Durable Object instance
CREATE TABLE interviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  batch_id            UUID REFERENCES job_batches(id) ON DELETE SET NULL,
  agent_id            TEXT,
  type                TEXT NOT NULL DEFAULT 'full',
  metadata            JSONB NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'pending',
  invited_at          TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  expired_at          TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interviews_application ON interviews(application_id);
CREATE INDEX idx_interviews_batch ON interviews(batch_id);

CREATE TABLE interview_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id  UUID NOT NULL REFERENCES interviews(id) ON DELETE RESTRICT,
  role          TEXT NOT NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  position      BIGINT GENERATED ALWAYS AS IDENTITY
);

CREATE INDEX idx_interview_messages_interview_position
  ON interview_messages(interview_id, position);

-- Pre-evaluations: lightweight AI pre-screening results
CREATE TABLE pre_evaluations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT UNIQUE,
  score                 INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  missing_requirements  JSONB NOT NULL DEFAULT '[]',
  confidence            TEXT NOT NULL,
  next_step             TEXT NOT NULL,
  consistency_score     INTEGER CHECK (consistency_score >= 0 AND consistency_score <= 100),
  raw_response          JSONB,
  model                 TEXT,
  prompt_version        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pre_evaluations_application ON pre_evaluations(application_id);

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
  screening_answers JSONB NOT NULL DEFAULT '[]',
  scores          JSONB NOT NULL,
  recommendation  TEXT NOT NULL,
  model           TEXT,
  prompt_version  TEXT,
  refine_version  TEXT,
  released_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_application ON reports(application_id);
CREATE INDEX idx_reports_released ON reports(released_at) WHERE released_at IS NULL;

-- Communication assessments: voice-call results captured by VoiceAssessmentAgent
CREATE TABLE communication_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id    UUID NOT NULL REFERENCES interviews(id) ON DELETE RESTRICT UNIQUE,
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  status          TEXT NOT NULL DEFAULT 'pending',
  audio_key       TEXT,
  provider_session_id TEXT,
  provider_conversation_id TEXT,
  transcript      JSONB NOT NULL DEFAULT '[]',
  analysis        JSONB,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comm_assessments_interview ON communication_assessments(interview_id);
CREATE INDEX idx_comm_assessments_application ON communication_assessments(application_id);
CREATE UNIQUE INDEX idx_comm_assessments_provider_session
  ON communication_assessments(provider_session_id)
  WHERE provider_session_id IS NOT NULL;
CREATE UNIQUE INDEX idx_comm_assessments_provider_conversation
  ON communication_assessments(provider_conversation_id)
  WHERE provider_conversation_id IS NOT NULL;

-- migrate:down
