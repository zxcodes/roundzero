-- migrate:up
ALTER TABLE candidate_profiles
  ADD COLUMN matching_profile JSONB,
  ADD COLUMN matching_profile_source_hash TEXT,
  ADD COLUMN matching_profile_version TEXT,
  ADD COLUMN matching_profile_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN matching_profile_error TEXT,
  ADD COLUMN serving_match_generation UUID,
  ADD COLUMN serving_match_input_hash TEXT,
  ADD COLUMN match_feed_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN match_feed_error TEXT,
  ADD COLUMN match_feed_refreshed_at TIMESTAMPTZ,
  ADD COLUMN match_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN match_alerts_enabled_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN match_refresh_token UUID,
  ADD COLUMN match_refresh_claimed_at TIMESTAMPTZ;

CREATE TABLE job_matching_profiles (
  job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  requested_source_hash TEXT NOT NULL,
  completed_source_hash TEXT,
  source_version TEXT NOT NULL,
  extraction_status TEXT NOT NULL DEFAULT 'pending',
  extraction_error TEXT,
  matching_profile JSONB,
  model TEXT,
  prompt_version TEXT,
  extraction_token UUID NOT NULL,
  extraction_claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_matching_profiles_recovery
  ON job_matching_profiles(extraction_status, extraction_claimed_at);

CREATE TABLE candidate_job_matches (
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  generation_id UUID NOT NULL,
  candidate_profile_source_hash TEXT NOT NULL,
  job_profile_source_hash TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  band TEXT NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]',
  consideration TEXT,
  algorithm_version TEXT NOT NULL,
  threshold_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model TEXT NOT NULL,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_strong_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  digest_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(candidate_id, job_id)
);

CREATE INDEX idx_candidate_job_matches_feed
  ON candidate_job_matches(candidate_id, generation_id, score DESC)
  WHERE dismissed_at IS NULL;

CREATE INDEX idx_candidate_job_matches_digest
  ON candidate_job_matches(candidate_id, generation_id, first_strong_at)
  WHERE band = 'strong'
    AND viewed_at IS NULL
    AND dismissed_at IS NULL
    AND digest_notified_at IS NULL;

-- migrate:down
