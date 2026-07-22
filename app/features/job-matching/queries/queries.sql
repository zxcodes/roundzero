-- name: RequestJobMatchingProfile :one
INSERT INTO job_matching_profiles (
  job_id, requested_source_hash, source_version, extraction_status,
  extraction_token, extraction_claimed_at
)
VALUES ($1, $2, $3, 'pending', $4, now())
ON CONFLICT (job_id) DO UPDATE SET
  requested_source_hash = EXCLUDED.requested_source_hash,
  source_version = EXCLUDED.source_version,
  extraction_status = 'pending',
  extraction_error = NULL,
  extraction_token = EXCLUDED.extraction_token,
  extraction_claimed_at = now(),
  updated_at = now()
RETURNING *;

-- name: GetJobMatchingProfile :one
SELECT *
FROM job_matching_profiles
WHERE job_id = $1;

-- name: GetJobForMatchingExtraction :one
SELECT id, title, description, requirements, experience_level, status, archived_at, expires_at
FROM jobs
WHERE id = $1;

-- name: SaveJobMatchingProfileIfCurrent :one
UPDATE job_matching_profiles
SET completed_source_hash = sqlc.arg('source_hash'),
    matching_profile = sqlc.arg('matching_profile'),
    model = sqlc.arg('model'),
    prompt_version = sqlc.arg('prompt_version'),
    extraction_status = 'ready',
    extraction_error = NULL,
    extraction_claimed_at = NULL,
    completed_at = now(),
    updated_at = now()
WHERE job_id = sqlc.arg('job_id')
  AND requested_source_hash = sqlc.arg('source_hash')
  AND extraction_token = sqlc.arg('extraction_token')
RETURNING *;

-- name: MarkJobMatchingProfileFailedIfCurrent :one
UPDATE job_matching_profiles
SET extraction_status = 'failed',
    extraction_error = sqlc.arg('error_message'),
    extraction_claimed_at = NULL,
    updated_at = now()
WHERE job_id = sqlc.arg('job_id')
  AND extraction_token = sqlc.arg('extraction_token')
RETURNING *;

-- name: GetCandidateMatchingState :one
SELECT id, user_id, resume_key, resume_updated_at, matching_profile,
       matching_profile_source_hash, matching_profile_version,
       matching_profile_status, matching_profile_error,
       serving_match_generation, serving_match_input_hash,
       match_feed_status, match_feed_error, match_feed_refreshed_at,
       match_alerts_enabled, match_alerts_enabled_at,
       match_refresh_token, match_refresh_claimed_at, match_refresh_phase
FROM candidate_profiles
WHERE user_id = $1;

-- name: GetCandidateMatchRefreshProgress :one
SELECT match_feed_status, match_feed_error, match_feed_refreshed_at,
       match_refresh_claimed_at, match_refresh_phase
FROM candidate_profiles
WHERE user_id = $1;

-- name: SaveCandidateMatchingProfileIfCurrent :one
UPDATE candidate_profiles
SET matching_profile = sqlc.arg('matching_profile'),
    matching_profile_source_hash = sqlc.arg('source_hash'),
    matching_profile_version = sqlc.arg('profile_version'),
    matching_profile_status = 'ready',
    matching_profile_error = NULL,
    updated_at = now()
WHERE user_id = sqlc.arg('user_id')
  AND resume_key = sqlc.arg('resume_key')
  AND match_refresh_token = sqlc.arg('refresh_token')
RETURNING *;

-- name: MarkCandidateProfileFailedIfCurrent :one
UPDATE candidate_profiles
SET matching_profile_status = 'failed',
    matching_profile_error = sqlc.arg('error_message'),
    match_feed_status = 'failed',
    match_feed_error = sqlc.arg('error_message'),
    match_refresh_claimed_at = NULL,
    match_refresh_phase = NULL,
    updated_at = now()
WHERE user_id = sqlc.arg('user_id')
  AND match_refresh_token = sqlc.arg('refresh_token')
RETURNING *;

-- name: ClaimCandidateMatchRefresh :one
UPDATE candidate_profiles
SET match_refresh_token = sqlc.arg('refresh_token'),
    match_refresh_claimed_at = now(),
    match_refresh_phase = 'queued',
    match_feed_status = 'processing',
    match_feed_error = NULL,
    updated_at = now()
WHERE user_id = sqlc.arg('user_id')
  AND resume_key IS NOT NULL
  AND (
    sqlc.arg('force')::boolean
    OR match_refresh_claimed_at IS NULL
    OR match_refresh_claimed_at < sqlc.arg('claim_cutoff')
  )
RETURNING user_id, match_refresh_token, resume_key;

-- name: SetCandidateMatchRefreshPhaseIfCurrent :one
UPDATE candidate_profiles
SET match_refresh_phase = sqlc.arg('phase'),
    updated_at = now()
WHERE user_id = sqlc.arg('user_id')
  AND match_refresh_token = sqlc.arg('refresh_token')
  AND match_feed_status = 'processing'
RETURNING user_id, match_refresh_phase;

-- name: LockCandidateMatchRefresh :one
SELECT user_id, resume_key, matching_profile_source_hash, match_refresh_token
FROM candidate_profiles
WHERE user_id = $1
FOR UPDATE;

-- name: TouchCandidateMatchFeedIfCurrent :one
UPDATE candidate_profiles
SET match_feed_status = 'ready',
    match_feed_error = NULL,
    match_feed_refreshed_at = now(),
    match_refresh_claimed_at = NULL,
    match_refresh_phase = NULL,
    updated_at = now()
WHERE user_id = sqlc.arg('user_id')
  AND match_refresh_token = sqlc.arg('refresh_token')
RETURNING *;

-- name: MarkCandidateFeedFailedIfCurrent :one
UPDATE candidate_profiles
SET match_feed_status = 'failed',
    match_feed_error = sqlc.arg('error_message'),
    match_refresh_claimed_at = NULL,
    match_refresh_phase = NULL,
    updated_at = now()
WHERE user_id = sqlc.arg('user_id')
  AND match_refresh_token = sqlc.arg('refresh_token')
RETURNING *;

-- name: ListEligibleJobsForCandidateMatching :many
SELECT j.id, j.title, j.location, j.workplace_type, j.employment_type,
       j.experience_level, j.created_at, p.matching_profile,
       p.completed_source_hash
FROM jobs j
JOIN companies c ON c.id = j.company_id
JOIN users owner ON owner.id = c.owner_id
JOIN job_matching_profiles p ON p.job_id = j.id
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND owner.deleted_at IS NULL
  AND p.extraction_status = 'ready'
  AND p.completed_source_hash = p.requested_source_hash
  AND NOT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.job_id = j.id AND a.candidate_id = $1
  )
ORDER BY j.created_at DESC, j.id;

-- name: UpsertCandidateJobMatch :one
INSERT INTO candidate_job_matches (
  candidate_id, job_id, generation_id, candidate_profile_source_hash,
  job_profile_source_hash, score, band, reasons, consideration,
  algorithm_version, threshold_version, prompt_version, model,
  first_strong_at
)
VALUES (
  sqlc.arg('candidate_id'), sqlc.arg('job_id'), sqlc.arg('generation_id'),
  sqlc.arg('candidate_profile_source_hash'), sqlc.arg('job_profile_source_hash'),
  sqlc.arg('score'), sqlc.arg('band'), sqlc.arg('reasons'), sqlc.arg('consideration'),
  sqlc.arg('algorithm_version'), sqlc.arg('threshold_version'),
  sqlc.arg('prompt_version'), sqlc.arg('model'),
  CASE WHEN sqlc.arg('band')::text = 'strong' THEN now() ELSE NULL END
)
ON CONFLICT (candidate_id, job_id) DO UPDATE SET
  generation_id = EXCLUDED.generation_id,
  candidate_profile_source_hash = EXCLUDED.candidate_profile_source_hash,
  job_profile_source_hash = EXCLUDED.job_profile_source_hash,
  score = EXCLUDED.score,
  band = EXCLUDED.band,
  reasons = EXCLUDED.reasons,
  consideration = EXCLUDED.consideration,
  algorithm_version = EXCLUDED.algorithm_version,
  threshold_version = EXCLUDED.threshold_version,
  prompt_version = EXCLUDED.prompt_version,
  model = EXCLUDED.model,
  matched_at = now(),
  first_strong_at = COALESCE(candidate_job_matches.first_strong_at, EXCLUDED.first_strong_at),
  updated_at = now()
RETURNING *;

-- name: PublishCandidateMatchGenerationIfCurrent :one
UPDATE candidate_profiles
SET serving_match_generation = sqlc.arg('generation_id'),
    serving_match_input_hash = sqlc.arg('input_hash'),
    match_feed_status = 'ready',
    match_feed_error = NULL,
    match_feed_refreshed_at = now(),
    match_refresh_claimed_at = NULL,
    match_refresh_phase = NULL,
    updated_at = now()
WHERE user_id = sqlc.arg('user_id')
  AND match_refresh_token = sqlc.arg('refresh_token')
  AND matching_profile_source_hash = sqlc.arg('candidate_profile_source_hash')
RETURNING *;

-- name: GetCandidateMatchFeed :many
SELECT m.job_id, m.score, m.band, m.reasons, m.consideration, m.matched_at,
       m.viewed_at, j.title, j.location, j.workplace_type, j.employment_type,
       j.experience_level, j.salary_min, j.salary_max, j.salary_currency,
       j.created_at, c.name AS company_name, c.slug AS company_slug
FROM candidate_profiles cp
JOIN candidate_job_matches m
  ON m.candidate_id = cp.user_id
 AND m.generation_id = cp.serving_match_generation
JOIN jobs j ON j.id = m.job_id
JOIN companies c ON c.id = j.company_id
JOIN users owner ON owner.id = c.owner_id
JOIN job_matching_profiles p ON p.job_id = j.id
WHERE cp.user_id = $1
  AND m.dismissed_at IS NULL
  AND j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND owner.deleted_at IS NULL
  AND p.extraction_status = 'ready'
  AND p.completed_source_hash = p.requested_source_hash
  AND NOT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.job_id = j.id AND a.candidate_id = cp.user_id
  )
ORDER BY m.score DESC, m.matched_at DESC, m.job_id;

-- name: MarkCandidateMatchViewed :one
UPDATE candidate_job_matches
SET viewed_at = COALESCE(viewed_at, now()), updated_at = now()
WHERE candidate_id = $1 AND job_id = $2
RETURNING *;

-- name: DismissCandidateMatch :one
UPDATE candidate_job_matches
SET dismissed_at = COALESCE(dismissed_at, now()), updated_at = now()
WHERE candidate_id = $1 AND job_id = $2
RETURNING *;

-- name: UpdateCandidateMatchAlerts :one
UPDATE candidate_profiles
SET match_alerts_enabled = sqlc.arg('enabled'),
    match_alerts_enabled_at = CASE WHEN sqlc.arg('enabled')::boolean THEN now() ELSE NULL END,
    updated_at = now()
WHERE user_id = sqlc.arg('user_id')
RETURNING *;

-- name: ClaimCandidateRefreshBatch :many
WITH candidates AS (
  SELECT cp.id
  FROM candidate_profiles cp
  JOIN users u ON u.id = cp.user_id
  WHERE cp.resume_key IS NOT NULL
    AND cp.match_alerts_enabled
    AND u.deleted_at IS NULL
    AND (cp.match_refresh_claimed_at IS NULL OR cp.match_refresh_claimed_at < sqlc.arg('claim_cutoff'))
  ORDER BY cp.match_feed_refreshed_at NULLS FIRST, cp.id
  FOR UPDATE OF cp SKIP LOCKED
  LIMIT sqlc.arg('batch_limit')
)
UPDATE candidate_profiles cp
SET match_refresh_token = gen_random_uuid(),
    match_refresh_claimed_at = now(),
    match_refresh_phase = 'queued',
    match_feed_status = 'processing',
    match_feed_error = NULL,
    updated_at = now()
FROM candidates
WHERE cp.id = candidates.id
RETURNING cp.user_id, cp.match_refresh_token;

-- name: ClaimJobProfileRecoveryBatch :many
WITH profiles AS (
  SELECT p.job_id
  FROM job_matching_profiles p
  JOIN jobs j ON j.id = p.job_id
  WHERE j.status = 'open'
    AND j.archived_at IS NULL
    AND (j.expires_at IS NULL OR j.expires_at > now())
    AND (
      p.extraction_status IN ('pending', 'failed')
      OR p.completed_source_hash IS DISTINCT FROM p.requested_source_hash
      OR p.extraction_claimed_at < sqlc.arg('claim_cutoff')
    )
    AND (p.extraction_claimed_at IS NULL OR p.extraction_claimed_at < sqlc.arg('claim_cutoff'))
  ORDER BY p.updated_at, p.job_id
  FOR UPDATE OF p SKIP LOCKED
  LIMIT sqlc.arg('batch_limit')
)
UPDATE job_matching_profiles p
SET extraction_token = gen_random_uuid(),
    extraction_claimed_at = now(),
    extraction_status = 'pending',
    extraction_error = NULL,
    updated_at = now()
FROM profiles
WHERE p.job_id = profiles.job_id
RETURNING p.job_id, p.extraction_token;

-- name: ListOpenJobsMissingMatchingProfile :many
SELECT j.id, j.title, j.description, j.requirements, j.experience_level
FROM jobs j
WHERE j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM job_matching_profiles p WHERE p.job_id = j.id
  )
ORDER BY j.created_at, j.id
LIMIT $1;

-- name: HasReadyOpenJobMatchingProfile :one
SELECT EXISTS (
  SELECT 1
  FROM jobs j
  JOIN job_matching_profiles p ON p.job_id = j.id
  WHERE j.status = 'open'
    AND j.archived_at IS NULL
    AND (j.expires_at IS NULL OR j.expires_at > now())
    AND p.extraction_status = 'ready'
    AND p.completed_source_hash = p.requested_source_hash
) AS ready;

-- name: ListDigestCandidates :many
SELECT DISTINCT cp.user_id, u.email
FROM candidate_profiles cp
JOIN users u ON u.id = cp.user_id
JOIN candidate_job_matches m
  ON m.candidate_id = cp.user_id
 AND m.generation_id = cp.serving_match_generation
JOIN jobs j ON j.id = m.job_id
JOIN companies c ON c.id = j.company_id
JOIN users owner ON owner.id = c.owner_id
JOIN job_matching_profiles p ON p.job_id = j.id
WHERE cp.match_alerts_enabled
  AND cp.match_alerts_enabled_at IS NOT NULL
  AND cp.resume_key IS NOT NULL
  AND u.deleted_at IS NULL
  AND m.band = 'strong'
  AND m.first_strong_at >= cp.match_alerts_enabled_at
  AND m.viewed_at IS NULL
  AND m.dismissed_at IS NULL
  AND m.digest_notified_at IS NULL
  AND j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND owner.deleted_at IS NULL
  AND p.extraction_status = 'ready'
  AND p.completed_source_hash = p.requested_source_hash
  AND NOT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.job_id = j.id AND a.candidate_id = cp.user_id
  )
ORDER BY cp.user_id;

-- name: CreateJobMatchDigestNotification :one
INSERT INTO notifications (user_id, type, payload, dedupe_key)
VALUES (sqlc.arg('user_id'), 'job_match_digest', sqlc.arg('payload'), sqlc.arg('dedupe_key'))
ON CONFLICT (user_id, type, dedupe_key) WHERE dedupe_key IS NOT NULL
DO NOTHING
RETURNING *;

-- name: GetJobMatchDigestNotification :one
SELECT *
FROM notifications
WHERE user_id = sqlc.arg('user_id')
  AND type = 'job_match_digest'
  AND dedupe_key = sqlc.arg('dedupe_key');

-- name: LockCandidateDigestMatches :many
SELECT m.job_id, m.score, m.first_strong_at, j.title, c.name AS company_name
FROM candidate_profiles cp
JOIN candidate_job_matches m
  ON m.candidate_id = cp.user_id
 AND m.generation_id = cp.serving_match_generation
JOIN jobs j ON j.id = m.job_id
JOIN companies c ON c.id = j.company_id
JOIN users owner ON owner.id = c.owner_id
JOIN job_matching_profiles p ON p.job_id = j.id
WHERE cp.user_id = sqlc.arg('candidate_id')
  AND cp.match_alerts_enabled
  AND cp.match_alerts_enabled_at IS NOT NULL
  AND cp.resume_key IS NOT NULL
  AND m.band = 'strong'
  AND m.first_strong_at >= cp.match_alerts_enabled_at
  AND m.viewed_at IS NULL
  AND m.dismissed_at IS NULL
  AND m.digest_notified_at IS NULL
  AND j.status = 'open'
  AND j.archived_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND owner.deleted_at IS NULL
  AND p.extraction_status = 'ready'
  AND p.completed_source_hash = p.requested_source_hash
  AND NOT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.job_id = j.id AND a.candidate_id = cp.user_id
  )
ORDER BY m.score DESC, m.first_strong_at DESC, m.job_id
LIMIT sqlc.arg('match_limit')
FOR UPDATE OF m SKIP LOCKED;

-- name: MarkCandidateDigestMatchesNotified :exec
UPDATE candidate_job_matches
SET digest_notified_at = now(), updated_at = now()
WHERE candidate_id = sqlc.arg('candidate_id')
  AND job_id = ANY(sqlc.arg('job_ids')::uuid[])
  AND digest_notified_at IS NULL;
