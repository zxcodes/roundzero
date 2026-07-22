-- migrate:up
ALTER TABLE candidate_profiles
  ADD COLUMN match_refresh_phase TEXT;

-- migrate:down
