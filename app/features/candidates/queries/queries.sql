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
    resume_updated_at = CASE WHEN $1 IS DISTINCT FROM resume_key THEN now() ELSE resume_updated_at END,
    updated_at = now()
WHERE user_id = $2
RETURNING *;
