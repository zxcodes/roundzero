-- name: createCandidateProfile :one
INSERT INTO candidate_profiles (user_id, resume_key, onboarding_completed_at, resume_updated_at)
VALUES ($1, $2, now(), CASE WHEN $2::text IS NOT NULL THEN now() ELSE NULL END)
RETURNING *;

-- name: getCandidateProfileByUserId :one
SELECT *
FROM candidate_profiles
WHERE user_id = $1;

-- name: updateCandidateProfile :one
UPDATE candidate_profiles
SET resume_key = $1,
    resume_updated_at = CASE
      WHEN $1 IS DISTINCT FROM resume_key THEN CASE WHEN $1::text IS NOT NULL THEN now() ELSE NULL END
      ELSE resume_updated_at
    END,
    matching_profile = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE matching_profile END,
    matching_profile_source_hash = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE matching_profile_source_hash END,
    matching_profile_version = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE matching_profile_version END,
    matching_profile_status = CASE WHEN $1 IS DISTINCT FROM resume_key THEN 'pending' ELSE matching_profile_status END,
    matching_profile_error = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE matching_profile_error END,
    serving_match_generation = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE serving_match_generation END,
    serving_match_input_hash = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE serving_match_input_hash END,
    match_feed_status = CASE WHEN $1 IS DISTINCT FROM resume_key THEN 'pending' ELSE match_feed_status END,
    match_feed_error = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE match_feed_error END,
    match_feed_refreshed_at = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE match_feed_refreshed_at END,
    match_alerts_enabled_at = CASE
      WHEN $1 IS DISTINCT FROM resume_key THEN
        CASE WHEN $1::text IS NOT NULL AND match_alerts_enabled THEN now() ELSE NULL END
      ELSE match_alerts_enabled_at
    END,
    match_refresh_token = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE match_refresh_token END,
    match_refresh_claimed_at = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE match_refresh_claimed_at END,
    match_refresh_phase = CASE WHEN $1 IS DISTINCT FROM resume_key THEN NULL ELSE match_refresh_phase END,
    updated_at = now()
WHERE user_id = $2
RETURNING *;

-- name: deleteCandidateJobMatches :exec
DELETE FROM candidate_job_matches
WHERE candidate_id = $1;
